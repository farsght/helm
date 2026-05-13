import { NextResponse } from 'next/server';
import { db } from '@/db';
import { campaignProspects, campaigns } from '@/db/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();

    // Find prospects whose wait period has elapsed
    const due = await db
      .select()
      .from(campaignProspects)
      .where(and(
        eq(campaignProspects.status, 'active'),
        isNotNull(campaignProspects.nextRunAt),
        lte(campaignProspects.nextRunAt, now)
      ));

    // Clear nextRunAt so the execute route will process them
    for (const cp of due) {
      await db
        .update(campaignProspects)
        .set({ nextRunAt: null })
        .where(eq(campaignProspects.id, cp.id));

      // Trigger execute for this campaign
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, cp.campaignId));

      if (campaign?.status === 'active') {
        console.log(`[CRON] Processing campaign ${cp.campaignId} prospect ${cp.prospectId}`);
      }
    }

    return NextResponse.json({ processed: due.length, timestamp: now.toISOString() });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
