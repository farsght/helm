export const dynamic = "force-dynamic";
import { AgentCanvasClient } from "./agent-canvas-client";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentCanvasClient agentId={parseInt(id)} />;
}
