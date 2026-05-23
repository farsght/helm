import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { campaigns, workflowNodes, workflowEdges } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateWorkflowGraph } from '@/lib/workflow-graph-validator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const campaignId = parseInt(id);

    // Validate workflow graph before allowing activation. Invalid graphs
    // can't be safely executed (cycles, dangling edges, etc.), so we hard-
    // block here instead of failing at runtime. Returns 422 with the full
    // list of validation errors so the UI can surface them per-node.
    const nodes = await db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.campaignId, campaignId));
    const edges = await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.campaignId, campaignId));

    const result = validateWorkflowGraph(
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        configJson: n.configJson,
      })),
      edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        label: e.label,
        conditionJson: e.conditionJson,
      })),
    );

    if (!result.valid) {
      return NextResponse.json(
        {
          error: 'Workflow graph is invalid — fix errors before activating.',
          errors: result.errors,
        },
        { status: 422 },
      );
    }

    const [campaign] = await db.update(campaigns)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .returning();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign activated successfully'
    });
  } catch (err) {
    console.error('Activate campaign error:', err);
    return NextResponse.json({
      error: 'Failed to activate campaign',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
