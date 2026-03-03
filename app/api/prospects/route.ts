import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';

export async function GET() {
  try {
    const allProspects = await db.select().from(prospects);
    return NextResponse.json(allProspects);
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
