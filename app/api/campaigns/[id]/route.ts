import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)));
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch (err) {
    console.error('Fetch campaign error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(campaigns).where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const body = await request.json();

    // Build update object — only include defined values to avoid NOT NULL violations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.listId !== undefined) updates.listId = body.listId;
    if ('scheduleJson' in body) {
      updates.scheduleJson = body.scheduleJson ? JSON.stringify(body.scheduleJson) : null;
    }
    if ('aiPersonaJson' in body) {
      updates.aiPersonaJson = body.aiPersonaJson ? JSON.stringify(body.aiPersonaJson) : null;
    }

    const [updated] = await db
      .update(campaigns)
      .set(updates)
      .where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)))
      .returning();

    // updated can be undefined if the WHERE didn't match (race condition); fall back to existing
    return NextResponse.json(updated ?? existing);
  } catch (err) {
    console.error('Update campaign error:', err);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(campaigns).where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    await db.delete(campaigns).where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
