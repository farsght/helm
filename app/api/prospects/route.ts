import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { or, ilike, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let query = db.select().from(prospects);

    if (search) {
      query = query.where(
        or(
          ilike(prospects.firstName, `%${search}%`),
          ilike(prospects.lastName, `%${search}%`),
          ilike(prospects.email, `%${search}%`),
          ilike(prospects.company, `%${search}%`)
        )
      ) as typeof query;
    }

    const allProspects = await query.limit(limit).offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(prospects);
    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      prospects: allProspects,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Fetch prospects error:', err);
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [prospect] = await db.insert(prospects).values({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      company: body.company,
      title: body.title,
      linkedinUrl: body.linkedinUrl,
      phone: body.phone,
      industry: body.industry,
      location: body.location,
      customFieldsJson: body.customFields ? JSON.stringify(body.customFields) : null,
    }).returning();
    return NextResponse.json(prospect, { status: 201 });
  } catch (err) {
    console.error('Create prospect error:', err);
    return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 });
  }
}
