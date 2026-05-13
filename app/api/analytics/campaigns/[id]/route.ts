import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, campaignProspects, conversations, workflowNodes, templateVariants } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    // Get summary counts
    const totalEnrolled = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignProspects)
      .where(eq(campaignProspects.campaignId, campaignId));

    const contacted = await db
      .select({ count: sql<number>`count(DISTINCT ${messages.prospectId})` })
      .from(messages)
      .where(and(
        eq(messages.campaignId, campaignId),
        eq(messages.direction, 'outbound')
      ));

    const opened = await db
      .select({ count: sql<number>`count(DISTINCT ${messages.prospectId})` })
      .from(messages)
      .where(and(
        eq(messages.campaignId, campaignId),
        eq(messages.direction, 'outbound'),
        sql`${messages.openedAt} IS NOT NULL`
      ));

    const replied = await db
      .select({ count: sql<number>`count(DISTINCT ${messages.prospectId})` })
      .from(messages)
      .where(and(
        eq(messages.campaignId, campaignId),
        eq(messages.direction, 'outbound'),
        sql`${messages.repliedAt} IS NOT NULL`
      ));

    const interested = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(and(
        eq(conversations.campaignId, campaignId),
        eq(conversations.status, 'interested')
      ));

    const meetingBooked = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(and(
        eq(conversations.campaignId, campaignId),
        eq(conversations.status, 'meeting_booked')
      ));

    const summary = {
      totalEnrolled: totalEnrolled[0]?.count || 0,
      contacted: contacted[0]?.count || 0,
      opened: opened[0]?.count || 0,
      replied: replied[0]?.count || 0,
      interested: interested[0]?.count || 0,
      meetingBooked: meetingBooked[0]?.count || 0,
    };

    // Funnel data
    const funnel = [
      { step: 'Enrolled', count: summary.totalEnrolled, percentage: 100 },
      {
        step: 'Contacted',
        count: summary.contacted,
        percentage: summary.totalEnrolled > 0 ? (summary.contacted / summary.totalEnrolled) * 100 : 0,
      },
      {
        step: 'Opened',
        count: summary.opened,
        percentage: summary.totalEnrolled > 0 ? (summary.opened / summary.totalEnrolled) * 100 : 0,
      },
      {
        step: 'Replied',
        count: summary.replied,
        percentage: summary.totalEnrolled > 0 ? (summary.replied / summary.totalEnrolled) * 100 : 0,
      },
      {
        step: 'Interested',
        count: summary.interested,
        percentage: summary.totalEnrolled > 0 ? (summary.interested / summary.totalEnrolled) * 100 : 0,
      },
      {
        step: 'Meeting Booked',
        count: summary.meetingBooked,
        percentage: summary.totalEnrolled > 0 ? (summary.meetingBooked / summary.totalEnrolled) * 100 : 0,
      },
    ];

    // Activity chart: last 14 days
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activityChart = [];

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = Math.floor(date.getTime() / 1000);
      const dayEnd = dayStart + 86400;

      const sent = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.campaignId, campaignId),
          eq(messages.direction, 'outbound'),
          sql`${messages.sentAt} >= ${dayStart}`,
          sql`${messages.sentAt} < ${dayEnd}`
        ));

      const openedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.campaignId, campaignId),
          eq(messages.direction, 'outbound'),
          sql`${messages.openedAt} >= ${dayStart}`,
          sql`${messages.openedAt} < ${dayEnd}`
        ));

      const repliedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.campaignId, campaignId),
          eq(messages.direction, 'outbound'),
          sql`${messages.repliedAt} >= ${dayStart}`,
          sql`${messages.repliedAt} < ${dayEnd}`
        ));

      activityChart.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        sent: sent[0]?.count || 0,
        opened: openedCount[0]?.count || 0,
        replied: repliedCount[0]?.count || 0,
      });
    }

    // Step metrics: prospects at each workflow node
    const nodes = await db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.campaignId, campaignId));

    const stepMetrics = await Promise.all(
      nodes.map(async (node) => {
        const prospectsAtNode = await db
          .select({ count: sql<number>`count(*)` })
          .from(campaignProspects)
          .where(and(
            eq(campaignProspects.campaignId, campaignId),
            eq(campaignProspects.currentNodeId, node.id)
          ));

        // Calculate avg time from enrolledAt to first message sentAt
        const avgResult = await db.execute(sql`
          SELECT AVG(EXTRACT(EPOCH FROM (m.sent_at - cp.enrolled_at)) / 3600) AS avg_hours
          FROM campaign_prospects cp
          JOIN messages m ON m.prospect_id = cp.prospect_id AND m.campaign_id = cp.campaign_id
          WHERE cp.campaign_id = ${campaignId} AND cp.current_node_id = ${node.id}
            AND m.sent_at IS NOT NULL
        `);
        const avgHours = (avgResult.rows[0] as { avg_hours: number | null } | undefined)?.avg_hours ?? 0;

        return {
          nodeLabel: node.label,
          prospects: prospectsAtNode[0]?.count || 0,
          avgTimeHours: avgHours,
        };
      })
    );

    // Variant performance
    const variants = await db
      .select()
      .from(templateVariants)
      .innerJoin(messages, eq(messages.variantId, templateVariants.id))
      .where(eq(messages.campaignId, campaignId))
      .groupBy(templateVariants.id);

    const variantPerformance = await Promise.all(
      variants.slice(0, 5).map(async (v) => {
        const variant = v.template_variants;
        const sent = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.variantId, variant.id),
            eq(messages.campaignId, campaignId)
          ));

        const openedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.variantId, variant.id),
            eq(messages.campaignId, campaignId),
            sql`${messages.openedAt} IS NOT NULL`
          ));

        const repliedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.variantId, variant.id),
            eq(messages.campaignId, campaignId),
            sql`${messages.repliedAt} IS NOT NULL`
          ));

        const sentCount = sent[0]?.count || 0;
        const openCount = openedCount[0]?.count || 0;
        const replyCount = repliedCount[0]?.count || 0;

        return {
          variant: variant.name,
          sent: sentCount,
          opened: openCount,
          replied: replyCount,
          replyRate: sentCount > 0 ? (replyCount / sentCount) * 100 : 0,
        };
      })
    );

    return NextResponse.json({
      summary,
      funnel,
      activityChart,
      stepMetrics: stepMetrics.filter(s => s.prospects > 0),
      variantPerformance,
    });
  } catch (err) {
    console.error('Campaign analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign analytics' }, { status: 500 });
  }
}
