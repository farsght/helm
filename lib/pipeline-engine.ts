/**
 * Helm pipeline engine — topological per-node executor.
 *
 * Background: prior to this module, `/api/pipelines/[id]/run` was a
 * simulation that counted nodes and reported the input dataset row count.
 * No node had a real executor. This module replaces that with a
 * topological-sort runner that dispatches each node to a typed executor.
 *
 * Phase 1 ships no-op executors for the 15 existing UI node types — they
 * pass input rows through unchanged so existing pipelines still "run"
 * with no regression. New executors (Fireflies, classify, embed, …) are
 * registered here in subsequent phases.
 *
 * Failure semantics:
 *   - A node executor throwing fails the whole run; the error message is
 *     captured on `pipeline_runs.error_message`.
 *   - Per-row errors should be handled inside the executor; it can
 *     return a row with a `__row_error` field and bump `rowsErrored` via
 *     the context.
 *
 * See: docs/meetings-pipeline.md §3 — "the pipeline runtime gap".
 */

import { db } from '@/db';
import {
  pipelineNodes,
  pipelineEdges,
  pipelineRuns,
  pipelines,
  datasets,
  datasetRows,
} from '@/db/schema';
import { eq } from 'drizzle-orm';

// Re-export shared types from the dedicated types module so external
// consumers can import them from either location.
export type { DbPipelineNode, DbPipelineEdge, Row, PipelineLogEntry, PipelineRunContext, NodeExecutor } from './pipeline-engine-types';
import type { DbPipelineNode, DbPipelineEdge, Row, PipelineLogEntry, PipelineRunContext, NodeExecutor } from './pipeline-engine-types';

// Bring in the Fireflies-pipeline node executors so they auto-register
// against the executors registry on module load.
import { firefliesPoll } from './pipeline-nodes/fireflies-poll';
import { persistRawPair } from './pipeline-nodes/persist-raw-pair';
import { classifyMeeting } from './pipeline-nodes/classify-meeting';
import { extractEntities } from './pipeline-nodes/extract-entities';
import { chunkText } from './pipeline-nodes/chunk-text';
import { embed } from './pipeline-nodes/embed';

// ── Trigger model ────────────────────────────────────────────────────
//
// Only SOURCE nodes (nodes with zero in-edges) consult their `triggerConfig`.
// Intermediate nodes always fire when upstream completes — the graph edge
// IS their trigger.
//
// Run invocation modes:
//   - `manual` (UI ▶ button): fires every source with kind='manual'
//   - `cron`   (scheduler):   fires every source with kind='cron' on a
//                             matching schedule, OR a specific source by id
//   - `sourceNodeId`:         fires only that source (used by cron worker
//                             and future webhook routes; bypasses kind filter)

export type TriggerKind = 'manual' | 'cron' | 'webhook' | 'event';

export interface TriggerConfig {
  kind: TriggerKind;
  /** Cron expression (UTC). Required when kind='cron'. */
  schedule?: string;
  /** Future: webhook secret token. */
  secret?: string;
  /** Free-form for future trigger kinds (event topic name, etc.) */
  [k: string]: unknown;
}

export function parseTriggerConfig(raw: unknown): TriggerConfig {
  if (raw && typeof raw === 'object' && 'kind' in raw) {
    const kind = (raw as { kind: unknown }).kind;
    if (kind === 'manual' || kind === 'cron' || kind === 'webhook' || kind === 'event') {
      return raw as TriggerConfig;
    }
  }
  return { kind: 'manual' };
}

export interface RunPipelineOptions {
  /**
   * 'manual' (default): only fire sources whose trigger.kind === 'manual'
   * 'cron':              only fire sources whose trigger.kind === 'cron'
   * 'any':               fire every source (used when a specific sourceNodeId
   *                      is passed and we want to bypass kind filtering)
   */
  invokedBy?: 'manual' | 'cron' | 'any';
  /**
   * If set, only this source node (and its downstream subgraph) is executed.
   * Other source nodes' subgraphs are skipped. Used by the cron worker.
   */
  sourceNodeId?: number;
}

// ── Executor registry ────────────────────────────────────────────────
//
// Phase 1 registers a no-op for every existing UI node type. Subsequent
// phases (Fireflies) replace these stubs and add new ones. A node type
// without a registered executor is an error at run time.

const executors: Record<string, NodeExecutor> = {};

export function registerExecutor(type: string, fn: NodeExecutor): void {
  executors[type] = fn;
}

export function getExecutor(type: string): NodeExecutor | undefined {
  return executors[type];
}

// Pass-through executor — emits input rows unchanged. Used for every
// existing node type until that type ships its real executor.
const passThrough: NodeExecutor = async (_config, inputRows) => inputRows;

