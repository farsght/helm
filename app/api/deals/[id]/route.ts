import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { deals, contacts, companies, dealContacts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const dealId = parseInt(id);
    const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.userId, userId)));
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [company, dealContactRows] = await Promise.all([
      deal.companyId
        ? db.select().from(companies).where(eq(companies.id, deal.companyId)).then(r => r[0] ?? null)
        : Promise.resolve(null),
      db.select({
        id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
        email: contacts.email, title: contacts.title, role: dealContacts.role,
      }).from(dealContacts).innerJoin(contacts, eq(dealContacts.contactId, contacts.id)).where(eq(dealContacts.dealId, dealId)),
    ]);

    return NextResponse.json({ deal, company, contacts: dealContactRows });
  } catch (err) {
    console.error('Fetch deal error:', err);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const [updated] = await db.update(deals).set({
      name: body.name,
      companyId: body.companyId ?? null,
      primaryContactId: body.primaryContactId ?? null,
      stage: body.stage,
      amountCents: body.amountCents ?? null,
      currency: body.currency ?? 'USD',
      probability: body.probability ?? null,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      closedAt: body.stage === 'closed_won' || body.stage === 'closed_lost' ? new Date() : null,
      source: body.source ?? null,
      description: body.description ?? null,
      updatedAt: new Date(),
    }).where(and(eq(deals.id, parseInt(id)), eq(deals.userId, userId))).returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update deal error:', err);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await db.delete(deals).where(and(eq(deals.id, parseInt(id)), eq(deals.userId, userId))).returning({ id: deals.id });
    if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete deal error:', err);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
