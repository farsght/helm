export const dynamic = "force-dynamic";
import { ProspectDetailClient } from "./prospect-detail-client";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProspectDetailClient id={id} />;
}
