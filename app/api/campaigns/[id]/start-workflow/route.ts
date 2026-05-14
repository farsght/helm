import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { start } from "workflow/api";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  campaignProspects,
  prospects,
} from "@/db/schema";
import { campaignSequenceWorkflow } from "@/workflows/campaign-sequence";

/**
 * Kick off the durable campaign sequence workflow for every active prospect
 * in this campaign. Returns immediately with a list of workflow run IDs;
 * each prospect's journey then runs asynchronously in the Workflow runtime.
 *
 *   POST /api/campaigns/:id/start-workflow
 *
 * This is the workflow-based replacement for /execute. The legacy endpoint
 * still works (polling-based); migrate campaigns one at a time and verify
 * before deleting /execute.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaignId = parseInt(id, 10);
  if (Number.isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  // Verify ownership + active status before spawning any workflows.
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json(
      { error: `Campaign not active (status=${campaign.status})` },
      { status: 400 }
    );
  }

  // Pull every active enrollment.
  const enrollments = await db
    .select({
      cpId: campaignProspects.id,
      prospectId: campaignProspects.prospectId,
      email: prospects.email,
    })
    .from(campaignProspects)
    .innerJoin(prospects, eq(campaignProspects.prospectId, prospects.id))
    .where(
      and(
        eq(campaignProspects.campaignId, campaignId),
        eq(campaignProspects.status, "active")
      )
    );

  if (enrollments.length === 0) {
    return NextResponse.json({
      ok: true,
      started: 0,
      message: "No active prospects to enroll",
    });
  }

  // Spawn one workflow per prospect. start() returns immediately with a
  // handle — the workflow runtime owns the journey from here.
  const runs: { prospectId: number; runId: string }[] = [];
  const errors: { prospectId: number; error: string }[] = [];

  for (const e of enrollments) {
    try {
      const run = await start(campaignSequenceWorkflow, [
        campaignId,
        e.prospectId,
        e.cpId,
      ]);
      runs.push({ prospectId: e.prospectId, runId: run.runId });
    } catch (err) {
      errors.push({
        prospectId: e.prospectId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    campaignId,
    started: runs.length,
    failed: errors.length,
    runs,
    errors: errors.length > 0 ? errors : undefined,
  });
}
