import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { listMembers, lists, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildFilterCondition, parseFilter } from '@/lib/list-filters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const listId = parseInt(id);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const [list] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    if (list.type === 'dynamic') {
      const filter = parseFilter(list.filterJson);
      const cond = buildFilterCondition(filter);
      if (!cond) return NextResponse.json([]);
      const rows = await db
        .select({
          id: prospects.id,
          firstName: prospects.firstName,
          lastName: prospects.lastName,
          email: prospects.email,
          company: prospects.company,
          title: prospects.title,
        })
        .from(prospects)
        .where(and(eq(prospects.userId, userId), cond));
      return NextResponse.json(rows);
    }

    // static list
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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const listId = parseInt(id);
    const [list] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    if (list.type === 'dynamic') {
      return NextResponse.json(
        { error: 'Cannot manually add prospects to a dynamic list' },
        { status: 400 }
      );
    }

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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const listId = parseInt(id);
    const [list] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    if (list.type === 'dynamic') {
      return NextResponse.json(
        { error: 'Cannot manually remove prospects from a dynamic list' },
        { status: 400 }
      );
    }

    const { prospectId } = await request.json();
    await db
      .delete(listMembers)
      .where(and(eq(listMembers.listId, listId), eq(listMembers.prospectId, prospectId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove list member error:', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
