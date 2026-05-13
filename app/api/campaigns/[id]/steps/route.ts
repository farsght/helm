import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns, workflowNodes } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

/**
 * GET /api/campaigns/:id/steps
 * Returns the ordered workflow nodes (steps) for the campaign sequence tab.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);

    // Verify ownership
    const [campaign] = await db
      .select({ id: campaigns.id, name: campaigns.name, status: campaigns.status })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const steps = await db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.campaignId, campaignId))
      .orderBy(asc(workflowNodes.positionY), asc(workflowNodes.positionX));

    return NextResponse.json({ campaign, steps, count: steps.length });
  } catch (err) {
    console.error('Fetch campaign steps error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign steps' }, { status: 500 });
  }
}
