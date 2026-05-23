import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { templates, templateVariants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function verifyTemplateOwnership(templateId: number, userId: string) {
  const [template] = await db.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
  return template ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (!await verifyTemplateOwnership(templateId, userId)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const variants = await db.select().from(templateVariants).where(eq(templateVariants.templateId, templateId));
    return NextResponse.json(variants);
  } catch (err) {
    console.error('Get variants error:', err);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (!await verifyTemplateOwnership(templateId, userId)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const body = await request.json();

    const result = await db.insert(templateVariants).values({
      templateId,
      name: body.name,
      subject: body.subject || null,
      body: body.body,
      sendCount: 0,
      openCount: 0,
      replyCount: 0,
      clickCount: 0,
      isWinner: false,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('Create variant error:', err);
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
  }
}
