import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { pipelines, pipelineRuns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';

async function verifyOwnership(pipelineId: number, userId: string) {
  const [p] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  return p ?? null;
}

/**
 * Run a pipeline via Inngest for durable, per-node execution.
 *
 * Flow:
 *   1. Auth + ownership check
 *   2. Create the pipeline_runs row (status='running')
 *   3. Send `helm/pipeline.run.requested` to Inngest
 *   4. Return immediately — Inngest executes asynchronously and updates
 *      the run row to 'completed' or 'failed' when done.
 *
 * The actual per-node dispatch lives in lib/inngest/functions/pipeline-run.ts.
 * The original lib/pipeline-engine.ts runPipeline() remains intact and is
 * used by cron, webhook, and debug scripts.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  const [run] = await db.insert(pipelineRuns).values({
    pipelineId,
    status: 'running',
    rowsInput: 0,
    rowsOutput: 0,
    rowsErrored: 0,
  }).returning();

  await inngest.send({
    name: 'helm/pipeline.run.requested',
    data: { pipelineId, runId: run.id, userId },
  });

  return NextResponse.json({ runId: run.id, status: 'running', message: 'Pipeline queued' });
}
