import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentDefinitions, agentSkills, agentSkillLinks } from '@/db/schema';
import { and, eq, asc } from 'drizzle-orm';

async function ensureOwnedAgent(agentId: number, userId: string) {
  const [a] = await db.select().from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, agentId), eq(agentDefinitions.userId, userId))).limit(1);
  return a ?? null;
}

/** List skills attached to this agent. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agent = await ensureOwnedAgent(Number(id), userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rows = await db.select({
    skillId: agentSkills.id,
    name: agentSkills.name,
    description: agentSkills.description,
    category: agentSkills.category,
    position: agentSkillLinks.position,
    linkId: agentSkillLinks.id,
  }).from(agentSkillLinks)
    .innerJoin(agentSkills, eq(agentSkillLinks.skillId, agentSkills.id))
    .where(eq(agentSkillLinks.agentId, agent.id))
    .orderBy(asc(agentSkillLinks.position));
  return NextResponse.json(rows);
}

/** Attach (or replace ordering of) skills. Body: { skillIds: number[] } — order matters. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (!Array.isArray(body.skillIds) || !body.skillIds.every((x: unknown) => typeof x === 'number')) {
    return NextResponse.json({ error: 'skillIds must be number[]' }, { status: 422 });
  }
  const skillIds: number[] = body.skillIds;

  // Verify all skills belong to this user — prevent cross-tenant attach.
  if (skillIds.length > 0) {
    const owned = await db.select({ id: agentSkills.id }).from(agentSkills)
      .where(and(eq(agentSkills.userId, userId)));
    const ownedSet = new Set(owned.map((r) => r.id));
    for (const sid of skillIds) {
      if (!ownedSet.has(sid)) {
        return NextResponse.json({ error: `Skill ${sid} not found or not owned` }, { status: 422 });
      }
    }
  }

  // Replace links — delete + insert. Small scale, no contention concern v1.
  await db.delete(agentSkillLinks).where(eq(agentSkillLinks.agentId, agentId));
  if (skillIds.length > 0) {
    await db.insert(agentSkillLinks).values(skillIds.map((sid, position) => ({
      agentId, skillId: sid, position,
    })));
  }
  return NextResponse.json({ ok: true, count: skillIds.length });
}
