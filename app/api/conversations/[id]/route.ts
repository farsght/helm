import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, messages, prospects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get conversation with prospect details
    const [conversation] = await db.select({
      conversation: conversations,
      prospect: prospects,
    })
      .from(conversations)
      .innerJoin(prospects, eq(conversations.prospectId, prospects.id))
      .where(eq(conversations.id, parseInt(id)));

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get all messages for this conversation
    const conversationMessages = await db.select()
      .from(messages)
      .where(eq(messages.prospectId, conversation.conversation.prospectId))
      .orderBy(messages.createdAt);

    return NextResponse.json({
      ...conversation,
      messages: conversationMessages,
    });
  } catch (err) {
    console.error('Fetch conversation error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db.update(conversations)
      .set({
        status: body.status,
        assignedTo: body.assignedTo,
      })
      .where(eq(conversations.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update conversation error:', err);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
