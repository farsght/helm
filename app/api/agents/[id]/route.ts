import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentDefinitions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function loadAgent(id: number, userId: string) {
  const [row] = await db
    .select()
    .from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, id), eq(agentDefinitions.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agent = await loadAgent(Number(id), userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const existing = await loadAgent(agentId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === 'string') updates.name = body.name;
    if ('description' in body) updates.description = body.description;
    if (typeof body.model === 'string') updates.model = body.model;
    if (typeof body.systemPrompt === 'string') updates.systemPrompt = body.systemPrompt;
    if (typeof body.userPromptTemplate === 'string') updates.userPromptTemplate = body.userPromptTemplate;
    if ('modelParams' in body) updates.modelParamsJson = body.modelParams ? JSON.stringify(body.modelParams) : null;
    if (body.outputSchema) {
      const decisions = body.outputSchema.decisions;
      if (!Array.isArray(decisions) || decisions.length === 0 || !decisions.every((d: unknown) => typeof d === 'string' && d.length > 0)) {
        return NextResponse.json({ error: 'outputSchema.decisions must be a non-empty array of strings' }, { status: 422 });
      }
      updates.outputSchemaJson = JSON.stringify({ decisions });
    }
    if (typeof body.maxTurns === 'number') updates.maxTurns = body.maxTurns;

    const [updated] = await db
      .update(agentDefinitions)
      .set(updates)
      .where(eq(agentDefinitions.id, agentId))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update agent error:', err);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const existing = await loadAgent(agentId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.delete(agentDefinitions).where(eq(agentDefinitions.id, agentId));
  return NextResponse.json({ ok: true });
}
