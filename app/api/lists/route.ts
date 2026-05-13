import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { lists, listMembers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allLists = await db.select().from(lists).where(eq(lists.userId, userId)).orderBy(sql`${lists.createdAt} DESC`);

    const listsWithCounts = await Promise.all(
      allLists.map(async (list) => {
        const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(listMembers).where(eq(listMembers.listId, list.id));
        return { ...list, memberCount: count?.count || 0 };
      })
    );

    return NextResponse.json(listsWithCounts);
  } catch (err) {
    console.error('Fetch lists error:', err);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [list] = await db.insert(lists).values({
      userId,
      name: body.name,
      description: body.description,
      type: body.type || 'static',
      filterJson: body.filterJson ? JSON.stringify(body.filterJson) : null,
    }).returning();
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error('Create list error:', err);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
