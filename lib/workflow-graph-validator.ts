/**
 * Workflow Graph Validator — strict-DAG rules for campaign workflows.
 *
 * Validates the (nodes, edges) shape from the campaign builder canvas
 * against the strict-DAG architecture documented in docs/workflows.md.
 * Used by:
 *   - PUT  /api/campaigns/:id/workflow   (block invalid saves)
 *   - POST /api/campaigns/:id/activate   (block activation w/ invalid graph)
 *   - POST /api/campaigns/:id/start-workflow (defensive double-check)
 *
 * Future: surface errors back to the UI canvas (color invalid nodes red,
 * show tooltip per error). The error shape is designed for that — each
 * error carries a `nodeId` or `edgeIds` it applies to.
 *
 * Pure function — no DB, no auth, no side effects. Easy to unit test.
 */

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type NodeType =
  | "email"
  | "linkedin_message"
  | "linkedin_connection"
  | "linkedin_profile_view"
  | "wait"
  | "wait_for_event"
  | "condition"
  | "switch"
  | "ai_decision"
  | "ai_agent"
  | "manual_task"
  | "tag"
  | "move_to_campaign"
  | "sub_workflow"
  | "end";

export const KNOWN_NODE_TYPES: readonly NodeType[] = [
  "email",
  "linkedin_message",
  "linkedin_connection",
  "linkedin_profile_view",
  "wait",
  "wait_for_event",
  "condition",
  "switch",
  "ai_decision",
  "ai_agent",
  "manual_task",
  "tag",
  "move_to_campaign",
  "sub_workflow",
  "end",
] as const;

/** Node types that branch on a boolean — exactly 2 labeled edges required. */
const BRANCHING_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  "condition",
  "ai_decision",
]);

/**
 * Node types that branch on N labels defined in their config. The expected
 * label set is read from configJson and edge labels must match exactly.
 * - ai_agent: labels = config.decisions
 * - switch:   labels = config.cases.map(c => c.label)  (+ optional "default")
 */
const N_WAY_BRANCHING_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  "ai_agent",
  "switch",
]);

/** Required labels on the two outgoing edges of a branching node. */
const BRANCH_LABELS = ["yes", "no"] as const;

export interface ValidatorNode {
  id: number;
  type: string;
  label?: string;
  configJson?: string | null;
}

export interface ValidatorEdge {
  /** Optional — `id` is used when present so error reports can point at it. */
  id?: number;
  sourceNodeId: number;
  targetNodeId: number;
  label?: string | null;
  conditionJson?: string | null;
}

/**
 * Discriminated union of validation errors. Every error carries enough
 * context for the UI to highlight the offender (`nodeId` or `edgeIds`).
 */
export type ValidationError =
  // graph-level
  | { kind: "no_start_node"; message: string }
  | { kind: "multiple_start_nodes"; nodeIds: number[]; message: string }
  | { kind: "no_end_node"; message: string }
  | { kind: "cycle_detected"; nodeIds: number[]; message: string }
  | { kind: "unreachable_from_start"; nodeId: number; message: string }
  | { kind: "no_path_to_end"; nodeId: number; message: string }
  // node-level
  | { kind: "unknown_node_type"; nodeId: number; type: string; message: string }
  | { kind: "invalid_config_json"; nodeId: number; message: string }
  // edge-level
  | {
      kind: "edge_dangling_source";
      edgeIds: number[];
      sourceId: number;
      message: string;
    }
  | {
      kind: "edge_dangling_target";
      edgeIds: number[];
      targetId: number;
      message: string;
    }
  | { kind: "self_loop_edge"; edgeId: number | undefined; nodeId: number; message: string }
  | {
      kind: "duplicate_edge";
      edgeIds: number[];
      sourceId: number;
      targetId: number;
      message: string;
    }
  // outgoing-degree rules (strict DAG)
  | {
      kind: "non_branching_node_must_have_one_outgoing";
      nodeId: number;
      actual: number;
      message: string;
    }
  | {
      kind: "branching_node_must_have_two_outgoing";
      nodeId: number;
      actual: number;
      message: string;
    }
  | {
      kind: "branching_edges_must_be_yes_no";
      nodeId: number;
      actualLabels: (string | null | undefined)[];
      message: string;
    }
  | {
      kind: "ai_agent_missing_agent_id";
      nodeId: number;
      message: string;
    }
  | {
      kind: "ai_agent_edges_must_match_decisions";
      nodeId: number;
      expected: string[];
      actualLabels: (string | null | undefined)[];
      message: string;
    }
  | {
      kind: "switch_missing_expression";
      nodeId: number;
      message: string;
    }
  | {
      kind: "switch_must_have_at_least_one_case";
      nodeId: number;
      message: string;
    }
  | {
      kind: "switch_edges_must_match_cases";
      nodeId: number;
      expected: string[];
      actualLabels: (string | null | undefined)[];
      message: string;
    }
  | {
      kind: "end_node_must_have_no_outgoing";
      nodeId: number;
      actual: number;
      message: string;
    };

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /**
   * The node identified as the start (zero incoming edges, non-end). Only
   * present when valid === true. Useful for callers that want to skip
   * recomputing it.
   */
  startNodeId?: number;
}

