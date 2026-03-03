import { NextResponse } from 'next/server';
import { db } from '@/db';
import { templateVariants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    const templateId = parseInt(id, 10);
    const winnerId = parseInt(variantId, 10);

    // Reset all variants for this template
    await db
      .update(templateVariants)
      .set({ isWinner: false })
      .where(eq(templateVariants.templateId, templateId));

    // Set the winner
    const result = await db
      .update(templateVariants)
      .set({ isWinner: true })
      .where(eq(templateVariants.id, winnerId))
      .returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('Set winner error:', err);
    return NextResponse.json({ error: 'Failed to set winner' }, { status: 500 });
  }
}
