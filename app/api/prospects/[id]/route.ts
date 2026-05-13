import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [prospect] = await db.select().from(prospects).where(and(eq(prospects.id, parseInt(id)), eq(prospects.userId, userId)));
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }
    return NextResponse.json(prospect);
  } catch (err) {
    console.error('Fetch prospect error:', err);
    return NextResponse.json({ error: 'Failed to fetch prospect' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(prospects).where(and(eq(prospects.id, parseInt(id)), eq(prospects.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

    const body = await request.json();
    const [updated] = await db
      .update(prospects)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        company: body.company,
        title: body.title,
        linkedinUrl: body.linkedinUrl,
        phone: body.phone,
        industry: body.industry,
        location: body.location,
        updatedAt: new Date(),
      })
      .where(and(eq(prospects.id, parseInt(id)), eq(prospects.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update prospect error:', err);
    return NextResponse.json({ error: 'Failed to update prospect' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(prospects).where(and(eq(prospects.id, parseInt(id)), eq(prospects.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

    await db.delete(prospects).where(and(eq(prospects.id, parseInt(id)), eq(prospects.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete prospect error:', err);
    return NextResponse.json({ error: 'Failed to delete prospect' }, { status: 500 });
  }
}
