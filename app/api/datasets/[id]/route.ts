import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/db';
import { datasets, datasetRows } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const datasetId = parseInt(id);
    if (isNaN(datasetId)) {
      return NextResponse.json({ error: 'Invalid dataset ID' }, { status: 400 });
    }

    const [dataset] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '500'), 5000);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');

    const rows = await db
      .select()
      .from(datasetRows)
      .where(eq(datasetRows.datasetId, datasetId))
      .orderBy(sql`${datasetRows.id} ASC`)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ dataset, rows });
  } catch (err) {
    console.error('Fetch dataset error:', err);
    return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const datasetId = parseInt(id);
    const [existing] = await db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
    if (!existing) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }
    // dataset_rows cascades via FK
    await db.delete(datasets).where(eq(datasets.id, datasetId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete dataset error:', err);
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}
