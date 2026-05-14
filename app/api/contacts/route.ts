import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(sql`${contacts.createdAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch contacts error:', err);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 });
    }
    const [created] = await db.insert(contacts).values({
      userId,
      companyId: body.companyId ?? null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email ?? null,
      title: body.title ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      phone: body.phone ?? null,
      location: body.location ?? null,
      lifecycleStage: body.lifecycleStage ?? 'lead',
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Create contact error:', err);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