// ──────────────────────────────────────────────────────────────────────
// Validator
// ──────────────────────────────────────────────────────────────────────

export function validateWorkflowGraph(
  nodes: ValidatorNode[],
  edges: ValidatorEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];

  if (nodes.length === 0) {
    return {
      valid: false,
      errors: [{ kind: "no_start_node", message: "Workflow has no nodes." }],
    };
  }

  // ── Node-level checks ────────────────────────────────────────────────
  const knownTypes = new Set(KNOWN_NODE_TYPES);
  for (const n of nodes) {
    if (!knownTypes.has(n.type as NodeType)) {
      errors.push({
        kind: "unknown_node_type",
        nodeId: n.id,
        type: n.type,
        message: `Node "${n.label ?? n.id}" has unknown type "${n.type}".`,
      });
    }
    if (n.configJson) {
      try {
        JSON.parse(n.configJson);
      } catch {
        errors.push({
          kind: "invalid_config_json",
          nodeId: n.id,
          message: `Node "${n.label ?? n.id}" has invalid JSON in configJson.`,
        });
      }
    }
  }

  // ── Edge-level checks ───────────────────────────────────────────────
  const nodeIds = new Set(nodes.map((n) => n.id));
  const danglingBySource = new Map<number, number[]>();
  const danglingByTarget = new Map<number, number[]>();
  const dupeKey = (e: ValidatorEdge) => `${e.sourceNodeId}->${e.targetNodeId}`;
  const dupeMap = new Map<string, number[]>();

  for (const e of edges) {
    if (!nodeIds.has(e.sourceNodeId)) {
      const arr = danglingBySource.get(e.sourceNodeId) ?? [];
      if (e.id !== undefined) arr.push(e.id);
      danglingBySource.set(e.sourceNodeId, arr);
    }
    if (!nodeIds.has(e.targetNodeId)) {
      const arr = danglingByTarget.get(e.targetNodeId) ?? [];
      if (e.id !== undefined) arr.push(e.id);
      danglingByTarget.set(e.targetNodeId, arr);
    }
    if (e.sourceNodeId === e.targetNodeId) {
      errors.push({
        kind: "self_loop_edge",
        edgeId: e.id,
        nodeId: e.sourceNodeId,
        message: `Node ${e.sourceNodeId} has a self-loop edge — not allowed.`,
      });
    }
    const k = dupeKey(e);
    const arr = dupeMap.get(k) ?? [];
    if (e.id !== undefined) arr.push(e.id);
    dupeMap.set(k, arr);
  }

  for (const [sourceId, edgeIds] of danglingBySource) {
    errors.push({
      kind: "edge_dangling_source",
      edgeIds,
      sourceId,
      message: `Edge(s) reference missing source node ${sourceId}.`,
    });
  }
  for (const [targetId, edgeIds] of danglingByTarget) {
    errors.push({
      kind: "edge_dangling_target",
      edgeIds,
      targetId,
      message: `Edge(s) reference missing target node ${targetId}.`,
    });
  }
  for (const [k, edgeIds] of dupeMap) {
    if (edgeIds.length > 1) {
      const [s, t] = k.split("->").map(Number);
      errors.push({
        kind: "duplicate_edge",
        edgeIds,
        sourceId: s,
        targetId: t,
        message: `Multiple edges from ${s} to ${t} — keep only one.`,
      });
    }
  }

  // Beyond here we operate on nodes/edges that pass basic structural sanity.
  // We still proceed so the user sees multiple errors at once.

  // ── Outgoing-degree rules (strict DAG) ───────────────────────────────
  const outgoing = new Map<number, ValidatorEdge[]>();
  const incoming = new Map<number, ValidatorEdge[]>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }
  for (const e of edges) {
    if (nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId) && e.sourceNodeId !== e.targetNodeId) {
      outgoing.get(e.sourceNodeId)!.push(e);
      incoming.get(e.targetNodeId)!.push(e);
    }
  }

  for (const n of nodes) {
    const out = outgoing.get(n.id) ?? [];
    if (n.type === "end") {
      if (out.length !== 0) {
        errors.push({
          kind: "end_node_must_have_no_outgoing",
          nodeId: n.id,
          actual: out.length,
          message: `End node "${n.label ?? n.id}" must have no outgoing edges (has ${out.length}).`,
        });
      }
    } else if (BRANCHING_TYPES.has(n.type as NodeType)) {
      if (out.length !== 2) {
        errors.push({
          kind: "branching_node_must_have_two_outgoing",
          nodeId: n.id,
          actual: out.length,
          message: `Branching node "${n.label ?? n.id}" must have exactly 2 outgoing edges (has ${out.length}).`,
        });
      } else {
        const labels = out.map((e) => e.label).sort();
        const expected = [...BRANCH_LABELS].sort();
        if (JSON.stringify(labels) !== JSON.stringify(expected)) {
          errors.push({
            kind: "branching_edges_must_be_yes_no",
            nodeId: n.id,
            actualLabels: out.map((e) => e.label),
            message: `Branching node "${n.label ?? n.id}" needs edges labeled exactly "yes" and "no".`,
          });
        }
      }
    } else if (N_WAY_BRANCHING_TYPES.has(n.type as NodeType)) {
      // ai_agent + switch: edge labels must exactly match a config-derived
      // label list. configJson is the source of truth for the expected labels.
      let cfg: { agentId?: unknown; decisions?: unknown; cases?: unknown; expression?: unknown; defaultCase?: unknown } | null = null;
      try {
        cfg = n.configJson ? JSON.parse(n.configJson) : null;
      } catch {
        // already flagged by invalid_config_json elsewhere
      }

      let expectedLabels: string[] = [];

      if (n.type === "ai_agent") {
        if (!cfg || typeof cfg.agentId !== 'number') {
          errors.push({
            kind: "ai_agent_missing_agent_id",
            nodeId: n.id,
            message: `AI agent node "${n.label ?? n.id}" must reference an agent (configJson.agentId).`,
          });
        }
        if (Array.isArray(cfg?.decisions)) {
          expectedLabels = (cfg!.decisions as unknown[]).filter((d): d is string => typeof d === 'string');
        }
      } else if (n.type === "switch") {
        // Switch config: { expression: string, cases: Array<{ label: string, when: string }>, defaultCase?: boolean }
        // Each case's `label` is the edge label, `when` is a JSON-path-ish or JS-ish
        // expression evaluated against the prospect at runtime.
        // If defaultCase=true, a "default" labeled edge is also required.
        if (!cfg || typeof cfg.expression !== 'string') {
          errors.push({
            kind: "switch_missing_expression",
            nodeId: n.id,
            message: `Switch node "${n.label ?? n.id}" must have configJson.expression (the value to switch on).`,
          });
        }
        if (Array.isArray(cfg?.cases) && cfg!.cases.length > 0) {
          for (const c of cfg!.cases as Array<{ label?: unknown }>) {
            if (typeof c?.label === 'string') expectedLabels.push(c.label);
          }
          if (cfg!.defaultCase === true) expectedLabels.push("default");
        } else {
          errors.push({
            kind: "switch_must_have_at_least_one_case",
            nodeId: n.id,
            message: `Switch node "${n.label ?? n.id}" needs at least one case in configJson.cases.`,
          });
        }
      }

      if (expectedLabels.length > 0) {
        const labels = out.map((e) => e.label ?? '').sort();
        const expected = [...expectedLabels].sort();
        if (JSON.stringify(labels) !== JSON.stringify(expected)) {
          // Reuse the existing error kind for ai_agent; emit a switch-specific
          // variant for the new type so the UI can disambiguate.
          if (n.type === "switch") {
            errors.push({
              kind: "switch_edges_must_match_cases",
              nodeId: n.id,
              expected: expectedLabels,
              actualLabels: out.map((e) => e.label),
              message: `Switch node "${n.label ?? n.id}" needs one edge per case (${expectedLabels.join(', ')}). Got: ${labels.join(', ') || '(none)'}.`,
            });
          } else {
            errors.push({
              kind: "ai_agent_edges_must_match_decisions",
              nodeId: n.id,
              expected: expectedLabels,
              actualLabels: out.map((e) => e.label),
              message: `AI agent node "${n.label ?? n.id}" needs one edge per decision (${expectedLabels.join(', ')}). Got labels: ${labels.join(', ') || '(none)'}.`,
            });
          }
        }
      }
    } else if (knownTypes.has(n.type as NodeType)) {
      // All other known non-terminal node types: exactly 1 outgoing edge.
      // wait_for_event + sub_workflow are non-branching (sub_workflow runs to
      // completion then continues; wait_for_event resumes on the same edge).
      if (out.length !== 1) {
        errors.push({
          kind: "non_branching_node_must_have_one_outgoing",
          nodeId: n.id,
          actual: out.length,
          message: `Node "${n.label ?? n.id}" must have exactly 1 outgoing edge (has ${out.length}).`,
        });
      }
    }
  }

  // ── Start node = node with 0 incoming edges and type !== 'end' ──────
  const startCandidates = nodes.filter(
    (n) => (incoming.get(n.id)?.length ?? 0) === 0 && n.type !== "end"
  );
  let startNodeId: number | undefined;
  if (startCandidates.length === 0) {
    errors.push({
      kind: "no_start_node",
      message:
        "No start node found — every workflow needs at least one node with no incoming edges.",
    });
  } else if (startCandidates.length > 1) {
    errors.push({
      kind: "multiple_start_nodes",
      nodeIds: startCandidates.map((n) => n.id),
      message: `Found ${startCandidates.length} possible start nodes — workflows must have exactly one.`,
    });
  } else {
    startNodeId = startCandidates[0].id;
  }

  // ── At least one end node ───────────────────────────────────────────
  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length === 0) {
    errors.push({
      kind: "no_end_node",
      message: "Workflow must have at least one end node.",
    });
  }

  // ── Cycle detection (DFS with gray/black coloring) ──────────────────
  // Runs independently of start-node validity — cycles are a structural
  // problem regardless of whether the graph also has multiple roots.
  {
    const WHITE = 0,
      GRAY = 1,
      BLACK = 2;
    const color = new Map<number, number>();
    for (const n of nodes) color.set(n.id, WHITE);
    const cycleNodes = new Set<number>();
    const stack: number[] = [];

    const dfs = (nodeId: number) => {
      color.set(nodeId, GRAY);
      stack.push(nodeId);
      for (const e of outgoing.get(nodeId) ?? []) {
        const c = color.get(e.targetNodeId);
        if (c === GRAY) {
          // back-edge → cycle
          const idx = stack.indexOf(e.targetNodeId);
          if (idx >= 0) {
            for (let i = idx; i < stack.length; i++) cycleNodes.add(stack[i]);
          }
        } else if (c === WHITE) {
          dfs(e.targetNodeId);
        }
      }
      stack.pop();
      color.set(nodeId, BLACK);
    };

    // Start DFS from start node if known, then any unvisited node (catches
    // orphan subgraphs with cycles).
    if (startNodeId !== undefined) dfs(startNodeId);
    for (const node of nodes) {
      if (color.get(node.id) === WHITE) dfs(node.id);
    }

    if (cycleNodes.size > 0) {
      errors.push({
        kind: "cycle_detected",
        nodeIds: [...cycleNodes],
        message: `Cycle detected involving nodes [${[...cycleNodes].join(", ")}]. Workflows must be acyclic.`,
      });
    }
  }

  // ── Reachability from start ─────────────────────────────────────────
  if (startNodeId !== undefined) {
    const reachable = new Set<number>([startNodeId]);
    const queue = [startNodeId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const e of outgoing.get(id) ?? []) {
        if (!reachable.has(e.targetNodeId)) {
          reachable.add(e.targetNodeId);
          queue.push(e.targetNodeId);
        }
      }
    }
    for (const n of nodes) {
      if (!reachable.has(n.id)) {
        errors.push({
          kind: "unreachable_from_start",
          nodeId: n.id,
          message: `Node "${n.label ?? n.id}" is not reachable from the start node.`,
        });
      }
    }
  }

  // ── Every non-end node has a path to *some* end node ────────────────
  // Reverse BFS from each end node; any node not reached is a dead-end.
  if (endNodes.length > 0) {
    const reachableFromEnd = new Set<number>();
    const reverseQueue: number[] = [];
    for (const e of endNodes) {
      reachableFromEnd.add(e.id);
      reverseQueue.push(e.id);
    }
    while (reverseQueue.length > 0) {
      const id = reverseQueue.shift()!;
      for (const edge of incoming.get(id) ?? []) {
        if (!reachableFromEnd.has(edge.sourceNodeId)) {
          reachableFromEnd.add(edge.sourceNodeId);
          reverseQueue.push(edge.sourceNodeId);
        }
      }
    }
    for (const n of nodes) {
      if (n.type !== "end" && !reachableFromEnd.has(n.id)) {
        errors.push({
          kind: "no_path_to_end",
          nodeId: n.id,
          message: `Node "${n.label ?? n.id}" has no path to an end node — prospects would get stuck here.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    startNodeId: errors.length === 0 ? startNodeId : undefined,
  };
}

/**
 * Format errors as a flat human-readable list. Useful for API responses
 * before the UI integration is built.
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map((e) => e.message);
}
