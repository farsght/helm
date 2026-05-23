import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { dealContacts, deals } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const dealId = parseInt(id);
    const body = await request.json();
    const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.userId, userId)));
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    const [created] = await db.insert(dealContacts).values({
      dealId, contactId: body.contactId, role: body.role ?? null,
    }).onConflictDoNothing().returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Add deal contact error:', err);
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const dealId = parseInt(id);
    const contactId = parseInt(request.nextUrl.searchParams.get('contactId') || '');
    if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });
    const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.userId, userId)));
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    await db.delete(dealContacts).where(and(eq(dealContacts.dealId, dealId), eq(dealContacts.contactId, contactId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Remove deal contact error:', err);
    return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 });
  }
}
