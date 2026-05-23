import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentDefinitions, agentKnowledgeLinks, datasets } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function ensureOwnedAgent(agentId: number, userId: string) {
  const [a] = await db.select().from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, agentId), eq(agentDefinitions.userId, userId))).limit(1);
  return a ?? null;
}

/** List knowledge dataset links for this agent. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agent = await ensureOwnedAgent(Number(id), userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rows = await db.select({
    id: agentKnowledgeLinks.id,
    datasetId: agentKnowledgeLinks.datasetId,
    datasetName: datasets.name,
    pathPrefix: agentKnowledgeLinks.pathPrefix,
    filterJson: agentKnowledgeLinks.filterJson,
    topK: agentKnowledgeLinks.topK,
    createdAt: agentKnowledgeLinks.createdAt,
  }).from(agentKnowledgeLinks)
    .innerJoin(datasets, eq(agentKnowledgeLinks.datasetId, datasets.id))
    .where(eq(agentKnowledgeLinks.agentId, agent.id));
  return NextResponse.json(rows);
}

/** Attach a dataset. Body: { datasetId: number, pathPrefix?: string, topK?: number } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (typeof body.datasetId !== 'number') {
    return NextResponse.json({ error: 'datasetId must be number' }, { status: 422 });
  }
  const pathPrefix: string | null = typeof body.pathPrefix === 'string' ? body.pathPrefix : null;
  const topK: number | null = typeof body.topK === 'number' ? body.topK : null;

  // Verify dataset ownership.
  const [ds] = await db.select().from(datasets)
    .where(and(eq(datasets.id, body.datasetId), eq(datasets.userId, userId))).limit(1);
  if (!ds) return NextResponse.json({ error: 'Dataset not found' }, { status: 422 });

  const [link] = await db.insert(agentKnowledgeLinks)
    .values({ agentId, datasetId: body.datasetId, pathPrefix, topK })
    .onConflictDoNothing({ target: [agentKnowledgeLinks.agentId, agentKnowledgeLinks.datasetId] })
    .returning();

  if (!link) {
    const [existing] = await db.select().from(agentKnowledgeLinks)
      .where(and(eq(agentKnowledgeLinks.agentId, agentId), eq(agentKnowledgeLinks.datasetId, body.datasetId)))
      .limit(1);
    return NextResponse.json(existing, { status: 200 });
  }
  return NextResponse.json(link, { status: 201 });
}

/** Detach a dataset. Body: { datasetId: number } */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (typeof body.datasetId !== 'number') {
    return NextResponse.json({ error: 'datasetId must be number' }, { status: 422 });
  }
  await db.delete(agentKnowledgeLinks)
    .where(and(eq(agentKnowledgeLinks.agentId, agentId), eq(agentKnowledgeLinks.datasetId, body.datasetId)));
  return NextResponse.json({ ok: true });
}
