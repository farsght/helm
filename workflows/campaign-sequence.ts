/**
 * Campaign Sequence Workflow — v1
 *
 * Runs a single prospect through a campaign's `workflow_nodes` graph.
 * One workflow run = one prospect's journey through the campaign.
 *
 * Trigger via:
 *   POST /api/campaigns/:id/start-workflow
 *
 * Supported node types (v1):
 *   - email     — render template + send via lib/email-sender
 *   - wait      — durable sleep (no compute cost during wait)
 *   - condition — branch on `last_email.opened` / `last_email.replied` (v1 scope)
 *   - end       — explicit terminus
 *
 * Deferred (v1 stops + logs a warning):
 *   - linkedin_message, linkedin_connection, linkedin_profile_view
 *   - ai_decision, manual_task, tag, move_to_campaign
 *
 * Architecture notes:
 *   - Graph is loaded ONCE at workflow start (step), then traversed in the
 *     workflow body. We don't re-fetch nodes on every iteration — the graph
 *     is immutable for the duration of a run by design (campaign edits while
 *     running prospects exist would be too confusing).
 *   - `campaign_prospects.currentNodeId` is updated as a side effect for
 *     observability in the existing UI, but the workflow's own state machine
 *     is the source of truth.
 *   - Idempotency: each step (`sendCampaignEmail`, `updateProspectProgress`)
 *     is its own "use step" function — if a step retries due to a transient
 *     failure, only that step replays, not the whole workflow.
 */

import { sleep, FatalError, createHook } from "workflow";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  campaignProspects,
  workflowNodes,
  workflowEdges,
  messages,
  prospects as prospectsTable,
} from "@/db/schema";
import { sendEmail } from "@/lib/email-sender";
import { runAgent, AgentNotFoundError, AgentConfigError } from "@/lib/agent-runtime";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

type NodeRow = {
  id: number;
  type: string;
  label: string;
  configJson: string | null;
};

type EdgeRow = {
  sourceNodeId: number;
  targetNodeId: number;
  label: string | null;
  conditionJson: string | null;
};

type GraphSnapshot = {
  campaignId: number;
  userId: string;
  campaignName: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
  startNodeId: number;
};

type EmailConfig = {
  subject?: string;
  body?: string;
  bodyHtml?: string;
  fromName?: string;
  fromEmail?: string;
  /**
   * 'text' (default) — plain-text only. Best for cold outbound: no tracking
   *   pixels, no link wrapping, looks like a 1:1 human message, best inbox
   *   placement on Gmail/Outlook.
   * 'html' — HTML only. Adds tracking surface; use for nurture/transactional.
   * 'both' — multipart/alternative. Recipient client picks. Hedge mode.
   */
  format?: "text" | "html" | "both";
  /** Optional Reply-To override (e.g. real inbox vs sending subdomain). */
  replyTo?: string;
};

type WaitConfig = {
  // ISO 8601 duration string e.g. "P3D" — OR a human string the SDK accepts
  // ("3 days", "1 hour"). We accept both; default 1 day if missing.
  duration?: string;
};

type ConditionConfig = {
  // v1: only inspect the previously sent message's status
  check?: "opened" | "replied" | "not_opened" | "not_replied";
};

type ProspectShape = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
};

// ──────────────────────────────────────────────────────────────────────
// Steps — each "use step" function is a retryable unit. Side effects
// (DB writes, email sends) live in steps. Pure graph traversal lives
// in the workflow body.
// ──────────────────────────────────────────────────────────────────────

/**
 * Max recursion depth for sub_workflow nodes. A sub-campaign that calls a
 * sub-campaign that calls a sub-campaign... bottoms out here. Five is well
 * above any realistic nesting and well below the workflow runtime's own
 * call-stack limits.
 */
const MAX_SUB_WORKFLOW_DEPTH = 5;

async function loadGraph(campaignId: number): Promise<GraphSnapshot> {
  "use step";
  return await loadGraphInternal(campaignId, { requireActive: true });
}

/**
 * Load a sub-campaign's graph for inline execution. Verifies ownership but
 * skips the `status === 'active'` check — sub-campaigns used as building
 * blocks are not necessarily activated independently (they may sit in
 * 'draft' as reusable components).
 */
