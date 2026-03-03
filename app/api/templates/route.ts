import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { templates } from '@/db/schema';

export async function GET() {
  try {
    const allTemplates = await db.select().from(templates);
    return NextResponse.json(allTemplates);
  } catch (err) {
    console.error('Fetch templates error:', err);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [template] = await db.insert(templates).values({
      name: body.name,
      channel: body.channel,
      subject: body.subject,
      body: body.body,
      variablesJson: body.variables ? JSON.stringify(body.variables) : null,
    }).returning();
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error('Create template error:', err);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