// `source_dataset` is the one exception: it ignores incoming rows (it's a
// root) and reads rows from the configured dataset.
const sourceDataset: NodeExecutor = async (config, _inputRows, node, ctx) => {
  const datasetId = typeof config.datasetId === 'number'
    ? config.datasetId
    : typeof config.datasetId === 'string'
      ? parseInt(config.datasetId)
      : NaN;
  if (!Number.isFinite(datasetId)) {
    ctx.log.push({ nodeId: node.id, message: 'source_dataset: no datasetId configured', level: 'warn' });
    return [];
  }
  const [ds] = await db.select().from(datasets).where(eq(datasets.id, datasetId));
  if (!ds) {
    ctx.log.push({ nodeId: node.id, message: `source_dataset: dataset ${datasetId} not found`, level: 'error' });
    return [];
  }
  // Verify dataset ownership — pipelines and datasets share the userId scope.
  if (ds.userId && ds.userId !== ctx.userId) {
    ctx.log.push({ nodeId: node.id, message: `source_dataset: dataset ${datasetId} not owned by user`, level: 'error' });
    return [];
  }
  const rows = await db.select().from(datasetRows).where(eq(datasetRows.datasetId, datasetId));
  ctx.log.push({ nodeId: node.id, message: `source_dataset: loaded ${rows.length} rows from "${ds.name}"`, level: 'info' });
  // datasetRows.rowJson is jsonb — drizzle returns it parsed.
  return rows.map((r) => (r.rowJson ?? {}) as Row);
};

// Register the 15 existing UI node types with passthrough/source semantics.
// Real executors land in Phase 2+.
registerExecutor('source_dataset', sourceDataset);
for (const t of [
  'map_fields',
  'filter',
  'clean',
  'deduplicate',
  'enrich',
  'ai_classify',
  'split',
  'run_notebook',
  'promote_prospects',
  'promote_companies',
  'promote_contacts',
  'promote_deals',
  'promote_segment',
]) {
  registerExecutor(t, passThrough);
}

// Phase 2a Fireflies meetings nodes — auto-register on module load.
registerExecutor('fireflies_poll', firefliesPoll);
registerExecutor('persist_raw_pair', persistRawPair);
// Phase 2b — classify Fireflies meetings with the netrunner Pass 1 prompt.
registerExecutor('classify_meeting', classifyMeeting);
// Phase 3 — entity extraction (netrunner Pass 2), section-aware chunking,
// and batched OpenAI embedding.
registerExecutor('extract_entities', extractEntities);
registerExecutor('chunk_text', chunkText);
registerExecutor('embed', embed);

// ── Topological sort ─────────────────────────────────────────────────

function topoSort(nodes: DbPipelineNode[], edges: DbPipelineEdge[]): DbPipelineNode[] {
  return topoSortGeneric<DbPipelineNode, DbPipelineEdge>(nodes, edges);
}

/**
 * Pure topological sort, exported for testing. Takes nodes and edges
 * keyed by id and returns nodes in dependency order. Throws on cycles.
 */
