import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns, workflowNodes } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

async function verifyCampaignOwnership(campaignId: number, userId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
  return campaign ?? null;
}

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

    const campaign = await verifyCampaignOwnership(campaignId, userId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const steps = await db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.campaignId, campaignId))
      .orderBy(asc(workflowNodes.positionY), asc(workflowNodes.positionX));

    return NextResponse.json({
      campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
      steps,
      count: steps.length,
    });
  } catch (err) {
    console.error('Fetch campaign steps error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign steps' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns/:id/steps
 * Append a new workflow node to the campaign. Position defaults to the
 * bottom of the existing chain (max positionY + 100).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);

    const campaign = await verifyCampaignOwnership(campaignId, userId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await request.json();
    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }
    if (!body.label || typeof body.label !== 'string') {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    let positionX = typeof body.positionX === 'number' ? body.positionX : 0;
    let positionY = typeof body.positionY === 'number' ? body.positionY : undefined;

    if (positionY === undefined) {
      const existing = await db
        .select({ positionY: workflowNodes.positionY })
        .from(workflowNodes)
        .where(eq(workflowNodes.campaignId, campaignId))
        .orderBy(asc(workflowNodes.positionY));
      const maxY = existing.reduce((m, n) => Math.max(m, n.positionY), 0);
      positionY = existing.length > 0 ? maxY + 100 : 0;
      positionX = 0;
    }

    const [step] = await db
      .insert(workflowNodes)
      .values({
        campaignId,
        type: body.type,
        label: body.label,
        configJson: body.config ? JSON.stringify(body.config) : null,
        positionX,
        positionY,
      })
      .returning();

    return NextResponse.json(step, { status: 201 });
  } catch (err) {
    console.error('Create campaign step error:', err);
    return NextResponse.json({ error: 'Failed to create campaign step' }, { status: 500 });
  }
}
