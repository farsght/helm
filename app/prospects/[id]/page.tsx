export const dynamic = "force-dynamic";
import { db } from "@/db";
import { prospects, campaigns, campaignProspects, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProspectDetailClient } from "./prospect-detail-client";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospectId = parseInt(id);

  const [prospect] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!prospect) notFound();

  const campaignHistory = await db
    .select({ campaign: campaigns, enrollment: campaignProspects })
    .from(campaignProspects)
    .innerJoin(campaigns, eq(campaignProspects.campaignId, campaigns.id))
    .where(eq(campaignProspects.prospectId, prospectId));

  const prospectMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.prospectId, prospectId))
    .orderBy(messages.createdAt);

  return (
    <ProspectDetailClient
      prospect={prospect}
      campaignHistory={campaignHistory}
      messages={prospectMessages}
    />
  );
}
