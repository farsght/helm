import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { contacts, dealContacts, deals } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const contactId = parseInt(id);
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
    if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Deals this contact is on
    const relatedDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        amountCents: deals.amountCents,
        currency: deals.currency,
      })
      .from(dealContacts)
      .innerJoin(deals, eq(dealContacts.dealId, deals.id))
      .where(eq(dealContacts.contactId, contactId));

    return NextResponse.json({ contact, deals: relatedDeals });
  } catch (err) {
    console.error('Fetch contact error:', err);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const [updated] = await db
      .update(contacts)
      .set({
        companyId: body.companyId ?? null,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email ?? null,
        title: body.title ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        phone: body.phone ?? null,
        location: body.location ?? null,
        lifecycleStage: body.lifecycleStage ?? 'lead',
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, parseInt(id)), eq(contacts.userId, userId)))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update contact error:', err);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, parseInt(id)), eq(contacts.userId, userId)))
      .returning({ id: contacts.id });
    if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete contact error:', err);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
