import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { templates } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [template] = await db.select().from(templates).where(and(eq(templates.id, parseInt(id)), eq(templates.userId, userId)));

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error('Fetch template error:', err);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(templates).where(and(eq(templates.id, parseInt(id)), eq(templates.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const body = await request.json();
    const [updated] = await db.update(templates)
      .set({
        name: body.name,
        channel: body.channel,
        subject: body.subject,
        body: body.body,
        variablesJson: body.variables ? JSON.stringify(body.variables) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(templates.id, parseInt(id)), eq(templates.userId, userId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update template error:', err);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const [existing] = await db.select().from(templates).where(and(eq(templates.id, parseInt(id)), eq(templates.userId, userId)));
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    await db.delete(templates).where(and(eq(templates.id, parseInt(id)), eq(templates.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
