import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { lists, listMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(lists).where(and(eq(lists.id, parseInt(id)), eq(lists.userId, userId)));
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
      .update(lists)
      .set(updatePayload)
      .where(and(eq(lists.id, parseInt(id)), eq(lists.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update list error:', err);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(lists).where(and(eq(lists.id, parseInt(id)), eq(lists.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'List not found' }, { status: 404 });

    await db.delete(listMembers).where(eq(listMembers.listId, parseInt(id)));
    await db.delete(lists).where(and(eq(lists.id, parseInt(id)), eq(lists.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete list error:', err);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
