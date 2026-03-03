import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, messages, prospects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, parseInt(id)));

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get prospect
    const [prospect] = await db.select()
      .from(prospects)
      .where(eq(prospects.id, conversation.prospectId));

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    // Get the last message to determine channel
    const lastMessages = await db.select()
      .from(messages)
      .where(eq(messages.prospectId, conversation.prospectId))
      .orderBy(messages.createdAt)
      .limit(1);

    const channel = lastMessages[0]?.channel || 'email';

    // Create reply message
    const [message] = await db.insert(messages).values({
      campaignId: conversation.campaignId,
      prospectId: conversation.prospectId,
      nodeId: null,
      channel,
      direction: 'outbound',
      subject: body.subject,
      body: body.body,
      bodyHtml: body.bodyHtml,
      status: 'draft',
      aiGenerated: body.aiGenerated || false,
    }).returning();

    // Update conversation
    await db.update(conversations)
      .set({ 
        lastMessageAt: new Date(),
        status: body.conversationStatus || conversation.status,
      })
      .where(eq(conversations.id, conversation.id));

    // If not a draft, send it
    if (body.send) {
      // Call the send endpoint internally
      const sendResponse = await fetch(`${request.nextUrl.origin}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: conversation.prospectId,
          campaignId: conversation.campaignId,
          channel,
          subject: body.subject,
          body: body.body,
          bodyHtml: body.bodyHtml,
          aiGenerated: body.aiGenerated || false,
        }),
      });

      if (!sendResponse.ok) {
        console.error('Failed to send message');
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Reply error:', err);
    return NextResponse.json({ 
      error: 'Failed to send reply',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
