import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations, campaigns } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const totalMessages = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const sentMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'sent'));
    const openedMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'opened'));
    const repliedMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.status, 'replied'));
    const activeCampaigns = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'active'));
    const meetingsBooked = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.status, 'meeting_booked'));

    return NextResponse.json({
      totalMessages: totalMessages[0]?.count || 0,
      sentMessages: sentMessages[0]?.count || 0,
      openedMessages: openedMessages[0]?.count || 0,
      repliedMessages: repliedMessages[0]?.count || 0,
      activeCampaigns: activeCampaigns[0]?.count || 0,
      meetingsBooked: meetingsBooked[0]?.count || 0,
      openRate: sentMessages[0]?.count ? ((openedMessages[0]?.count || 0) / sentMessages[0].count * 100).toFixed(1) : '0.0',
      replyRate: sentMessages[0]?.count ? ((repliedMessages[0]?.count || 0) / sentMessages[0].count * 100).toFixed(1) : '0.0',
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
