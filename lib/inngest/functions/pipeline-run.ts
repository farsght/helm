/**
 * Inngest durable function for pipeline execution.
 *
 * Replaces the synchronous `runPipeline()` call in the API route with a
 * durable, step-based execution model. Each node in the pipeline becomes an
 * individual `step.run()` — giving us per-node retries, checkpointing, and
 * observability for free.
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
  pipelines,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  topoSortGeneric,
  getExecutor,
  parseTriggerConfig,
} from '@/lib/pipeline-engine';
import type { DbPipelineNode, DbPipelineEdge, Row, PipelineLogEntry } from '@/lib/pipeline-engine-types';

// ── Serializable topology snapshot ───────────────────────────────────
// We load topology once in a step.run() so it's memoized on replay.

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

      // Return plain objects — Inngest serializes via JSON, so no class instances.
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
          rowsInput: 0,
          rowsOutput: 0,
          rowsErrored: 0,
          logJson: JSON.stringify([{ nodeId: 0, message: 'Pipeline has no nodes', level: 'warn' }]),
          completedAt: new Date(),
        }).where(eq(pipelineRuns.id, runId));
        await db.update(pipelines).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));
      });
      return { rowsInput: 0, rowsOutput: 0, rowsErrored: 0 };
    }

    // ── Topo sort (pure, no DB needed — done outside a step) ──────────
    let sorted: DbPipelineNode[];
    try {
      sorted = topoSortGeneric<DbPipelineNode, DbPipelineEdge>(nodes, edges);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Topology error';
      await step.run('mark-failed-topo', async () => {
        await db.update(pipelineRuns).set({
          status: 'failed',
          errorMessage: msg,
          completedAt: new Date(),
        }).where(eq(pipelineRuns.id, runId));
      });
      throw new NonRetriableError(msg);
    }

    // ── Build parent map ──────────────────────────────────────────────
    const parents = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
    for (const e of edges) {
      parents.get(e.targetNodeId)?.push(e.sourceNodeId);
    }

    // ── Determine eligible source nodes (manual trigger) ──────────────
    const isSource = (id: number) => (parents.get(id) ?? []).length === 0;
    const eligibleSourceIds = new Set<number>();
    for (const node of nodes) {
      if (!isSource(node.id)) continue;
      const trig = parseTriggerConfig(node.triggerConfig);
      if (trig.kind === 'manual') {
        eligibleSourceIds.add(node.id);
      }
    }

    // BFS from eligible sources
    const eligibleNodes = new Set<number>(eligibleSourceIds);
    const adj = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
    for (const e of edges) adj.get(e.sourceNodeId)?.push(e.targetNodeId);
    const bfsQueue: number[] = Array.from(eligibleSourceIds);
    while (bfsQueue.length > 0) {
      const id = bfsQueue.shift()!;
      for (const next of adj.get(id) ?? []) {
        if (!eligibleNodes.has(next)) {
          eligibleNodes.add(next);
          bfsQueue.push(next);
        }
      }
    }

    // ── Execute each node as a durable step ───────────────────────────
    // Outputs accumulate in a plain object (JSON-serializable between steps).
    const outputByNodeId: Record<number, Row[]> = {};
    const log: PipelineLogEntry[] = [];
    let rowsErrored = 0;

    log.push({
      nodeId: 0,
      message: `Inngest pipeline-run: ${eligibleSourceIds.size} sources, ${eligibleNodes.size} of ${nodes.length} nodes will fire`,
      level: 'info',
    });

    for (const node of sorted) {
      if (!eligibleNodes.has(node.id)) continue;

      const parentIds = parents.get(node.id) ?? [];
      const inputRows: Row[] =
        parentIds.length === 0
          ? []
          : parentIds.flatMap((pid) => outputByNodeId[pid] ?? []);

      const stepId = `node-${node.id}-${node.type}`;

      // Each node runs as an isolated, retriable step.
      const result = await step.run(stepId, async (): Promise<{ rows: Row[]; rowsErrored: number; logMsg: string }> => {
        const executor = getExecutor(node.type);
        if (!executor) {
          throw new NonRetriableError(`No executor registered for node type "${node.type}"`);
        }

        let config: Record<string, unknown> = {};
        if (node.configJson) {
          try {
            config = JSON.parse(node.configJson) as Record<string, unknown>;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'parse error';
            throw new NonRetriableError(`Node ${node.id} (${node.type}): invalid configJson — ${msg}`);
          }
        }

        // Build a local ctx for this step's execution.
        const stepCtx = {
          pipelineId,
          runId,
          userId,
          log: [] as PipelineLogEntry[],
          rowsErrored: 0,
        };

        const outputRows = await executor(config, inputRows, node, stepCtx);
        const localErrored = stepCtx.rowsErrored;
        const logMsg = `${node.type} (${node.label}): in=${inputRows.length} → out=${outputRows.length}`;

        // Return JSON-serializable data only.
        return { rows: outputRows, rowsErrored: localErrored, logMsg };
      });

      outputByNodeId[node.id] = result.rows;
      rowsErrored += result.rowsErrored;
      log.push({ nodeId: node.id, message: result.logMsg, level: 'info' });
    }

    // ── Compute final counts ──────────────────────────────────────────
    let rowsInput = 0;
    let rowsOutput = 0;
    for (const node of sorted) {
      if (eligibleSourceIds.has(node.id)) {
        rowsInput += (outputByNodeId[node.id] ?? []).length;
      }
    }
    // rowsOutput = last eligible node's output count
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (eligibleNodes.has(sorted[i].id)) {
        rowsOutput = (outputByNodeId[sorted[i].id] ?? []).length;
        break;
      }
    }

    // ── Mark completed ────────────────────────────────────────────────
    await step.run('mark-completed', async () => {
      await db.update(pipelineRuns).set({
        status: 'completed',
        rowsInput,
        rowsOutput,
        rowsErrored,
        logJson: JSON.stringify(log),
        completedAt: new Date(),
      }).where(eq(pipelineRuns.id, runId));
      await db.update(pipelines).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));
    });

    return { rowsInput, rowsOutput, rowsErrored };
  },
);