async function loadSubGraph(
  subCampaignId: number,
  parentUserId: string
): Promise<GraphSnapshot> {
  "use step";

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, subCampaignId));

  if (!campaign) {
    throw new FatalError(`Sub-campaign ${subCampaignId} not found`);
  }
  if (campaign.userId !== parentUserId) {
    throw new FatalError(
      `Sub-campaign ${subCampaignId} not owned by ${parentUserId}`
    );
  }
  if (campaign.status === "archived") {
    throw new FatalError(
      `Sub-campaign ${subCampaignId} is archived — cannot invoke`
    );
  }

  return await loadGraphInternal(subCampaignId, { requireActive: false });
}

async function loadGraphInternal(
  campaignId: number,
  opts: { requireActive: boolean }
): Promise<GraphSnapshot> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));

  if (!campaign) {
    throw new FatalError(`Campaign ${campaignId} not found`);
  }
  if (opts.requireActive && campaign.status !== "active") {
    throw new FatalError(
      `Campaign ${campaignId} not active (status=${campaign.status})`
    );
  }

  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.campaignId, campaignId));

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.campaignId, campaignId));

  if (nodes.length === 0) {
    throw new FatalError(`Campaign ${campaignId} has no workflow nodes`);
  }

  // Start node = node with no incoming edges
  const targetIds = new Set(edges.map((e) => e.targetNodeId));
  const startNode = nodes.find((n) => !targetIds.has(n.id));
  if (!startNode) {
    throw new FatalError(
      `Campaign ${campaignId} has no start node (cycle or orphan graph)`
    );
  }

  return {
    campaignId,
    userId: campaign.userId,
    campaignName: campaign.name,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      configJson: n.configJson,
    })),
    edges: edges.map((e) => ({
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      label: e.label,
      conditionJson: e.conditionJson,
    })),
    startNodeId: startNode.id,
  };
}

/**
 * Evaluate a switch node expression against a prospect record.
 *
 * Supported syntax (intentionally narrow for v1):
 *   - "prospect.title"           — field path on the prospect
 *   - "prospect.company"
 *   - any other dot-path on the prospect object
 *
 * Returns the resolved value or null. Future: allow JS-ish expressions
 * via a safe evaluator (jsonata, expr-eval).
 */
function evalSwitchExpression(
  expression: string,
  prospect: ProspectShape
): unknown {
  const expr = expression.trim();
  if (!expr) return null;
  if (expr.startsWith("prospect.")) {
    const path = expr.slice("prospect.".length).split(".");
    let cur: unknown = prospect;
    for (const seg of path) {
      if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        return null;
      }
    }
    return cur;
  }
  // Bare field name = prospect.<name>
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
    return (prospect as unknown as Record<string, unknown>)[expr] ?? null;
  }
  return null;
}

async function loadProspect(prospectId: number): Promise<ProspectShape> {
  "use step";

  const [p] = await db
    .select()
    .from(prospectsTable)
    .where(eq(prospectsTable.id, prospectId));

  if (!p) throw new FatalError(`Prospect ${prospectId} not found`);
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    company: p.company,
    title: p.title,
  };
}

/**
 * Run an AI agent node and return its decision (one of the agent's `decisions[]`).
 * The decision is used as the edge label for routing.
 *
 * `configJson` shape on the node: { agentId: number, decisions: string[] }
 * The `decisions` snapshot on the node is what the validator checks against;
 * if the agent's live decisions have drifted, we'll still return whatever the
 * model produces — drift becomes a routing failure (no matching edge → end).
 */
async function runAgentNode(
  node: NodeRow,
  prospect: ProspectShape,
  campaignProspectId: number,
  userId: string
): Promise<string> {
  "use step";

  const cfg = node.configJson ? (JSON.parse(node.configJson) as { agentId?: number }) : {};
  if (typeof cfg.agentId !== "number") {
    throw new FatalError(`AI agent node ${node.id} is missing configJson.agentId`);
  }

  try {
    const result = await runAgent(cfg.agentId, {
      invokedByType: "workflow_node",
      invokedById: node.id,
      userId,
      variables: {
        firstName: prospect.firstName ?? "",
        lastName: prospect.lastName ?? "",
        email: prospect.email ?? "",
        company: prospect.company ?? "",
        title: prospect.title ?? "",
        prospectId: prospect.id,
        campaignProspectId,
      },
    });
    return result.decision;
  } catch (err) {
    // Config/not-found errors are fatal — no point retrying.
    if (err instanceof AgentNotFoundError || err instanceof AgentConfigError) {
      throw new FatalError(`Agent invocation failed (non-retryable): ${err.message}`);
    }
    // Runtime errors (provider down, network) bubble up so the step retries.
    throw err;
  }
}

