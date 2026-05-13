import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaignProspects, listMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    const body = await request.json();

    let prospectIds: number[] = body.prospectIds || [];

    // If listId provided, get all prospects from that list
    if (body.listId) {
      const members = await db
        .select({ prospectId: listMembers.prospectId })
        .from(listMembers)
        .where(eq(listMembers.listId, body.listId));
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
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
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
