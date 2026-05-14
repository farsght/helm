/**
 * Cron worker endpoint — invoked every minute by Vercel Cron.
 *
 * Walks every pipeline_node with trigger_config.kind='cron' and fires
 * `runPipeline(... { invokedBy: 'cron', sourceNodeId: node.id })` for each
 * one whose cron expression matches the current minute (UTC).
 *
 * This is the ONLY mechanism that lets the backend kick off a pipeline
 * outside of a user clicking ▶ on the canvas — and even then, it fires
 * the canvas's runPipeline through the standard topo executor. The canvas
 * remains the source of truth for what runs.
 *
 * Auth: Vercel Cron pings include `Authorization: Bearer $CRON_SECRET`.
 * In local dev (CRON_SECRET unset), we allow all callers — set it in
 * production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pipelines, pipelineNodes, pipelineRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { runPipeline, markRunCompleted, markRunFailed, parseTriggerConfig } from '@/lib/pipeline-engine';
import { cronMatchesWithinWindow } from '@/lib/cron-matcher';

// The Vercel cron pings us every 5 minutes; check schedules that would have
// matched anywhere in the last 5-minute window so e.g. '17 * * * *' still fires.
const WORKER_WINDOW_MINUTES = 5;

interface CronResult {
  pipelineId: number;
  sourceNodeId: number;
  schedule: string;
  runId?: number;
  status: 'completed' | 'failed' | 'skipped';
  error?: string;
}

export async function GET(req: NextRequest) {
  // Auth check
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  // Round to minute boundary so re-runs within the same minute idempotent
  // (Vercel may retry on transient failure — we don't want to double-fire).
  now.setUTCSeconds(0, 0);

  // Find every pipeline_node with trigger_config.kind='cron'.
  // We can't filter on jsonb path in a portable way via Drizzle here, so we
  // pull all nodes and filter in JS. For the scale we're at (dozens of
  // pipelines), that's fine. Optimize when we hit hundreds.
  const allNodes = await db.select().from(pipelineNodes);

  const results: CronResult[] = [];

  for (const node of allNodes) {
    const trig = parseTriggerConfig(node.triggerConfig);
    if (trig.kind !== 'cron') continue;
    const schedule = typeof trig.schedule === 'string' ? trig.schedule : '';
    if (!schedule) continue;
    if (!cronMatchesWithinWindow(schedule, now, WORKER_WINDOW_MINUTES)) continue;

    // Look up the pipeline to get the owning userId (executors need it).
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, node.pipelineId));
    if (!pipeline) {
      results.push({ pipelineId: node.pipelineId, sourceNodeId: node.id, schedule, status: 'skipped', error: 'pipeline not found' });
      continue;
    }

    // Create a pipeline_runs row, then dispatch.
    const [run] = await db.insert(pipelineRuns).values({
      pipelineId: node.pipelineId,
      status: 'running',
      rowsInput: 0,
      rowsOutput: 0,
      rowsErrored: 0,
    }).returning();

    try {
      const result = await runPipeline(node.pipelineId, run.id, pipeline.userId, {
        invokedBy: 'cron',
        sourceNodeId: node.id,
      });
      await markRunCompleted(node.pipelineId, run.id, result);
      results.push({ pipelineId: node.pipelineId, sourceNodeId: node.id, schedule, runId: run.id, status: 'completed' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      await markRunFailed(run.id, msg);
      results.push({ pipelineId: node.pipelineId, sourceNodeId: node.id, schedule, runId: run.id, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    fired: results.length,
    results,
  });
}
