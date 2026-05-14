import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pipelines } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyOwnership(pipelineId: number, userId: string) {
  const [p] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  return p ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipeline = await verifyOwnership(parseInt(id), userId);
  if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  return NextResponse.json(pipeline);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  try {
    const body = await request.json();
    const [updated] = await db.update(pipelines).set({
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      updatedAt: new Date(),
    }).where(eq(pipelines.id, pipelineId)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update pipeline error:', err);
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  await db.delete(pipelines).where(eq(pipelines.id, pipelineId));
  return NextResponse.json({ success: true });
}
