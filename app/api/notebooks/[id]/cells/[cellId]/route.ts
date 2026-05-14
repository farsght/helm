import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { notebooks, notebookCells } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyOwnership(notebookId: number, userId: string) {
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)));
  return nb ?? null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; cellId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, cellId } = await params;
  const notebookId = parseInt(id);
  const cellIdInt = parseInt(cellId);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  try {
    const body = await request.json();
    const updates: Partial<typeof notebookCells.$inferInsert> = {};
    if (body.code !== undefined) updates.code = body.code;
    if (body.language !== undefined) updates.language = body.language;
    if (body.cellIndex !== undefined) updates.cellIndex = body.cellIndex;

    const [updated] = await db.update(notebookCells).set(updates).where(and(eq(notebookCells.id, cellIdInt), eq(notebookCells.notebookId, notebookId))).returning();
    if (!updated) return NextResponse.json({ error: 'Cell not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update cell error:', err);
    return NextResponse.json({ error: 'Failed to update cell' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; cellId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, cellId } = await params;
  const notebookId = parseInt(id);
  const cellIdInt = parseInt(cellId);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  await db.delete(notebookCells).where(and(eq(notebookCells.id, cellIdInt), eq(notebookCells.notebookId, notebookId)));
  return NextResponse.json({ success: true });
}
