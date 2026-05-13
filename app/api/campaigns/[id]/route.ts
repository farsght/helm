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
    const [updated] = await db
      .update(campaigns)
      .set({
        name: body.name,
        description: body.description,
        status: body.status,
        scheduleJson: body.scheduleJson ? JSON.stringify(body.scheduleJson) : null,
        aiPersonaJson: body.aiPersonaJson ? JSON.stringify(body.aiPersonaJson) : null,
        listId: body.listId,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)))
      .returning();
    return NextResponse.json(updated);
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
