import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns, campaignProspects, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const prospectId = parseInt(id);

    const [prospect] = await db.select().from(prospects).where(and(eq(prospects.id, prospectId), eq(prospects.userId, userId)));
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

    const campaignHistory = await db
      .select({ campaign: campaigns, enrollment: campaignProspects })
      .from(campaignProspects)
      .innerJoin(campaigns, eq(campaignProspects.campaignId, campaigns.id))
      .where(eq(campaignProspects.prospectId, prospectId));

    return NextResponse.json(campaignHistory);
  } catch (err) {
    console.error('Fetch prospect campaigns error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign history' }, { status: 500 });
  }
}
