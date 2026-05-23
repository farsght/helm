import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { conversations, prospects } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allConversations = await db
      .select({ conversation: conversations, prospect: prospects })
      .from(conversations)
      .innerJoin(prospects, eq(conversations.prospectId, prospects.id))
      .where(eq(conversations.userId, userId))
      .orderBy(sql`${conversations.lastMessageAt} DESC`);
    return NextResponse.json(allConversations);
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [conversation] = await db.insert(conversations).values({
      userId,
      prospectId: body.prospectId,
      campaignId: body.campaignId,
      status: body.status || 'new',
      lastMessageAt: body.lastMessageAt ? new Date(body.lastMessageAt) : null,
      assignedTo: body.assignedTo,
    }).returning();
    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    console.error('Create conversation error:', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
