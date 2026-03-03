import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';

export async function GET() {
  try {
    const allMessages = await db.select().from(messages);
    return NextResponse.json(allMessages);
  } catch (err) {
    console.error('Fetch messages error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [message] = await db.insert(messages).values({
      campaignId: body.campaignId,
      prospectId: body.prospectId,
      nodeId: body.nodeId,
      channel: body.channel,
      direction: body.direction || 'outbound',
      subject: body.subject,
      body: body.body,
      bodyHtml: body.bodyHtml,
      status: body.status || 'draft',
      aiGenerated: body.aiGenerated || false,
    }).returning();
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Create message error:', err);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
