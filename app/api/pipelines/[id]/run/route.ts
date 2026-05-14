import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pipelines, pipelineRuns, pipelineNodes, datasets, datasetRows } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyOwnership(pipelineId: number, userId: string) {
  const [p] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  return p ?? null;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  // Create a run record
  const [run] = await db.insert(pipelineRuns).values({
    pipelineId,
    status: 'running',
    rowsInput: 0,
    rowsOutput: 0,
    rowsErrored: 0,
  }).returning();

  // Simulate execution: count nodes and report
  try {
    const nodes = await db.select().from(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
    const sourceNode = nodes.find((n) => n.type === 'source_dataset');
    let rowsInput = 0;

    if (sourceNode?.configJson) {
      try {
        const cfg = JSON.parse(sourceNode.configJson);
        if (cfg.datasetId) {
          const [ds] = await db.select().from(datasets).where(eq(datasets.id, cfg.datasetId));
          if (ds) rowsInput = ds.rowCount;
        }
      } catch {
        // ignore config parse error
      }
    }

    const log = nodes.map((n) => ({ nodeId: n.id, message: `Processed node: ${n.label}`, level: 'info' }));

    const [updated] = await db.update(pipelineRuns).set({
      status: 'completed',
      rowsInput,
      rowsOutput: rowsInput,
      rowsErrored: 0,
      logJson: JSON.stringify(log),
      completedAt: new Date(),
    }).where(eq(pipelineRuns.id, run.id)).returning();

    await db.update(pipelines).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));

    return NextResponse.json({ runId: updated.id, status: updated.status, rowsInput, rowsOutput: rowsInput });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await db.update(pipelineRuns).set({ status: 'failed', errorMessage: msg, completedAt: new Date() }).where(eq(pipelineRuns.id, run.id));
    return NextResponse.json({ runId: run.id, status: 'failed', error: msg }, { status: 500 });
  }
}
