import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { segments, segmentMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(segments).where(and(eq(segments.id, parseInt(id)), eq(segments.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'List not found' }, { status: 404 });

    const body = await request.json();
    const updatePayload: {
      name?: string;
      description?: string | null;
      filterJson?: string | null;
      updatedAt: Date;
    } = {
      name: body.name,
      description: body.description,
      updatedAt: new Date(),
    };
    if (body.filterJson !== undefined) {
      updatePayload.filterJson =
        body.filterJson === null ? null : JSON.stringify(body.filterJson);
    }
    const [updated] = await db
      .update(segments)
      .set(updatePayload)
      .where(and(eq(segments.id, parseInt(id)), eq(segments.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update list error:', err);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(segments).where(and(eq(segments.id, parseInt(id)), eq(segments.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'List not found' }, { status: 404 });

    await db.delete(segmentMembers).where(eq(segmentMembers.segmentId, parseInt(id)));
    await db.delete(segments).where(and(eq(segments.id, parseInt(id)), eq(segments.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete list error:', err);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
