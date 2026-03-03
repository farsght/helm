import { db } from "@/db";
import { prospects, campaignProspects, campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Download } from "lucide-react";

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Prospects</h1>
          <p className="text-gray-400 mt-1">Manage your prospect database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            className="border-[#3A3A40] text-gray-400 hover:text-white hover:bg-[#25252A]"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="bg-[#266DF0] hover:bg-[#1a5ac9] text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
        </div>
      </div>

      <Card className="bg-[#25252A] border-[#3A3A40]">
        <Table>
          <TableHeader>
            <TableRow className="border-[#3A3A40] hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Company</TableHead>
              <TableHead className="text-gray-400">Title</TableHead>
              <TableHead className="text-gray-400">Industry</TableHead>
              <TableHead className="text-gray-400">Campaign</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProspects.map((prospect) => {
              const campaignInfo = prospectCampaigns.find(pc => pc.prospectId === prospect.id);
              return (
                <TableRow key={prospect.id} className="border-[#3A3A40] hover:bg-[#1B1B1F]">
                  <TableCell className="text-white font-medium">
                    {prospect.firstName} {prospect.lastName}
                  </TableCell>
                  <TableCell className="text-gray-400">{prospect.email}</TableCell>
                  <TableCell className="text-gray-400">{prospect.company}</TableCell>
                  <TableCell className="text-gray-400">{prospect.title}</TableCell>
                  <TableCell className="text-gray-400">{prospect.industry}</TableCell>
                  <TableCell className="text-gray-400">
                    {campaignInfo?.campaign?.campaign.name || "—"}
                  </TableCell>
                  <TableCell>
                    {campaignInfo?.campaign ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                        {campaignInfo.campaign.status}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-500/10 text-gray-400">
                        Not enrolled
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