async function sendCampaignEmail(
  graph: GraphSnapshot,
  node: NodeRow,
  prospect: ProspectShape
): Promise<{ messageId: number; providerMessageId: string }> {
  "use step";

  if (!prospect.email) {
    throw new FatalError(
      `Prospect ${prospect.id} has no email — cannot send`
    );
  }

  const config: EmailConfig = node.configJson
    ? JSON.parse(node.configJson)
    : {};

  // Variable substitution — minimal v1, expand later.
  const subject = renderTemplate(config.subject ?? "Hello", prospect);
  const textBody = renderTemplate(config.body ?? "", prospect);
  const htmlBody = config.bodyHtml
    ? renderTemplate(config.bodyHtml, prospect)
    : undefined;

  // Default cold-outbound posture: plain text only. Best inbox placement.
  // Campaign nodes can opt into 'html' or 'both' via config.format.
  const format = config.format ?? "text";
  const sendText = format === "text" || format === "both" ? textBody : undefined;
  const sendHtml =
    format === "html" || format === "both"
      ? htmlBody ?? `<p>${textBody.replace(/\n/g, "<br>")}</p>`
      : undefined;

  // 1. Record the message first so we have an ID for observability.
  //    Always store both text body and html (if rendered) — the DB row is
  //    the canonical record of what we composed, not what we transmitted.
  const [msg] = await db
    .insert(messages)
    .values({
      userId: graph.userId,
      campaignId: graph.campaignId,
      prospectId: prospect.id,
      nodeId: node.id,
      channel: "email",
      direction: "outbound",
      subject,
      body: textBody,
      bodyHtml: htmlBody,
      status: "draft",
      aiGenerated: false,
      sentAt: null,
    })
    .returning({ id: messages.id });

  // 2. Build From string. Resend's default is RESEND_FROM_EMAIL; per-node
  //    override via config.fromName + config.fromEmail.
  const fromName = config.fromName;
  const fromEmail = config.fromEmail;
  const fromArg =
    fromName && fromEmail
      ? `${fromName} <${fromEmail}>`
      : fromEmail ?? undefined;

  // 3. Send. Any thrown error bubbles to trigger the step's retry policy.
  //    EmailConfigError (missing API key, no body) means retries won't
  //    help — convert to FatalError so the workflow fails fast.
  let providerMessageId: string;
  try {
    const result = await sendEmail({
      to: prospect.email,
      subject,
      text: sendText,
      html: sendHtml,
      from: fromArg,
      replyTo: config.replyTo,
      tags: [
        { name: "campaign_id", value: String(graph.campaignId) },
        { name: "node_id", value: String(node.id) },
        { name: "prospect_id", value: String(prospect.id) },
      ],
    });
    providerMessageId = result.messageId;
  } catch (err) {
    // Mark the message as failed before re-raising so observability is intact
    await db
      .update(messages)
      .set({ status: "failed" })
      .where(eq(messages.id, msg.id));

    // Config errors are non-retryable
    if (err instanceof Error && err.name === "EmailConfigError") {
      throw new FatalError(`Email config error: ${err.message}`);
    }
    throw err;
  }

  // 4. Mark sent. Store provider message ID in body header? For now we
  //    only need it for webhooks — could add a column later. Keeping the
  //    return value lets the workflow log it.
  await db
    .update(messages)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(messages.id, msg.id));

  return { messageId: msg.id, providerMessageId };
}

async function checkMessageStatus(
  campaignId: number,
  prospectId: number,
  check: ConditionConfig["check"]
): Promise<boolean> {
  "use step";

  // Look at the most recent message we sent this prospect in this campaign.
  const [latest] = await db
    .select({
      status: messages.status,
      openedAt: messages.openedAt,
      repliedAt: messages.repliedAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.campaignId, campaignId),
        eq(messages.prospectId, prospectId),
        eq(messages.direction, "outbound")
      )
    )
    .orderBy(messages.id)
    .limit(1);

  if (!latest) return false;

  switch (check) {
    case "opened":
      return latest.openedAt !== null;
    case "not_opened":
      return latest.openedAt === null;
    case "replied":
      return latest.repliedAt !== null;
    case "not_replied":
      return latest.repliedAt === null;
    default:
      return false;
  }
}