export function topoSortGeneric<N extends { id: number }, E extends { sourceNodeId: number; targetNodeId: number }>(
  nodes: N[],
  edges: E[],
): N[] {
  const byId = new Map<number, N>(nodes.map((n) => [n.id, n]));
  const indegree = new Map<number, number>(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<number, number[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (!byId.has(e.sourceNodeId) || !byId.has(e.targetNodeId)) continue;
    indegree.set(e.targetNodeId, (indegree.get(e.targetNodeId) ?? 0) + 1);
    outgoing.get(e.sourceNodeId)!.push(e.targetNodeId);
  }

  const queue: number[] = [];
  for (const [id, deg] of Array.from(indegree.entries())) {
    if (deg === 0) queue.push(id);
  }
  // Stable order: sort root nodes by id for deterministic runs
  queue.sort((a, b) => a - b);

  const sorted: N[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(byId.get(id)!);
    for (const next of outgoing.get(id) ?? []) {
      const newDeg = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error(`Pipeline has a cycle — visited ${sorted.length} of ${nodes.length} nodes`);
  }
  return sorted;
}

// ── Main entry ───────────────────────────────────────────────────────

/**
 * Run a pipeline end-to-end. Assumes the caller already created the
 * `pipeline_runs` row and verified user ownership on the pipeline.
 *
 * Returns the final pipeline_runs row state. On failure, updates the
 * pipeline_runs row to status='failed' and returns its current state.
 */
export async function runPipeline(
  pipelineId: number,
  runId: number,
  userId: string,
  opts: RunPipelineOptions = {},
): Promise<{ rowsInput: number; rowsOutput: number; rowsErrored: number; logJson: string }> {
  const invokedBy = opts.invokedBy ?? 'manual';

  const nodes = await db.select().from(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
  const edges = await db.select().from(pipelineEdges).where(eq(pipelineEdges.pipelineId, pipelineId));

  const ctx: PipelineRunContext = {
    pipelineId,
    runId,
    userId,
    log: [],
    rowsErrored: 0,
  };

  const sorted = topoSort(nodes, edges);

  // ── Trigger filtering ──────────────────────────────────────────────
  // Determine which SOURCE nodes (in-degree 0) get to fire on this run.
  // Intermediate nodes are gated by their parents being in the eligible set,
  // not by trigger config.

  const parents = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    parents.get(e.targetNodeId)?.push(e.sourceNodeId);
  }
  const isSource = (id: number) => (parents.get(id) ?? []).length === 0;

  const eligibleSourceIds = new Set<number>();
  for (const node of nodes) {
    if (!isSource(node.id)) continue;
    const trig = parseTriggerConfig(node.triggerConfig);
    // Explicit sourceNodeId targeting bypasses kind filter (webhook/cron path).
    if (opts.sourceNodeId !== undefined) {
      if (node.id === opts.sourceNodeId) eligibleSourceIds.add(node.id);
      continue;
    }
    if (invokedBy === 'any') {
      eligibleSourceIds.add(node.id);
    } else if (invokedBy === 'manual' && trig.kind === 'manual') {
      eligibleSourceIds.add(node.id);
    } else if (invokedBy === 'cron' && trig.kind === 'cron') {
      eligibleSourceIds.add(node.id);
    }
  }

  // BFS from eligible sources to find every downstream node that should fire.
  const eligibleNodes = new Set<number>(eligibleSourceIds);
  const adj = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) adj.get(e.sourceNodeId)?.push(e.targetNodeId);
  const queue: number[] = Array.from(eligibleSourceIds);
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (!eligibleNodes.has(next)) {
        eligibleNodes.add(next);
        queue.push(next);
      }
    }
  }

  ctx.log.push({
    nodeId: 0,
    message: `Trigger filter (invokedBy=${invokedBy}${opts.sourceNodeId !== undefined ? `, sourceNodeId=${opts.sourceNodeId}` : ''}): ${eligibleSourceIds.size} of ${nodes.filter((n) => isSource(n.id)).length} sources eligible → ${eligibleNodes.size} of ${nodes.length} nodes will fire`,
    level: 'info',
  });

  // Each node's output rows, keyed by node id. A downstream node concatenates
  // outputs from all its upstream parents.
  const outputByNode = new Map<number, Row[]>();

  let rowsInput = 0;
  let rowsOutput = 0;

  for (const node of sorted) {
    if (!eligibleNodes.has(node.id)) continue; // skipped by trigger filter
    const parentIds = parents.get(node.id) ?? [];
    const inputRows: Row[] = parentIds.length === 0
      ? []
      : parentIds.flatMap((pid) => outputByNode.get(pid) ?? []);

    const executor = getExecutor(node.type);
    if (!executor) {
      ctx.log.push({ nodeId: node.id, message: `No executor registered for node type "${node.type}"`, level: 'error' });
      throw new Error(`No executor registered for node type "${node.type}"`);
    }

    let config: Record<string, unknown> = {};
    if (node.configJson) {
      try {
        config = JSON.parse(node.configJson) as Record<string, unknown>;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'parse error';
        ctx.log.push({ nodeId: node.id, message: `Invalid configJson: ${msg}`, level: 'error' });
        throw new Error(`Node ${node.id} (${node.type}): invalid configJson`);
      }
    }

    const inputCount = inputRows.length;
    if (parentIds.length === 0) rowsInput += inputCount;

    const outputRows = await executor(config, inputRows, node, ctx);
    outputByNode.set(node.id, outputRows);
    rowsOutput = outputRows.length;

    ctx.log.push({
      nodeId: node.id,
      message: `${node.type} (${node.label}): in=${inputCount} → out=${outputRows.length}`,
      level: 'info',
    });
  }

  // rowsInput = sum of eligible source nodes' outputs (external rows pulled in).
  rowsInput = 0;
  for (const node of sorted) {
    if (eligibleSourceIds.has(node.id)) {
      rowsInput += (outputByNode.get(node.id) ?? []).length;
    }
  }

  return {
    rowsInput,
    rowsOutput,
    rowsErrored: ctx.rowsErrored,
    logJson: JSON.stringify(ctx.log),
  };
}

/**
 * Mark `pipeline_runs.id = runId` and `pipelines.id = pipelineId` as
 * completed with the given result. Used by callers after a successful run.
 */
export async function markRunCompleted(
  pipelineId: number,
  runId: number,
  result: { rowsInput: number; rowsOutput: number; rowsErrored: number; logJson: string },
) {
  const [updated] = await db.update(pipelineRuns).set({
    status: 'completed',
    rowsInput: result.rowsInput,
    rowsOutput: result.rowsOutput,
    rowsErrored: result.rowsErrored,
    logJson: result.logJson,
    completedAt: new Date(),
  }).where(eq(pipelineRuns.id, runId)).returning();

  await db.update(pipelines).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));

  return updated;
}

export async function markRunFailed(runId: number, errorMessage: string, partialLog?: PipelineLogEntry[]) {
  await db.update(pipelineRuns).set({
    status: 'failed',
    errorMessage,
    logJson: partialLog ? JSON.stringify(partialLog) : undefined,
    completedAt: new Date(),
  }).where(eq(pipelineRuns.id, runId));
}
