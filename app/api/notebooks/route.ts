import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { notebooks, notebookCells } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db.select().from(notebooks).where(eq(notebooks.userId, userId)).orderBy(sql`${notebooks.createdAt} DESC`);

    // Attach cell count
    const result = await Promise.all(
      rows.map(async (nb) => {
        const cells = await db.select({ id: notebookCells.id }).from(notebookCells).where(eq(notebookCells.notebookId, nb.id));
        return { ...nb, cellCount: cells.length };
      })
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error('Fetch notebooks error:', err);
    return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [notebook] = await db.insert(notebooks).values({
      userId,
      name: body.name || 'New Notebook',
      description: body.description ?? null,
      language: body.language ?? 'javascript',
    }).returning();
    return NextResponse.json(notebook, { status: 201 });
  } catch (err) {
    console.error('Create notebook error:', err);
    return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 });
  }
}
