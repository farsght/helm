import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { templates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allTemplates = await db.select().from(templates).where(eq(templates.userId, userId));
    return NextResponse.json(allTemplates);
  } catch (err) {
    console.error('Fetch templates error:', err);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body.body || typeof body.body !== 'string') {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const [template] = await db.insert(templates).values({
      userId,
      name: body.name.trim(),
      channel: body.channel || 'email',   // default to 'email' — column is notNull
      subject: body.subject ?? null,
      body: body.body,
      variablesJson: body.variables ? JSON.stringify(body.variables) : null,
    }).returning();

    if (!template) {
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error('Create template error:', err);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
