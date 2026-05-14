import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { notebooks, notebookCells } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

async function verifyOwnership(notebookId: number, userId: string) {
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)));
  return nb ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const notebookId = parseInt(id);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  const cells = await db.select().from(notebookCells).where(eq(notebookCells.notebookId, notebookId)).orderBy(sql`${notebookCells.cellIndex} ASC`);
  return NextResponse.json(cells);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const notebookId = parseInt(id);
  const nb = await verifyOwnership(notebookId, userId);
  if (!nb) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  try {
    const body = await request.json().catch(() => ({}));
    // Get max cell index
    const existing = await db.select({ idx: notebookCells.cellIndex }).from(notebookCells).where(eq(notebookCells.notebookId, notebookId));
    const maxIdx = existing.length > 0 ? Math.max(...existing.map((c) => c.idx)) : -1;

    const [cell] = await db.insert(notebookCells).values({
      notebookId,
      cellIndex: maxIdx + 1,
      language: body.language ?? nb.language,
      code: body.code ?? '',
    }).returning();
    return NextResponse.json(cell, { status: 201 });
  } catch (err) {
    console.error('Add cell error:', err);
    return NextResponse.json({ error: 'Failed to add cell' }, { status: 500 });
  }
}