async function updateProspectProgress(
  campaignProspectId: number,
  patch: {
    currentNodeId?: number;
    status?: "active" | "completed" | "paused" | "failed";
    completedAt?: Date;
  }
): Promise<void> {
  "use step";

  await db
    .update(campaignProspects)
    .set({
      ...patch,
      lastActivityAt: new Date(),
    })
    .where(eq(campaignProspects.id, campaignProspectId));
}

// ──────────────────────────────────────────────────────────────────────
// Pure helpers — not steps, just run in the workflow body
// ──────────────────────────────────────────────────────────────────────

function renderTemplate(s: string, p: ProspectShape): string {
  return s
    .replaceAll("{{firstName}}", p.firstName)
    .replaceAll("{{lastName}}", p.lastName)
    .replaceAll("{{company}}", p.company ?? "")
    .replaceAll("{{title}}", p.title ?? "");
}

function findNextNode(
  graph: GraphSnapshot,
  fromNodeId: number,
  branchLabel?: string
): NodeRow | null {
  const outgoing = graph.edges.filter((e) => e.sourceNodeId === fromNodeId);
  if (outgoing.length === 0) return null;

  // If a label is provided, require an exact match — DO NOT fall back to the
  // first edge, which would silently misroute. ai_agent decisions can be any
  // string from the agent's `decisions[]`; condition/ai_decision use yes/no.
  if (branchLabel !== undefined) {
    return graph.nodes.find(
      (n) => n.id === outgoing.find((e) => e.label === branchLabel)?.targetNodeId
    ) ?? null;
  }

  return graph.nodes.find((n) => n.id === outgoing[0].targetNodeId) ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// Graph walker — pure orchestration, no side effects of its own.
//
// Recursive for `sub_workflow` nodes: when we hit one, we load the
// sub-campaign's graph and call walkGraph again with depth+1, sharing the
// same prospect and campaignProspectId. The recursive call walks the
// sub-graph to completion (or until it pauses/fails) and returns; the
// outer walk then continues from the node after the sub_workflow.
//
// `depth` controls two things:
//   - Hard cap via MAX_SUB_WORKFLOW_DEPTH to prevent runaway nesting.
//   - We only write currentNodeId to campaignProspects when depth === 0.
//     The DB row tracks the prospect's position in the *top-level* campaign;
//     writing a sub-graph's node IDs there would point at a different
//     campaign's nodes and confuse the workflow canvas UI.
//
// NOTE: walkGraph is NOT a `"use step"` function. It must run in the workflow
// body so that workflow primitives (sleep, createHook) flow from the same
// execution context. Individual side-effecting operations within it are the
// steps (sendCampaignEmail, checkMessageStatus, etc.).
// ──────────────────────────────────────────────────────────────────────

type WalkResult = {
  status: "completed" | "paused" | "failed";
  reason?: string;
};

async function walkGraph(
  graph: GraphSnapshot,
  prospect: ProspectShape,
  campaignProspectId: number,
  depth: number
): Promise<WalkResult> {
  if (depth > MAX_SUB_WORKFLOW_DEPTH) {
    throw new FatalError(
      `Sub-workflow nesting exceeded MAX_SUB_WORKFLOW_DEPTH (${MAX_SUB_WORKFLOW_DEPTH}) at campaign=${graph.campaignId}`
    );
  }

  let current: NodeRow | null =
    graph.nodes.find((n) => n.id === graph.startNodeId) ?? null;

  // Hard cap to prevent runaway loops if a campaign somehow has a cycle.
  // 100 nodes per prospect per graph is way more than any sane sequence.
  for (let i = 0; i < 100; i++) {
    if (!current) break;

    if (depth === 0) {
      await updateProspectProgress(campaignProspectId, {
        currentNodeId: current.id,
      });
    }

    switch (current.type) {
      case "email": {
        await sendCampaignEmail(graph, current, prospect);
        current = findNextNode(graph, current.id);
        break;
      }

      case "wait": {
        const cfg: WaitConfig = current.configJson
          ? JSON.parse(current.configJson)
          : {};
        // sleep accepts ISO-8601 ("PT1H", "P3D") and natural strings
        // ("3 days"). Default 1 day. Cast because TS's StringValue template
        // literal can't capture arbitrary user-supplied strings — workflow
        // SDK validates at runtime.
        await sleep(
          (cfg.duration ?? "1 day") as unknown as Parameters<typeof sleep>[0]
        );
        current = findNextNode(graph, current.id);
        break;
      }

      case "condition": {
        const cfg: ConditionConfig = current.configJson
          ? JSON.parse(current.configJson)
          : { check: "replied" };
        const result = await checkMessageStatus(
          graph.campaignId,
          prospect.id,
          cfg.check ?? "replied"
        );
        current = findNextNode(graph, current.id, result ? "yes" : "no");
        break;
      }

      case "end": {
        current = null;
        break;
      }

      case "ai_agent": {
        const decision = await runAgentNode(
          current,
          prospect,
          campaignProspectId,
          graph.userId
        );
        const next = findNextNode(graph, current.id, decision);
        if (!next) {
          // The agent returned a decision that doesn't match any outgoing edge.
          // This shouldn't happen if validator runs at activate, but production
          // data may drift. Pause the prospect for human review.
          console.warn(
            `[campaign-workflow] ai_agent node ${current.id} returned decision '${decision}' with no matching edge — pausing prospect ${prospect.id}`
          );
          return {
            status: "paused",
            reason: `agent_decision_no_edge:${decision}`,
          };
        }
        current = next;
        break;
      }

      case "switch": {
        // Evaluate config.expression against the prospect, find the matching
        // case label, route on that edge. Falls back to "default" if no case
        // matches and defaultCase=true.
        const cfg = current.configJson
          ? (JSON.parse(current.configJson) as {
              expression?: string;
              cases?: Array<{ label: string; when: string | number | boolean }>;
              defaultCase?: boolean;
            })
          : {};
        const value = evalSwitchExpression(cfg.expression ?? "", prospect);
        let matchedLabel: string | null = null;
        for (const c of cfg.cases ?? []) {
          // Loose equality so "10" matches 10. Switch is for human-friendly
          // routing; strict equality would surprise users.
          if (value == c.when) { matchedLabel = c.label; break; }
        }
        if (!matchedLabel && cfg.defaultCase) matchedLabel = "default";
        if (!matchedLabel) {
          console.warn(
            `[campaign-workflow] switch node ${current.id} value=${JSON.stringify(value)} had no matching case — pausing`
          );
          return {
            status: "paused",
            reason: `switch_no_match:${JSON.stringify(value)}`,
          };
        }
        const next = findNextNode(graph, current.id, matchedLabel);
        if (!next) {
          console.warn(
            `[campaign-workflow] switch node ${current.id} matched '${matchedLabel}' but no edge with that label`
          );
          return {
            status: "paused",
            reason: `switch_no_edge:${matchedLabel}`,
          };
        }
        current = next;
        break;
      }

      case "wait_for_event": {
        // Suspend the workflow until an external event arrives on the
        // deterministic hook token. Token is shaped:
        //   wait:<campaignProspectId>:<nodeId>
        // so server-side resumers (webhook handlers, manual approve UI)
        // can reconstruct it without needing to look up state. Note: nodeId
        // here may belong to a sub-graph, but it's unique across all
        // workflow_nodes rows so the token is still globally unambiguous.
        //
        // configJson: { eventType: 'reply' | 'click' | 'approval' | 'custom',
        //               timeout?: string (e.g. "7 days") }
        const token = `wait:${campaignProspectId}:${current.id}`;
        // createHook is a workflow-scoped primitive — it must be called
        // INSIDE the workflow function (or a non-step helper called from
        // within it). The await suspends durably, surviving server restarts.
        const hook = createHook<Record<string, unknown>>({ token });
        const payload = await hook;
        // payload is whatever the resumer POSTed — we log it but don't
        // route on it for v1. Future: branch on payload.outcome.
        console.log(
          `[campaign-workflow] wait_for_event node ${current.id} resumed with payload:`,
          payload
        );
        current = findNextNode(graph, current.id);
        break;
      }

      case "sub_workflow": {
        // Invoke another campaign's workflow for the SAME prospect, walk it
        // to completion inline, then continue from the node after this one.
        // Implemented as a recursive walkGraph call — not a separate workflow
        // run — so we keep one row in the workflow dashboard per top-level
        // invocation and durable primitives (sleep, createHook) inside the
        // sub-graph share the parent's execution context.
        //
        // configJson: { subCampaignId: number }
        const cfg = current.configJson
          ? (JSON.parse(current.configJson) as { subCampaignId?: number })
          : {};
        if (typeof cfg.subCampaignId !== "number") {
          throw new FatalError(
            `sub_workflow node ${current.id} missing configJson.subCampaignId`
          );
        }
        if (cfg.subCampaignId === graph.campaignId) {
          throw new FatalError(
            `sub_workflow node ${current.id} cannot invoke its own campaign (${graph.campaignId})`
          );
        }
        const subGraph = await loadSubGraph(cfg.subCampaignId, graph.userId);
        const result = await walkGraph(
          subGraph,
          prospect,
          campaignProspectId,
          depth + 1
        );
        console.log(
          `[campaign-workflow] sub_workflow node ${current.id} -> campaign ${cfg.subCampaignId} returned: ${result.status}${result.reason ? ` (${result.reason})` : ""}`
        );
        // Pause/fail propagates up to the top-level walk, which decides
        // how to update the prospect row.
        if (result.status !== "completed") {
          return {
            status: result.status,
            reason: `sub_workflow:${cfg.subCampaignId}:${result.reason ?? result.status}`,
          };
        }
        current = findNextNode(graph, current.id);
        break;
      }

      // Deferred node types — log + stop. Don't throw (would mark workflow
      // failed in the dashboard); pause for human follow-up.
      case "linkedin_message":
      case "linkedin_connection":
      case "linkedin_profile_view":
      case "ai_decision":
      case "manual_task":
      case "tag":
      case "move_to_campaign": {
        console.warn(
          `[campaign-workflow] Node type '${current.type}' not yet implemented — pausing prospect ${prospect.id}`
        );
        return {
          status: "paused",
          reason: `unimplemented_node_type:${current.type}`,
        };
      }

      default: {
        throw new FatalError(
          `Unknown node type '${current.type}' on node ${current.id}`
        );
      }
    }
  }

  return { status: "completed" };
}

// ──────────────────────────────────────────────────────────────────────
// The workflow — pure orchestration, no side effects of its own
// ──────────────────────────────────────────────────────────────────────

export async function campaignSequenceWorkflow(
  campaignId: number,
  prospectId: number,
  campaignProspectId: number
) {
  "use workflow";

  const graph = await loadGraph(campaignId);
  const prospect = await loadProspect(prospectId);

  try {
    const result = await walkGraph(graph, prospect, campaignProspectId, 0);

    if (result.status === "completed") {
      await updateProspectProgress(campaignProspectId, {
        status: "completed",
        completedAt: new Date(),
      });
      return { campaignId, prospectId, status: "completed" };
    }

    await updateProspectProgress(campaignProspectId, {
      status: result.status === "failed" ? "failed" : "paused",
    });
    return {
      campaignId,
      prospectId,
      status: result.status,
      reason: result.reason,
    };
  } catch (err) {
    // FatalError already disables retries. For other errors the workflow
    // runtime will retry per step; this catch only triggers if the retries
    // exhaust or it's a FatalError. Look up an error-handler campaign and
    // notify (v1: log only; real fan-out to a separate workflow run is TODO).
    await notifyErrorHandler(campaignId, prospectId, campaignProspectId, err);
    throw err;
  }
}

/**
 * v1: log only. Future: enqueue the error-handler campaign for this prospect
 * by calling its workflow with the error context as a variable.
 */
async function notifyErrorHandler(
  campaignId: number,
  prospectId: number,
  campaignProspectId: number,
  err: unknown
): Promise<void> {
  "use step";
  try {
    const c = await db
      .select({ errorHandlerCampaignId: campaigns.errorHandlerCampaignId })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    const handlerId = c[0]?.errorHandlerCampaignId;
    if (!handlerId) {
      console.error(
        `[error-handler] campaign=${campaignId} has no handler; prospect=${prospectId} failed:`,
        err instanceof Error ? err.message : err
      );
      return;
    }
    console.error(
      `[error-handler] would invoke handler campaign=${handlerId} for prospect=${prospectId} (cp=${campaignProspectId}); error:`,
      err instanceof Error ? err.message : err
    );
    // TODO: actually trigger the handler workflow run here.
  } catch (lookupErr) {
    console.error("[error-handler] lookup failed:", lookupErr);
  }
}
