import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workflowNodes, workflowEdges } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    
    const nodes = await db.select().from(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));
    const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.campaignId, campaignId));
    
    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.error('Fetch workflow error:', err);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    const { nodes, edges } = await request.json();
    
    // Delete existing nodes and edges
    await db.delete(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));
    await db.delete(workflowEdges).where(eq(workflowEdges.campaignId, campaignId));
    
    // Insert new nodes one-by-one to build reactFlowId → dbId map
    const nodeIdMap: Record<string, number> = {};
    if (nodes && Array.isArray(nodes) && nodes.length > 0) {
      for (const node of nodes as Array<{
        id?: string | number;
        data: { type: string; label: string; config?: Record<string, unknown> };
        position: { x: number; y: number };
      }>) {
        const [inserted] = await db.insert(workflowNodes).values({
          campaignId,
          type: node.data.type,
          label: node.data.label,
          configJson: JSON.stringify(node.data.config || {}),
          positionX: node.position.x,
          positionY: node.position.y,
        }).returning();
        if (node.id !== undefined) {
          nodeIdMap[String(node.id)] = inserted.id;
        }
      }
    }

    // Get the newly inserted nodes
    const newNodes = await db.select().from(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));

    // Insert new edges using mapped IDs
    if (edges && Array.isArray(edges) && edges.length > 0) {
      await db.insert(workflowEdges).values(
        edges.map((edge: {
          source: string | number;
          target: string | number;
          condition?: Record<string, unknown>;
          label?: string;
        }) => ({
          campaignId,
          sourceNodeId: nodeIdMap[String(edge.source)] ?? parseInt(String(edge.source)),
          targetNodeId: nodeIdMap[String(edge.target)] ?? parseInt(String(edge.target)),
          conditionJson: edge.condition ? JSON.stringify(edge.condition) : null,
          label: edge.label,
        }))
      );
    }
    
    return NextResponse.json({ success: true, nodes: newNodes });
  } catch (error) {
    console.error('Workflow save error:', error);
    return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 });
  }
}
