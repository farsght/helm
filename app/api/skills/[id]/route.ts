import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { agentSkills } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function loadSkill(id: number, userId: string) {
  const [row] = await db.select().from(agentSkills)
    .where(and(eq(agentSkills.id, id), eq(agentSkills.userId, userId))).limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const skill = await loadSkill(Number(id), userId);
  if (!skill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(skill);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const skillId = Number(id);
  const existing = await loadSkill(skillId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === 'string') updates.name = body.name;
    if ('description' in body) updates.description = body.description;
    if (typeof body.body === 'string') updates.body = body.body;
    if ('category' in body) updates.category = body.category;
    const [updated] = await db.update(agentSkills).set(updates).where(eq(agentSkills.id, skillId)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update skill error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const skillId = Number(id);
  const existing = await loadSkill(skillId, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.delete(agentSkills).where(eq(agentSkills.id, skillId));
  return NextResponse.json({ ok: true });
}
