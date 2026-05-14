import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';
import { or, ilike, sql, and, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const conditions = [eq(prospects.userId, userId)];

    if (search) {
      conditions.push(
        or(
          ilike(prospects.firstName, `%${search}%`),
          ilike(prospects.lastName, `%${search}%`),
          ilike(prospects.email, `%${search}%`),
          ilike(prospects.company, `%${search}%`)
        ) as ReturnType<typeof eq>
      );
    }

    const whereClause = and(...conditions);

    const allProspects = await db.select().from(prospects).where(whereClause).limit(limit).offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(prospects)
      .where(whereClause);
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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Validate required fields before hitting the DB
    if (!body.firstName || typeof body.firstName !== 'string' || !body.firstName.trim()) {
      return NextResponse.json({ error: 'firstName is required' }, { status: 400 });
    }

    const [prospect] = await db.insert(prospects).values({
      userId,
      firstName: body.firstName.trim(),
      lastName: (body.lastName ?? '').trim(),   // default to '' — column is notNull
      email: body.email ?? null,
      company: body.company ?? null,
      title: body.title ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      companyWebsite: body.companyWebsite ?? null,
      companyLinkedinUrl: body.companyLinkedinUrl ?? null,
      phone: body.phone ?? null,
      industry: body.industry ?? null,
      location: body.location ?? null,
      customFieldsJson: body.customFields ? JSON.stringify(body.customFields) : null,
    }).returning();

    if (!prospect) {
      return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 });
    }

    return NextResponse.json(prospect, { status: 201 });
  } catch (err) {
    console.error('Create prospect error:', err);
    return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 });
  }
}
