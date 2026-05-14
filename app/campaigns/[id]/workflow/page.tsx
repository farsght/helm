export const dynamic = "force-dynamic";
import { WorkflowCanvasClient } from "./workflow-canvas-client";

export default async function CampaignWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowCanvasClient campaignId={parseInt(id)} />;
}
