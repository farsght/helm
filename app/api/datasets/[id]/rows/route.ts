import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { datasets, datasetRows } from '@/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

async function verifyDatasetOwnership(datasetId: number, userId: string) {
  const [ds] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
  return ds ?? null;
}

// POST — add a new empty row
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const datasetId = parseInt(id);
    if (!await verifyDatasetOwnership(datasetId, userId)) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const [row] = await db.insert(datasetRows).values({ datasetId, rowJson: {} }).returning();
    await db.update(datasets).set({ rowCount: sql`${datasets.rowCount} + 1`, updatedAt: new Date() }).where(eq(datasets.id, datasetId));
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('Add row error:', err);
    return NextResponse.json({ error: 'Failed to add row' }, { status: 500 });
  }
}

// DELETE — bulk delete rows
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const datasetId = parseInt(id);
    if (!await verifyDatasetOwnership(datasetId, userId)) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const body = await request.json();
    const ids: number[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return NextResponse.json({ deleted: 0 });

    await db.delete(datasetRows).where(and(eq(datasetRows.datasetId, datasetId), inArray(datasetRows.id, ids)));
    await db.update(datasets).set({ rowCount: sql`GREATEST(${datasets.rowCount} - ${ids.length}, 0)`, updatedAt: new Date() }).where(eq(datasets.id, datasetId));
    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error('Delete rows error:', err);
    return NextResponse.json({ error: 'Failed to delete rows' }, { status: 500 });
  }
}
