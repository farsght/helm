import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { datasets, datasetRows } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, rowId } = await params;
    const datasetId = parseInt(id);
    const rowIdInt = parseInt(rowId);

    // Verify ownership
    const [ds] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
    if (!ds) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

    const [existingRow] = await db.select().from(datasetRows).where(and(eq(datasetRows.id, rowIdInt), eq(datasetRows.datasetId, datasetId)));
    if (!existingRow) return NextResponse.json({ error: 'Row not found' }, { status: 404 });

    const { key, value } = await request.json();
    if (typeof key !== 'string') return NextResponse.json({ error: 'key must be a string' }, { status: 400 });

    const updatedJson = { ...(existingRow.rowJson as Record<string, unknown>), [key]: value };
    const [updated] = await db.update(datasetRows).set({ rowJson: updatedJson, updatedAt: new Date() }).where(eq(datasetRows.id, rowIdInt)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Patch row error:', err);
    return NextResponse.json({ error: 'Failed to update row' }, { status: 500 });
  }
}
