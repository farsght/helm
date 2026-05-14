export const dynamic = "force-dynamic";
import { PipelineDetailClient } from "./pipeline-detail-client";

export default async function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PipelineDetailClient id={id} />;
}
