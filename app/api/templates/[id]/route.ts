import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { templates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [template] = await db.select().from(templates).where(eq(templates.id, parseInt(id)));
    
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
  try {
    const { id } = await params;
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
      .where(eq(templates.id, parseInt(id)))
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
  try {
    const { id } = await params;
    await db.delete(templates).where(eq(templates.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
