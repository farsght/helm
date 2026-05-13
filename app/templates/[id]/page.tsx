export const dynamic = "force-dynamic";
import { TemplateDetailClient } from "./template-detail-client";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateDetailClient id={id} />;
}
