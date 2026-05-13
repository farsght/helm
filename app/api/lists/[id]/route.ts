import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lists, listMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [updated] = await db
      .update(lists)
      .set({
        name: body.name,
        description: body.description,
        updatedAt: new Date(),
      })
      .where(eq(lists.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update list error:', err);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(listMembers).where(eq(listMembers.listId, parseInt(id)));
    await db.delete(lists).where(eq(lists.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete list error:', err);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
