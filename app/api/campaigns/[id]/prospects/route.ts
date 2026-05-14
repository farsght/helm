import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns, campaignProspects, segmentMembers, prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function verifyCampaignOwnership(campaignId: number, userId: string) {
  const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
  return campaign ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    if (!await verifyCampaignOwnership(campaignId, userId)) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const enrolledProspects = await db
      .select({ prospect: prospects, enrollment: campaignProspects })
      .from(campaignProspects)
      .innerJoin(prospects, eq(campaignProspects.prospectId, prospects.id))
      .where(eq(campaignProspects.campaignId, campaignId));

    return NextResponse.json(enrolledProspects);
  } catch (err) {
    console.error('Fetch enrolled prospects error:', err);
    return NextResponse.json({ error: 'Failed to fetch enrolled prospects' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    if (!await verifyCampaignOwnership(campaignId, userId)) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    let prospectIds: number[] = body.prospectIds || [];

    // If segmentId provided, get all prospects from that list
    if (body.segmentId) {
      const members = await db
        .select({ prospectId: segmentMembers.prospectId })
        .from(segmentMembers)
        .where(eq(segmentMembers.segmentId, body.segmentId));
      prospectIds = [...new Set([...prospectIds, ...members.map(m => m.prospectId)])];
    }

    if (prospectIds.length === 0) {
      return NextResponse.json({ error: 'No prospects specified' }, { status: 400 });
    }

    // Insert, skipping already enrolled prospects
    const enrolled: number[] = [];
    for (const prospectId of prospectIds) {
      const existing = await db
        .select({ id: campaignProspects.id })
        .from(campaignProspects)
        .where(and(
          eq(campaignProspects.campaignId, campaignId),
          eq(campaignProspects.prospectId, prospectId)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(campaignProspects).values({
          campaignId,
          prospectId,
          status: 'pending',
        });
        enrolled.push(prospectId);
      }
    }

    return NextResponse.json({ enrolled: enrolled.length, total: prospectIds.length });
  } catch (err) {
    console.error('Enroll prospects error:', err);
    return NextResponse.json({ error: 'Failed to enroll prospects' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    if (!await verifyCampaignOwnership(campaignId, userId)) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    const prospectId = body.prospectId;

    await db
      .delete(campaignProspects)
      .where(and(
        eq(campaignProspects.campaignId, campaignId),
        eq(campaignProspects.prospectId, prospectId)
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove prospect error:', err);
    return NextResponse.json({ error: 'Failed to remove prospect' }, { status: 500 });
  }
}
