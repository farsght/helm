import { NextResponse } from 'next/server';
import { db } from '@/db';
import { templateVariants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { variantId } = await params;
    const id = parseInt(variantId, 10);
    const body = await request.json();

    const result = await db
      .update(templateVariants)
      .set({
        name: body.name,
        subject: body.subject || null,
        body: body.body,
      })
      .where(eq(templateVariants.id, id))
      .returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('Update variant error:', err);
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { variantId } = await params;
    const id = parseInt(variantId, 10);

    await db.delete(templateVariants).where(eq(templateVariants.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete variant error:', err);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  }
}
