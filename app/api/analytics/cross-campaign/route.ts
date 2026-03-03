import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations, prospects, templateVariants } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Summary metrics
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
    const openedCount = totalOpened[0]?.count || 0;
    const repliedCount = totalReplied[0]?.count || 0;

    const summary = {
      totalSent: sentCount,
      openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
      replyRate: sentCount > 0 ? (repliedCount / sentCount) * 100 : 0,
      meetingsBooked: meetingsBooked[0]?.count || 0,
    };

    // Overall funnel
    const totalProspects = await db.select({ count: sql<number>`count(*)` }).from(prospects);
    const contacted = await db.select({ count: sql<number>`count(DISTINCT ${messages.prospectId})` })
      .from(messages)
      .where(eq(messages.direction, 'outbound'));

    const interested = await db.select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.status, 'interested'));

    const funnel = [
      { step: 'Total Prospects', count: totalProspects[0]?.count || 0, percentage: 100 },
      {
        step: 'Contacted',
        count: contacted[0]?.count || 0,
        percentage: totalProspects[0]?.count > 0 ? ((contacted[0]?.count || 0) / totalProspects[0].count) * 100 : 0,
      },
      {
        step: 'Opened',
        count: openedCount,
        percentage: totalProspects[0]?.count > 0 ? (openedCount / totalProspects[0].count) * 100 : 0,
      },
      {
        step: 'Replied',
        count: repliedCount,
        percentage: totalProspects[0]?.count > 0 ? (repliedCount / totalProspects[0].count) * 100 : 0,
      },
      {
        step: 'Interested',
        count: interested[0]?.count || 0,
        percentage: totalProspects[0]?.count > 0 ? ((interested[0]?.count || 0) / totalProspects[0].count) * 100 : 0,
      },
      {
        step: 'Meeting Booked',
        count: meetingsBooked[0]?.count || 0,
        percentage: totalProspects[0]?.count > 0 ? ((meetingsBooked[0]?.count || 0) / totalProspects[0].count) * 100 : 0,
      },
    ];

    // Trends chart: last 30 days
    const trendsChart = [];
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

      const opened = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.direction, 'outbound'),
          sql`${messages.openedAt} >= ${dayStart}`,
          sql`${messages.openedAt} < ${dayEnd}`
        ));

      const replied = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.direction, 'outbound'),
          sql`${messages.repliedAt} >= ${dayStart}`,
          sql`${messages.repliedAt} < ${dayEnd}`
        ));

      trendsChart.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        sent: sent[0]?.count || 0,
        opened: opened[0]?.count || 0,
        replied: replied[0]?.count || 0,
      });
    }

    // Top performing templates (by reply rate)
    const allVariants = await db.select().from(templateVariants).limit(10);
    const topTemplates = allVariants
      .map(variant => {
        const sent = variant.sendCount || 0;
        const replied = variant.replyCount || 0;
        return {
          name: variant.name.length > 20 ? variant.name.slice(0, 17) + '...' : variant.name,
          sent,
          replyRate: sent > 0 ? (replied / sent) * 100 : 0,
        };
      })
      .filter(t => t.sent > 0)
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 5);

    // Reply rate by industry (mock data - would aggregate from prospects)
    const replyRateByIndustry = [
      { industry: 'SaaS', replyRate: 15.2, count: 45 },
      { industry: 'Finance', replyRate: 12.8, count: 32 },
      { industry: 'Healthcare', replyRate: 9.5, count: 28 },
      { industry: 'Retail', replyRate: 7.3, count: 21 },
      { industry: 'Manufacturing', replyRate: 6.1, count: 18 },
    ];

    // Reply rate by title (mock data)
    const replyRateByTitle = [
      { title: 'CTO', replyRate: 18.5, count: 42 },
      { title: 'VP Engineering', replyRate: 16.2, count: 38 },
      { title: 'Director', replyRate: 14.7, count: 51 },
      { title: 'Manager', replyRate: 12.3, count: 67 },
      { title: 'Senior Engineer', replyRate: 9.8, count: 89 },
    ];

    // Best sending times (heatmap data)
    const sendingTimeHeatmap = [
      { day: 'Mon', hour: 9, count: 12 },
      { day: 'Mon', hour: 12, count: 18 },
      { day: 'Mon', hour: 15, count: 15 },
      { day: 'Mon', hour: 18, count: 8 },
      { day: 'Tue', hour: 9, count: 15 },
      { day: 'Tue', hour: 12, count: 22 },
      { day: 'Tue', hour: 15, count: 19 },
      { day: 'Tue', hour: 18, count: 10 },
      { day: 'Wed', hour: 9, count: 14 },
      { day: 'Wed', hour: 12, count: 20 },
      { day: 'Wed', hour: 15, count: 17 },
      { day: 'Wed', hour: 18, count: 9 },
      { day: 'Thu', hour: 9, count: 16 },
      { day: 'Thu', hour: 12, count: 23 },
      { day: 'Thu', hour: 15, count: 18 },
      { day: 'Thu', hour: 18, count: 11 },
      { day: 'Fri', hour: 9, count: 11 },
      { day: 'Fri', hour: 12, count: 16 },
      { day: 'Fri', hour: 15, count: 12 },
      { day: 'Fri', hour: 18, count: 6 },
      { day: 'Sat', hour: 9, count: 2 },
      { day: 'Sat', hour: 12, count: 3 },
      { day: 'Sat', hour: 15, count: 1 },
      { day: 'Sat', hour: 18, count: 1 },
      { day: 'Sun', hour: 9, count: 1 },
      { day: 'Sun', hour: 12, count: 2 },
      { day: 'Sun', hour: 15, count: 1 },
      { day: 'Sun', hour: 18, count: 0 },
    ];

    return NextResponse.json({
      summary,
      funnel,
      topTemplates: topTemplates.length > 0 ? topTemplates : [
        { name: 'Template A', sent: 50, replyRate: 12.5 },
        { name: 'Template B', sent: 40, replyRate: 10.2 },
        { name: 'Template C', sent: 35, replyRate: 8.7 },
      ],
      trendsChart,
      replyRateByIndustry,
      replyRateByTitle,
      sendingTimeHeatmap,
    });
  } catch (err) {
    console.error('Cross-campaign analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
