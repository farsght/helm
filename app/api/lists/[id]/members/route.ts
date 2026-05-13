import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { listMembers, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = parseInt(id);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const members = await db
      .select({
        id: prospects.id,
        firstName: prospects.firstName,
        lastName: prospects.lastName,
        email: prospects.email,
        company: prospects.company,
        title: prospects.title,
      })
      .from(listMembers)
      .innerJoin(prospects, eq(listMembers.prospectId, prospects.id))
      .where(eq(listMembers.listId, listId));

    return NextResponse.json(members);
  } catch (err) {
    console.error('Fetch list members error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch list members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listId = parseInt(id);
    const { prospectIds } = await request.json();

    let added = 0;
    for (const prospectId of prospectIds as number[]) {
      const existing = await db
        .select({ id: listMembers.id })
        .from(listMembers)
        .where(and(eq(listMembers.listId, listId), eq(listMembers.prospectId, prospectId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(listMembers).values({ listId, prospectId });
        added++;
      }
    }

    return NextResponse.json({ added });
  } catch (err) {
    console.error('Add list members error:', err);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { prospectId } = await request.json();
    await db
      .delete(listMembers)
      .where(and(eq(listMembers.listId, parseInt(id)), eq(listMembers.prospectId, prospectId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove list member error:', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
