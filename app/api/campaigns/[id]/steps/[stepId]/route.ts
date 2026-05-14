import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns, workflowNodes, workflowEdges } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

async function verifyCampaignOwnership(campaignId: number, userId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
  return campaign ?? null;
}

async function loadOwnedStep(campaignId: number, stepId: number, userId: string) {
  if (!await verifyCampaignOwnership(campaignId, userId)) return null;
  const [step] = await db
    .select()
    .from(workflowNodes)
    .where(and(eq(workflowNodes.id, stepId), eq(workflowNodes.campaignId, campaignId)));
  return step ?? null;
}

/**
 * GET /api/campaigns/:id/steps/:stepId
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, stepId } = await params;
    const step = await loadOwnedStep(parseInt(id), parseInt(stepId), userId);
    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    return NextResponse.json(step);
  } catch (err) {
    console.error('Fetch campaign step error:', err);
    return NextResponse.json({ error: 'Failed to fetch step' }, { status: 500 });
  }
}

/**
 * PUT /api/campaigns/:id/steps/:stepId
 * Patch label, type, configJson, and/or position.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, stepId } = await params;
    const campaignId = parseInt(id);
    const nodeId = parseInt(stepId);

    const step = await loadOwnedStep(campaignId, nodeId, userId);
    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    const body = await request.json();
    const updates: Partial<typeof workflowNodes.$inferInsert> = {};
    if (typeof body.type === 'string') updates.type = body.type;
    if (typeof body.label === 'string') updates.label = body.label;
    if ('config' in body) {
      updates.configJson = body.config ? JSON.stringify(body.config) : null;
    }
    if (typeof body.positionX === 'number') updates.positionX = body.positionX;
    if (typeof body.positionY === 'number') updates.positionY = body.positionY;

    const [updated] = await db
      .update(workflowNodes)
      .set(updates)
      .where(and(eq(workflowNodes.id, nodeId), eq(workflowNodes.campaignId, campaignId)))
      .returning();

    return NextResponse.json(updated ?? step);
  } catch (err) {
    console.error('Update campaign step error:', err);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/:id/steps/:stepId
 * Removes the node. Connected edges cascade via FK.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, stepId } = await params;
    const campaignId = parseInt(id);
    const nodeId = parseInt(stepId);

    const step = await loadOwnedStep(campaignId, nodeId, userId);
    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    // Edges have onDelete: 'cascade' on both source and target FK, so the
    // delete below also drops any edges touching this node. Explicit delete
    // first guards against any edge cases / partial cascade behavior.
    await db
      .delete(workflowEdges)
      .where(
        and(
          eq(workflowEdges.campaignId, campaignId),
          or(
            eq(workflowEdges.sourceNodeId, nodeId),
            eq(workflowEdges.targetNodeId, nodeId)
          )
        )
      );
    await db
      .delete(workflowNodes)
      .where(and(eq(workflowNodes.id, nodeId), eq(workflowNodes.campaignId, campaignId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete campaign step error:', err);
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }
}
