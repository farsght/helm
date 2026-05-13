export const dynamic = "force-dynamic";
import { db } from "@/db";
import { campaigns, campaignProspects, workflowNodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { CampaignsClient } from "./campaigns-client";

export default async function CampaignsPage() {
  const allCampaigns = await db.select().from(campaigns).orderBy(sql`${campaigns.createdAt} DESC`);

  const prospectCounts = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(campaignProspects)
        .where(eq(campaignProspects.campaignId, campaign.id));
      return { campaignId: campaign.id, count: count[0]?.count || 0 };
    })
  );

  const stepCounts = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowNodes)
        .where(eq(workflowNodes.campaignId, campaign.id));
      return { campaignId: campaign.id, count: count[0]?.count || 0 };
    })
  );

  const campaignsWithCounts = allCampaigns.map(campaign => ({
    ...campaign,
    prospectCount: prospectCounts.find(p => p.campaignId === campaign.id)?.count || 0,
    stepCount: stepCounts.find(s => s.campaignId === campaign.id)?.count || 0,
  }));

  return <CampaignsClient initialCampaigns={campaignsWithCounts} />;
}
