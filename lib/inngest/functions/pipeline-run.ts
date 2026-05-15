/**
 * Inngest durable function for pipeline execution.
 *
 * Each node runs as a `step.run()` for durability + per-node retries.
 * Large intermediate data (meeting transcripts, embeddings, etc.) is
 * stored in `pipeline_step_data` in Neon — Inngest steps only return
 * lightweight metadata (counts). This avoids the ~4MB step output limit.
 *
 * Event: `helm/pipeline.run.requested`
 * Data:  { pipelineId: number, runId: number, userId: string }
 */

import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
import { db } from '@/db';
import {
  pipelineNodes,
  pipelineEdges,
  pipelineRuns,
  pipelineStepData,
  pipelines,
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  topoSortGeneric,
  getExecutor,
  parseTriggerConfig,
} from '@/lib/pipeline-engine';
import type { DbPipelineNode, DbPipelineEdge, Row, PipelineLogEntry } from '@/lib/pipeline-engine-types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Write step output rows to Neon staging table. */
async function stageRows(runId: number, nodeId: number, rows: Row[]) {
  if (rows.length === 0) return;
  // Chunk into 500-row batches to avoid query size limits
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await db.insert(pipelineStepData).values({
      runId,
      nodeId,
      dataJson: JSON.stringify(batch),
    });
  }
}

/** Read staged rows from parent nodes. */
async function readParentRows(runId: number, parentNodeIds: number[]): Promise<Row[]> {
  if (parentNodeIds.length === 0) return [];
  const staged = await db.select().from(pipelineStepData)
    .where(and(
      eq(pipelineStepData.runId, runId),
      inArray(pipelineStepData.nodeId, parentNodeIds),
    ));
  const rows: Row[] = [];
  for (const s of staged) {
    const parsed = JSON.parse(s.dataJson) as Row[];
    rows.push(...parsed);
  }
  return rows;
}

// ── Serializable topology snapshot ───────────────────────────────────

interface TopologySnapshot {
  nodes: DbPipelineNode[];
  edges: DbPipelineEdge[];
}

// ── The function ─────────────────────────────────────────────────────

export const pipelineRunFunction = inngest.createFunction(
  {
    id: 'pipeline-run',
    triggers: [{ event: 'helm/pipeline.run.requested' }],
    retries: 2,
    concurrency: { limit: 3 },
  },
  async ({ event, step }: { event: { data: { pipelineId: number; runId: number; userId: string } }; step: import('inngest').GetStepTools<typeof inngest> }) => {
    const { pipelineId, runId, userId } = event.data;

    // ── Step 1: Load topology ─────────────────────────────────────────
    const topology = (await step.run('load-topology', async () => {
      const nodes = await db.select().from(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
      const edges = await db.select().from(pipelineEdges).where(eq(pipelineEdges.pipelineId, pipelineId));
      return {
        nodes: nodes.map((n: DbPipelineNode) => ({ ...n })),
        edges: edges.map((e: DbPipelineEdge) => ({ ...e })),
      };
    })) as unknown as TopologySnapshot;

    const { nodes, edges } = topology;

    if (nodes.length === 0) {
      await step.run('mark-completed-empty', async () => {
        await db.update(pipelineRuns).set({
          status: 'completed',
          rowsInput: 0, rowsOutput: 0, rowsErrored: 0,
          logJson: JSON.stringify([{ nodeId: 0, message: 'Pipeline has no nodes', level: 'warn' }]),
          completedAt: new Date(),
        }).where(eq(pipelineRuns.id, runId));
      });
      return { rowsInput: 0, rowsOutput: 0, rowsErrored: 0 };
    }

    // ── Topo sort ─────────────────────────────────────────────────────
    let sorted: DbPipelineNode[];
    try {
      sorted = topoSortGeneric<DbPipelineNode, DbPipelineEdge>(nodes, edges);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Topology error';
      await step.run('mark-failed-topo', async () => {
        await db.update(pipelineRuns).set({
          status: 'failed', errorMessage: msg, completedAt: new Date(),
        }).where(eq(pipelineRuns.id, runId));
      });
      throw new NonRetriableError(msg);
    }

    // ── Build parent map + eligible nodes ─────────────────────────────
    const parentMap = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
    for (const e of edges) parentMap.get(e.targetNodeId)?.push(e.sourceNodeId);

    const isSource = (id: number) => (parentMap.get(id) ?? []).length === 0;
    const eligibleSourceIds = new Set<number>();
    for (const node of nodes) {
      if (isSource(node.id)) {
        const trig = parseTriggerConfig(node.triggerConfig);
        if (trig.kind === 'manual') eligibleSourceIds.add(node.id);
      }
    }

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

    // ── Execute each node as a durable step ───────────────────────────
    const log: PipelineLogEntry[] = [];
    let totalRowsErrored = 0;
    const outputCounts: Record<number, number> = {};

    log.push({
      nodeId: 0,
      message: `Inngest pipeline-run: ${eligibleSourceIds.size} sources, ${eligibleNodes.size}/${nodes.length} nodes eligible`,
      level: 'info',
    });

    for (const node of sorted) {
      if (!eligibleNodes.has(node.id)) continue;

      const stepId = `node-${node.id}-${node.type}`;
      const parentIds = parentMap.get(node.id) ?? [];

      const result = await step.run(stepId, async (): Promise<{ rowCount: number; rowsErrored: number; logEntries: PipelineLogEntry[] }> => {
        // Read input from DB staging (not from step args)
        const inputRows = await readParentRows(runId, parentIds);

        const executor = getExecutor(node.type);
        if (!executor) {
          throw new NonRetriableError(`No executor for node type "${node.type}"`);
        }

        let config: Record<string, unknown> = {};
        if (node.configJson) {
          try {
            config = JSON.parse(node.configJson) as Record<string, unknown>;
          } catch {
            throw new NonRetriableError(`Node ${node.id}: invalid configJson`);
          }
        }

        const stepCtx = {
          pipelineId, runId, userId,
          log: [] as PipelineLogEntry[],
          rowsErrored: 0,
        };

        const outputRows = await executor(config, inputRows, node, stepCtx);

        // Stage output rows to Neon
        await stageRows(runId, node.id, outputRows);

        return {
          rowCount: outputRows.length,
          rowsErrored: stepCtx.rowsErrored,
          logEntries: stepCtx.log,
        };
      });

      outputCounts[node.id] = result.rowCount;
      totalRowsErrored += result.rowsErrored;
      log.push(...result.logEntries);
      log.push({ nodeId: node.id, message: `${node.type} (${node.label}): out=${result.rowCount}`, level: 'info' });
    }

    // ── Compute final counts ──────────────────────────────────────────
    let rowsInput = 0;
    for (const id of eligibleSourceIds) rowsInput += outputCounts[id] ?? 0;
    let rowsOutput = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (eligibleNodes.has(sorted[i].id)) {
        rowsOutput = outputCounts[sorted[i].id] ?? 0;
        break;
      }
    }

    // ── Mark completed + clean up staging ─────────────────────────────
    await step.run('mark-completed', async () => {
      await db.update(pipelineRuns).set({
        status: 'completed',
        rowsInput, rowsOutput, rowsErrored: totalRowsErrored,
        logJson: JSON.stringify(log),
        completedAt: new Date(),
      }).where(eq(pipelineRuns.id, runId));
      await db.update(pipelines).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));

      // Clean up staging data for this run
      await db.delete(pipelineStepData).where(eq(pipelineStepData.runId, runId));
    });

    return { rowsInput, rowsOutput, rowsErrored: totalRowsErrored };
  },
);
