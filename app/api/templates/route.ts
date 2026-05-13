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
    const [template] = await db.insert(templates).values({
      userId,
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
