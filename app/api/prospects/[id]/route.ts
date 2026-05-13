import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, parseInt(id)));
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
  try {
    const { id } = await params;
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
      .where(eq(prospects.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update prospect error:', err);
    return NextResponse.json({ error: 'Failed to update prospect' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(prospects).where(eq(prospects.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete prospect error:', err);
    return NextResponse.json({ error: 'Failed to delete prospect' }, { status: 500 });
  }
}
