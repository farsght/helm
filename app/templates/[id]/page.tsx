export const dynamic = "force-dynamic";
import { db } from '@/db';
import { templates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { TemplateDetailClient } from './template-detail-client';

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templateId = parseInt(id, 10);

  const template = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);

  if (!template[0]) {
    notFound();
  }

  return <TemplateDetailClient template={template[0]} />;
}
