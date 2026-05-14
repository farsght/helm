import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { smokeTestWorkflow } from "@/workflows/smoke-test";

/**
 * Smoke test trigger for the Vercel Workflow SDK pipeline.
 *
 *   POST /api/workflows/test  { "email": "you@example.com" }
 *
 * Returns a run handle the workflow runtime owns. The workflow runs async —
 * this endpoint returns immediately. Observe progress via `npx workflow web`
 * locally or the Vercel dashboard in production.
 *
 * Delete this route (and workflows/smoke-test.ts) once a real workflow is in
 * place and the pipeline is verified.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email ?? "smoke-test@example.com";

  const run = await start(smokeTestWorkflow, [email]);

  return NextResponse.json({
    ok: true,
    runId: run.runId,
    message: `Workflow started — observe with 'npx workflow web' or Vercel dashboard`,
    email,
  });
}
