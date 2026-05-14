import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pipelines, pipelineRuns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { runPipeline, markRunCompleted, markRunFailed } from '@/lib/pipeline-engine';

async function verifyOwnership(pipelineId: number, userId: string) {
  const [p] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  return p ?? null;
}

/**
 * Run a pipeline. Thin wrapper:
 *   1. Auth + ownership check
 *   2. Create the pipeline_runs row
 *   3. Delegate to lib/pipeline-engine.runPipeline()
 *   4. Mark the run completed/failed and respond
 *
 * The actual per-node dispatch lives in lib/pipeline-engine.ts. See
 * docs/meetings-pipeline.md §3 for the rationale on splitting this out.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
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

  try {
    const result = await runPipeline(pipelineId, run.id, userId);
    const updated = await markRunCompleted(pipelineId, run.id, result);
    return NextResponse.json({
      runId: updated.id,
      status: updated.status,
      rowsInput: result.rowsInput,
      rowsOutput: result.rowsOutput,
      rowsErrored: result.rowsErrored,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await markRunFailed(run.id, msg);
    return NextResponse.json({ runId: run.id, status: 'failed', error: msg }, { status: 500 });
  }
}
