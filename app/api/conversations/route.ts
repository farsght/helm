import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';

export async function GET() {
  try {
    const allConversations = await db.select().from(conversations);
    return NextResponse.json(allConversations);
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [conversation] = await db.insert(conversations).values({
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
