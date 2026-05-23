import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentSkills } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(agentSkills)
      .where(eq(agentSkills.userId, userId))
      .orderBy(sql`${agentSkills.updatedAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch skills error:', err);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 422 });
    }
    const [skill] = await db
      .insert(agentSkills)
      .values({
        userId,
        name: body.name,
        description: body.description ?? null,
        body: body.body ?? '',
        category: body.category ?? null,
      })
      .returning();
    return NextResponse.json(skill, { status: 201 });
  } catch (err) {
    console.error('Create skill error:', err);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}
