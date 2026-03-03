import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, parseInt(id)));
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
  try {
    const { id } = await params;
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
      .where(eq(campaigns.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update campaign error:', err);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(campaigns).where(eq(campaigns.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
