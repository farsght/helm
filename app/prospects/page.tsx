import { db } from "@/db";
import { prospects, campaignProspects, campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProspectsClient } from "./prospects-client";

export default async function ProspectsPage() {
  const allProspects = await db.select().from(prospects).limit(100);

  // Get campaign info for each prospect
  const prospectCampaigns = await Promise.all(
    allProspects.map(async (prospect) => {
      const enrollment = await db
        .select({
          campaign: campaigns,
          status: campaignProspects.status,
        })
        .from(campaignProspects)
        .innerJoin(campaigns, eq(campaignProspects.campaignId, campaigns.id))
        .where(eq(campaignProspects.prospectId, prospect.id))
        .limit(1);
      return { prospectId: prospect.id, campaign: enrollment[0] };
    })
  );

  const prospectsWithCampaigns = allProspects.map(prospect => {
    const campaignInfo = prospectCampaigns.find(pc => pc.prospectId === prospect.id);
    return {
      ...prospect,
      campaignName: campaignInfo?.campaign?.campaign.name || null,
      campaignStatus: campaignInfo?.campaign?.status || null,
    };
  });

  return <ProspectsClient initialProspects={prospectsWithCampaigns} />;
}
