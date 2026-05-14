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

import { sleep, FatalError } from "workflow";
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

async function loadGraph(campaignId: number): Promise<GraphSnapshot> {
  "use step";

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));

  if (!campaign) {
    throw new FatalError(`Campaign ${campaignId} not found`);
  }
  if (campaign.status !== "active") {
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

async function sendCampaignEmail(
  graph: GraphSnapshot,
  node: NodeRow,
  prospect: ProspectShape
): Promise<{ messageId: number }> {
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
  const body = renderTemplate(config.body ?? "", prospect);
  const bodyHtml = config.bodyHtml
    ? renderTemplate(config.bodyHtml, prospect)
    : `<p>${body.replace(/\n/g, "<br>")}</p>`;

  // 1. Record the message first so we have an ID for observability
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
      body,
      bodyHtml,
      status: "draft",
      aiGenerated: false,
      sentAt: null,
    })
    .returning({ id: messages.id });

  // 2. Send. Any thrown error here will trigger the step's retry policy.
  await sendEmail(
    prospect.email,
    subject,
    bodyHtml,
    config.fromName,
    config.fromEmail
  );

  // 3. Mark sent
  await db
    .update(messages)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(messages.id, msg.id));

  return { messageId: msg.id };
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
  branchLabel?: "yes" | "no"
): NodeRow | null {
  const outgoing = graph.edges.filter((e) => e.sourceNodeId === fromNodeId);
  if (outgoing.length === 0) return null;

  const edge = branchLabel
    ? outgoing.find((e) => e.label === branchLabel) ?? outgoing[0]
    : outgoing[0];

  return graph.nodes.find((n) => n.id === edge.targetNodeId) ?? null;
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

  let current: NodeRow | null =
    graph.nodes.find((n) => n.id === graph.startNodeId) ?? null;

  // Hard cap to prevent runaway loops if a campaign somehow has a cycle.
  // 100 nodes per prospect is way more than any sane sequence.
  for (let i = 0; i < 100; i++) {
    if (!current) break;

    await updateProspectProgress(campaignProspectId, {
      currentNodeId: current.id,
    });

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
          campaignId,
          prospectId,
          cfg.check ?? "replied"
        );
        current = findNextNode(graph, current.id, result ? "yes" : "no");
        break;
      }

      case "end": {
        current = null;
        break;
      }

      // Deferred node types — log + stop. Don't throw (would mark workflow
      // failed in the dashboard); set status=paused for human follow-up.
      case "linkedin_message":
      case "linkedin_connection":
      case "linkedin_profile_view":
      case "ai_decision":
      case "manual_task":
      case "tag":
      case "move_to_campaign": {
        console.warn(
          `[campaign-workflow] Node type '${current.type}' not yet implemented — pausing prospect ${prospectId}`
        );
        await updateProspectProgress(campaignProspectId, { status: "paused" });
        return {
          campaignId,
          prospectId,
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

  await updateProspectProgress(campaignProspectId, {
    status: "completed",
    completedAt: new Date(),
  });

  return { campaignId, prospectId, status: "completed" };
}
