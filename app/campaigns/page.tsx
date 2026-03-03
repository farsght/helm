import { db } from "@/db";
import { campaigns, campaignProspects, workflowNodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Play, Pause, Target } from "lucide-react";

export default async function CampaignsPage() {
  const allCampaigns = await db.select().from(campaigns).orderBy(sql`${campaigns.createdAt} DESC`);

  // Get prospect counts for each campaign
  const prospectCounts = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(campaignProspects)
        .where(eq(campaignProspects.campaignId, campaign.id));
      return { campaignId: campaign.id, count: count[0]?.count || 0 };
    })
  );

  // Get step counts
  const stepCounts = await Promise.all(
    allCampaigns.map(async (campaign) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowNodes)
        .where(eq(workflowNodes.campaignId, campaign.id));
      return { campaignId: campaign.id, count: count[0]?.count || 0 };
    })
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-1">Manage your outreach campaigns</p>
        </div>
        <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {allCampaigns.length === 0 ? (
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-md mb-6">
              Create your first campaign to start automating your outreach
            </p>
            <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allCampaigns.map((campaign) => {
            const prospectCount = prospectCounts.find(p => p.campaignId === campaign.id)?.count || 0;
            const stepCount = stepCounts.find(s => s.campaignId === campaign.id)?.count || 0;

            return (
              <Card key={campaign.id} className="bg-[#25252A] border-[#3A3A40] hover:border-[#266DF0] transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white">{campaign.name}</CardTitle>
                      <CardDescription className="text-gray-400 mt-2">
                        {campaign.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={campaign.status === 'active' ? 'default' : 'secondary'}
                      className={
                        campaign.status === 'active'
                          ? 'bg-green-500/10 text-green-500'
                          : campaign.status === 'draft'
                          ? 'bg-gray-500/10 text-gray-400'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Prospects</span>
                    <span className="text-white font-medium">{prospectCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Steps</span>
                    <span className="text-white font-medium">{stepCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Reply Rate</span>
                    <span className="text-white font-medium">0%</span>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-[#3A3A40]">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-gray-400 hover:text-white hover:bg-[#3A3A40]"
                    >
                      {campaign.status === 'active' ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </>
                      )}
                    </Button>
                    <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                      <Button
                        size="sm"
                        className="w-full bg-[#266DF0] hover:bg-[#1a5ac9] text-white"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
