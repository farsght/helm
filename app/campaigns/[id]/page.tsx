export const dynamic = "force-dynamic";
import { db } from "@/db";
import { campaigns, workflowNodes, workflowEdges, campaignProspects, prospects, messages } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CampaignDetailClient } from "./campaign-detail-client";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = parseInt(id);

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));

  if (!campaign) {
    notFound();
  }

  // Fetch workflow
  const nodes = await db.select().from(workflowNodes).where(eq(workflowNodes.campaignId, campaignId));
  const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.campaignId, campaignId));

  // Fetch enrolled prospects
  const enrolledProspects = await db
    .select({
      prospect: prospects,
      enrollment: campaignProspects,
    })
    .from(campaignProspects)
    .innerJoin(prospects, eq(campaignProspects.prospectId, prospects.id))
    .where(eq(campaignProspects.campaignId, campaignId));

  // Fetch messages
  const campaignMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .orderBy(sql`${messages.createdAt} DESC`);

  return (
    <CampaignDetailClient
      campaign={campaign}
      nodes={nodes}
      edges={edges}
      enrolledProspects={enrolledProspects}
      messages={campaignMessages}
    />
  );
}
