import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { companies } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.userId, userId))
      .orderBy(sql`${companies.createdAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch companies error:', err);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const [created] = await db.insert(companies).values({
      userId,
      name: body.name,
      domain: body.domain ?? null,
      industry: body.industry ?? null,
      employeeCount: body.employeeCount ?? null,
      sizeBand: body.sizeBand ?? null,
      website: body.website ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      location: body.location ?? null,
      description: body.description ?? null,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Create company error:', err);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
