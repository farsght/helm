import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { pipelines, pipelineNodes, pipelineEdges } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyOwnership(pipelineId: number, userId: string) {
  const [p] = await db.select().from(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.userId, userId)));
  return p ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  const nodes = await db.select().from(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
  const edges = await db.select().from(pipelineEdges).where(eq(pipelineEdges.pipelineId, pipelineId));
  return NextResponse.json({ nodes, edges });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pipelineId = parseInt(id);
  if (!await verifyOwnership(pipelineId, userId)) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

  try {
    const { nodes, edges } = await request.json();

    await db.delete(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
    await db.delete(pipelineEdges).where(eq(pipelineEdges.pipelineId, pipelineId));

    const nodeIdMap: Record<string, number> = {};
    if (Array.isArray(nodes) && nodes.length > 0) {
      for (const node of nodes as Array<{
        id?: string | number;
        data: { type: string; label: string; config?: Record<string, unknown> };
        position: { x: number; y: number };
      }>) {
        const [inserted] = await db.insert(pipelineNodes).values({
          pipelineId,
          type: node.data.type,
          label: node.data.label,
          configJson: JSON.stringify(node.data.config || {}),
          positionX: node.position.x,
          positionY: node.position.y,
        }).returning();
        if (node.id !== undefined) nodeIdMap[String(node.id)] = inserted.id;
      }
    }

    if (Array.isArray(edges) && edges.length > 0) {
      await db.insert(pipelineEdges).values(
        edges.map((e: { source: string; target: string; label?: string }) => ({
          pipelineId,
          sourceNodeId: nodeIdMap[String(e.source)] ?? parseInt(String(e.source)),
          targetNodeId: nodeIdMap[String(e.target)] ?? parseInt(String(e.target)),
          label: e.label ?? null,
        }))
      );
    }

    await db.update(pipelines).set({ updatedAt: new Date() }).where(eq(pipelines.id, pipelineId));

    const newNodes = await db.select().from(pipelineNodes).where(eq(pipelineNodes.pipelineId, pipelineId));
    const newEdges = await db.select().from(pipelineEdges).where(eq(pipelineEdges.pipelineId, pipelineId));
    return NextResponse.json({ nodes: newNodes, edges: newEdges });
  } catch (err) {
    console.error('Save pipeline canvas error:', err);
    return NextResponse.json({ error: 'Failed to save canvas' }, { status: 500 });
  }
}
