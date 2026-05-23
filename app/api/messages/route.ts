import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { messages, campaigns, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const campaignIdParam = searchParams.get('campaignId');
    const prospectIdParam = searchParams.get('prospectId');

    if (campaignIdParam) {
      const campaignId = parseInt(campaignIdParam);
      const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
      if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const msgs = await db.select().from(messages).where(eq(messages.campaignId, campaignId)).orderBy(messages.createdAt);
      return NextResponse.json(msgs);
    }

    if (prospectIdParam) {
      const prospectId = parseInt(prospectIdParam);
      const [prospect] = await db.select().from(prospects).where(and(eq(prospects.id, prospectId), eq(prospects.userId, userId)));
      if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const msgs = await db.select().from(messages).where(eq(messages.prospectId, prospectId)).orderBy(messages.createdAt);
      return NextResponse.json(msgs);
    }

    return NextResponse.json([]);
  } catch (err) {
    console.error('Fetch messages error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [message] = await db.insert(messages).values({
      userId,
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
