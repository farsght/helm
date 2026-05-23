import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { pipelines } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db.select().from(pipelines).where(eq(pipelines.userId, userId)).orderBy(sql`${pipelines.createdAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch pipelines error:', err);
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [pipeline] = await db.insert(pipelines).values({
      userId,
      name: body.name || 'New Pipeline',
      description: body.description ?? null,
      status: 'draft',
    }).returning();
    return NextResponse.json(pipeline, { status: 201 });
  } catch (err) {
    console.error('Create pipeline error:', err);
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
  }
}
