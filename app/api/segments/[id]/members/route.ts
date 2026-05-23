import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { segmentMembers, segments, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildFilterCondition, parseFilter } from '@/lib/segment-filters';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const segmentId = parseInt(id);

    if (isNaN(segmentId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const [list] = await db
      .select()
      .from(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.userId, userId)));
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
      .from(segmentMembers)
      .innerJoin(prospects, eq(segmentMembers.prospectId, prospects.id))
      .where(eq(segmentMembers.segmentId, segmentId));

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
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const segmentId = parseInt(id);
    const [list] = await db
      .select()
      .from(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.userId, userId)));
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
        .select({ id: segmentMembers.id })
        .from(segmentMembers)
        .where(and(eq(segmentMembers.segmentId, segmentId), eq(segmentMembers.prospectId, prospectId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(segmentMembers).values({ segmentId, prospectId });
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
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const segmentId = parseInt(id);
    const [list] = await db
      .select()
      .from(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.userId, userId)));
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    if (list.type === 'dynamic') {
      return NextResponse.json(
        { error: 'Cannot manually remove prospects from a dynamic list' },
        { status: 400 }
      );
    }

    const { prospectId } = await request.json();
    await db
      .delete(segmentMembers)
      .where(and(eq(segmentMembers.segmentId, segmentId), eq(segmentMembers.prospectId, prospectId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove list member error:', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
