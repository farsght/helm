import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { notebooks, notebookCells } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';

async function verifyOwnership(notebookId: number, userId: string) {
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)));
  return nb ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const notebookId = parseInt(id);
  const notebook = await verifyOwnership(notebookId, userId);
  if (!notebook) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  const cells = await db.select().from(notebookCells).where(eq(notebookCells.notebookId, notebookId)).orderBy(asc(notebookCells.cellIndex));
  return NextResponse.json({ notebook, cells });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const notebookId = parseInt(id);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  try {
    const body = await request.json();
    const [updated] = await db.update(notebooks).set({
      name: body.name,
      description: body.description ?? null,
      language: body.language,
      updatedAt: new Date(),
    }).where(eq(notebooks.id, notebookId)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update notebook error:', err);
    return NextResponse.json({ error: 'Failed to update notebook' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const notebookId = parseInt(id);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  await db.delete(notebooks).where(eq(notebooks.id, notebookId));
  return NextResponse.json({ success: true });
}
