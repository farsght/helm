import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentDefinitions, agentKnowledgeLinks } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function ensureOwnedAgent(agentId: number, userId: string) {
  const [a] = await db.select().from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, agentId), eq(agentDefinitions.userId, userId))).limit(1);
  return a ?? null;
}

/** Update a specific agent⇆dataset link. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; datasetId: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, datasetId } = await params;
  const agentId = Number(id);
  const dsId = Number(datasetId);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const patch: Partial<{ pathPrefix: string | null; topK: number | null; filterJson: unknown }> = {};
  if ('pathPrefix' in body) patch.pathPrefix = body.pathPrefix === null ? null : String(body.pathPrefix);
  if ('topK' in body) patch.topK = body.topK === null ? null : Number(body.topK);
  if ('filterJson' in body) patch.filterJson = body.filterJson;

  const [updated] = await db.update(agentKnowledgeLinks)
    .set(patch)
    .where(and(eq(agentKnowledgeLinks.agentId, agentId), eq(agentKnowledgeLinks.datasetId, dsId)))
    .returning();
  if (!updated) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  return NextResponse.json(updated);
}

/** Remove a specific agent⇆dataset link. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; datasetId: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, datasetId } = await params;
  const agentId = Number(id);
  const dsId = Number(datasetId);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(agentKnowledgeLinks)
    .where(and(eq(agentKnowledgeLinks.agentId, agentId), eq(agentKnowledgeLinks.datasetId, dsId)));
  return NextResponse.json({ ok: true });
}
