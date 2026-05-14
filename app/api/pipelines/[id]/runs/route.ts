import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pipelines, pipelineRuns } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);

  const [pipeline] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  const runs = await db.select().from(pipelineRuns).where(eq(pipelineRuns.pipelineId, pipelineId)).orderBy(sql`${pipelineRuns.startedAt} DESC`).limit(20);
  return NextResponse.json(runs);
}
