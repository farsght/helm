export const dynamic = "force-dynamic";
import { CampaignDetailClient } from "./campaign-detail-client";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetailClient id={id} />;
}
