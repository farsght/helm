import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { deals, dealContacts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(sql`${deals.createdAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch deals error:', err);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const [created] = await db.insert(deals).values({
      userId,
      name: body.name,
      companyId: body.companyId ?? null,
      primaryContactId: body.primaryContactId ?? null,
      stage: body.stage ?? 'discovery',
      amountCents: body.amountCents ?? null,
      currency: body.currency ?? 'USD',
      probability: body.probability ?? null,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      source: body.source ?? null,
      description: body.description ?? null,
    }).returning();

    // If a primary contact was passed, auto-add to deal_contacts join
    if (body.primaryContactId) {
      await db.insert(dealContacts).values({
        dealId: created.id,
        contactId: body.primaryContactId,
        role: 'champion',
      }).onConflictDoNothing();
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Create deal error:', err);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
