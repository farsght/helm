import { db } from "@/db";
import { campaigns, workflowNodes, workflowEdges, campaignProspects, prospects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Play, Pause } from "lucide-react";
import { CampaignCanvas } from "@/components/campaign-canvas";

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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#3A3A40] bg-[#1B1B1F]">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
              <Badge
                variant={campaign.status === 'active' ? 'default' : 'secondary'}
                className={
                  campaign.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-400'
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="canvas" className="h-full flex flex-col">
          <TabsList className="px-6 bg-[#1B1B1F] border-b border-[#3A3A40] rounded-none h-12">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({enrolledProspects.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="flex-1 m-0 p-0">
            <CampaignCanvas
              campaignId={campaignId}
              initialNodes={nodes}
              initialEdges={edges}
            />
          </TabsContent>

          <TabsContent value="prospects" className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Enrolled Prospects</h2>
                <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
                  Add Prospects
                </Button>
              </div>
              {enrolledProspects.length === 0 ? (
                <p className="text-gray-400">No prospects enrolled yet</p>
              ) : (
                <div className="space-y-2">
                  {enrolledProspects.map(({ prospect, enrollment }) => (
                    <div
                      key={prospect.id}
                      className="p-4 rounded-lg bg-[#25252A] border border-[#3A3A40] hover:border-[#266DF0] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">
                            {prospect.firstName} {prospect.lastName}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {prospect.title} at {prospect.company}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
                          {enrollment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Messages</h2>
            <p className="text-gray-400">Messages sent in this campaign will appear here</p>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
            <p className="text-gray-400">Campaign analytics and performance metrics</p>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
            <p className="text-gray-400">Campaign configuration and settings</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
