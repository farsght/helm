import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { segments, segmentMembers, prospects } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { buildFilterCondition, parseFilter } from '@/lib/segment-filters';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allLists = await db
      .select()
      .from(segments)
      .where(eq(segments.userId, userId))
      .orderBy(sql`${segments.createdAt} DESC`);

    const listsWithCounts = await Promise.all(
      allLists.map(async (list) => {
        let memberCount = 0;
        if (list.type === 'dynamic') {
          const filter = parseFilter(list.filterJson);
          const cond = buildFilterCondition(filter);
          if (cond) {
            const [row] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(prospects)
              .where(and(eq(prospects.userId, userId), cond));
            memberCount = row?.count ?? 0;
          }
        } else {
          const [row] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(segmentMembers)
            .where(eq(segmentMembers.segmentId, list.id));
          memberCount = row?.count ?? 0;
        }
        return { ...list, memberCount };
      })
    );

    return NextResponse.json(listsWithCounts);
  } catch (err) {
    console.error('Fetch segments error:', err);
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const type: 'static' | 'dynamic' = body.type === 'dynamic' ? 'dynamic' : 'static';
    const filterJson =
      type === 'dynamic' && body.filterJson
        ? JSON.stringify(body.filterJson)
        : null;

    const [list] = await db
      .insert(segments)
      .values({
        userId,
        name: body.name,
        description: body.description,
        type,
        filterJson,
      })
      .returning();
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error('Create list error:', err);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
