/**
 * PipelineDefinition ↔ xyflow state adapter.
 *
 * Pure utility — no "use client" directive (no hooks, no browser-only APIs).
 * These functions are the bridge between the Farsight PipelineDefinition wire
 * format and the xyflow node/edge state arrays managed in WorkflowCanvas.
 */
import type { PipelineDefinition, PipelineNode as FPipelineNode, NodeId } from "@farsight/contracts"
import type { Node, Edge } from "@xyflow/react"
import { nodeTypeFor } from "./node-ids"

// Re-export validatePipelineGraph from contracts — do NOT hand-roll cycle detection.
// It checks: unique node IDs, valid edge references, source node existence, no cycles.
export { validatePipelineGraph } from "@farsight/contracts"

/**
 * Convert a Farsight PipelineNode to an xyflow Node for canvas state.
 *
 * The node's `data` carries all Farsight-specific fields so node components
 * can render them. The xyflow `type` key is derived from the NodeId prefix
 * (e.g. "core.source.*" → "source") to resolve the correct node component.
 */
export function toFlowNode(pn: FPipelineNode): Node {
  return {
    id: pn.id,
    type: nodeTypeFor(pn.type),
    position: pn.position ?? { x: 0, y: 0 },
    data: {
      type: pn.type,
      parameters: pn.parameters,
      name: pn.name,
      disabled: pn.disabled,
    },
  }
}

/**
 * Convert xyflow canvas state back to a Farsight PipelineDefinition for PATCH body.
 *
 * IMPORTANT: schemaVersion is ALWAYS literal 1 — it is not caller-supplied.
 * The server validates `z.literal(1)` and rejects any other value (Pitfall 2).
 * The meta Pick intentionally excludes schemaVersion to prevent callers from
 * accidentally overriding it.
 *
 * Edge ports are always 'main' in PipelineDefinition v1.
 */
export function toDefinition(
  nodes: Node[],
  edges: Edge[],
  // schemaVersion is NOT in the Pick — always hardcoded literal 1 below (Pitfall 2); never caller-supplied
  meta: Pick<PipelineDefinition, "name" | "trigger">
): PipelineDefinition {
  return {
    // MUST be literal 1 — server rejects schemaVersion:2 per Pitfall 2
    schemaVersion: 1,
    name: meta.name,
    trigger: meta.trigger,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.type as NodeId, // Must be valid Farsight NodeId (Pitfall 3)
      name: n.data.name as string | undefined,
      parameters: (n.data.parameters ?? {}) as Record<string, unknown>,
      position: n.position,
      disabled: (n.data.disabled ?? false) as boolean,
    })),
    edges: edges.map((e) => ({
      from: e.source,
      fromPort: "main", // always 'main' in v1
      to: e.target,
      toPort: "main", // always 'main' in v1
    })),
    staticData: {},
  }
}
