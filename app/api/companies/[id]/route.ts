import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { companies, contacts, deals } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const companyId = parseInt(id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 });
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.userId, userId)));
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [relatedContacts, relatedDeals] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.companyId, companyId)),
      db.select().from(deals).where(eq(deals.companyId, companyId)),
    ]);

    return NextResponse.json({ company, contacts: relatedContacts, deals: relatedDeals });
  } catch (err) {
    console.error('Fetch company error:', err);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const companyId = parseInt(id);
    const body = await request.json();

    const [updated] = await db
      .update(companies)
      .set({
        name: body.name,
        domain: body.domain ?? null,
        industry: body.industry ?? null,
        employeeCount: body.employeeCount ?? null,
        sizeBand: body.sizeBand ?? null,
        website: body.website ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        location: body.location ?? null,
        description: body.description ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update company error:', err);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const companyId = parseInt(id);
    const result = await db
      .delete(companies)
      .where(and(eq(companies.id, companyId), eq(companies.userId, userId)))
      .returning({ id: companies.id });
    if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete company error:', err);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
