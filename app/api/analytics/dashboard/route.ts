import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations, campaigns, prospects, campaignProspects } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total prospects
    const totalProspects = await db.select({ count: sql<number>`count(*)` }).from(prospects);

    // Active campaigns
    const activeCampaigns = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'active'));

    // Messages today, week, month
    const messagesToday = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        sql`${messages.sentAt} >= ${Math.floor(today.getTime() / 1000)}`
      ));

    const messagesWeek = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        sql`${messages.sentAt} >= ${Math.floor(weekAgo.getTime() / 1000)}`
      ));

    const messagesMonth = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        sql`${messages.sentAt} >= ${Math.floor(monthAgo.getTime() / 1000)}`
      ));

    // Reply rate, open rate
    const totalSent = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.direction, 'outbound'));

    const totalOpened = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        sql`${messages.openedAt} IS NOT NULL`
      ));

    const totalReplied = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.direction, 'outbound'),
        sql`${messages.repliedAt} IS NOT NULL`
      ));

    const meetingsBooked = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.status, 'meeting_booked'));

    const sentCount = totalSent[0]?.count || 0;
    const openRate = sentCount > 0 ? ((totalOpened[0]?.count || 0) / sentCount * 100).toFixed(1) : '0.0';
    const replyRate = sentCount > 0 ? ((totalReplied[0]?.count || 0) / sentCount * 100).toFixed(1) : '0.0';
    const meetingRate = sentCount > 0 ? ((meetingsBooked[0]?.count || 0) / sentCount * 100).toFixed(1) : '0.0';

    // Chart data: messages sent vs replied last 30 days
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = Math.floor(date.getTime() / 1000);
      const dayEnd = dayStart + 86400;

      const sent = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.direction, 'outbound'),
          sql`${messages.sentAt} >= ${dayStart}`,
          sql`${messages.sentAt} < ${dayEnd}`
        ));

      const replied = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.direction, 'outbound'),
          sql`${messages.repliedAt} >= ${dayStart}`,
          sql`${messages.repliedAt} < ${dayEnd}`
        ));

      chartData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        sent: sent[0]?.count || 0,
        replied: replied[0]?.count || 0,
      });
    }

    // Campaign performance comparison
    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, 'active')).limit(5);
    const campaignPerformance = await Promise.all(
      allCampaigns.map(async (campaign) => {
        const sent = await db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.campaignId, campaign.id),
            eq(messages.direction, 'outbound')
          ));

        const opened = await db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.campaignId, campaign.id),
            eq(messages.direction, 'outbound'),
            sql`${messages.openedAt} IS NOT NULL`
          ));

        const replied = await db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.campaignId, campaign.id),
            eq(messages.direction, 'outbound'),
            sql`${messages.repliedAt} IS NOT NULL`
          ));

        return {
          name: campaign.name.length > 15 ? campaign.name.slice(0, 12) + '...' : campaign.name,
          sent: sent[0]?.count || 0,
          opened: opened[0]?.count || 0,
          replied: replied[0]?.count || 0,
        };
      })
    );

    // Recent conversations needing attention (last 5 with unread replies)
    const recentConvos = await db
      .select({
        id: conversations.id,
        prospectId: conversations.prospectId,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(eq(conversations.status, 'new'))
      .orderBy(sql`${conversations.lastMessageAt} DESC`)
      .limit(5);

    const recentConversations = await Promise.all(
      recentConvos.map(async (convo) => {
        const prospect = await db.select().from(prospects).where(eq(prospects.id, convo.prospectId)).limit(1);
        const lastMsg = await db.select().from(messages)
          .where(and(
            eq(messages.prospectId, convo.prospectId),
            eq(messages.direction, 'inbound')
          ))
          .orderBy(sql`${messages.createdAt} DESC`)
          .limit(1);

        return {
          id: convo.id,
          prospectName: prospect[0] ? `${prospect[0].firstName} ${prospect[0].lastName}` : 'Unknown',
          status: convo.status,
          lastMessage: lastMsg[0]?.body || 'No message',
          unread: true,
        };
      })
    );

    // Active campaigns with prospect counts
    const campaignsWithCounts = await Promise.all(
      allCampaigns.map(async (campaign) => {
        const prospectCount = await db.select({ count: sql<number>`count(*)` })
          .from(campaignProspects)
          .where(eq(campaignProspects.campaignId, campaign.id));

        return {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          prospectCount: prospectCount[0]?.count || 0,
        };
      })
    );

    return NextResponse.json({
      metrics: {
        totalProspects: totalProspects[0]?.count || 0,
        activeCampaigns: activeCampaigns[0]?.count || 0,
        messagesToday: messagesToday[0]?.count || 0,
        messagesWeek: messagesWeek[0]?.count || 0,
        messagesMonth: messagesMonth[0]?.count || 0,
        replyRate: parseFloat(replyRate),
        openRate: parseFloat(openRate),
        meetingRate: parseFloat(meetingRate),
      },
      chartData,
      campaignPerformance,
      recentConversations,
      campaigns: campaignsWithCounts,
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
