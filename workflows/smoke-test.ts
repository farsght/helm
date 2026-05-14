/**
 * Smoke test workflow for the Vercel Workflow SDK pipeline.
 *
 * Demonstrates the three primitives:
 *   1. Step function (`"use step"`) — retryable unit of business logic
 *   2. Workflow function (`"use workflow"`) — orchestrator over steps + sleep
 *   3. `sleep()` — durable suspension (no compute cost while paused)
 *
 * Trigger via:  POST /api/workflows/test  with { email }
 * Observe via:  npx workflow web   (local)  or Vercel dashboard (prod)
 *
 * Delete this file (and the trigger route) once you've verified the pipeline
 * works end-to-end and a real workflow (e.g., campaign nurture) is in place.
 */

import { sleep, FatalError } from "workflow";

async function logToConsole(email: string, message: string) {
  "use step";
  // In a real step you'd hit Resend / Sentry / the DB. This just demonstrates
  // that steps run on a separate request and their output is captured by
  // Workflow observability.
  console.log(`[workflow-test] ${message}`, { email });
  return { ok: true, ts: Date.now() };
}

async function validateEmail(email: string) {
  "use step";
  if (!email.includes("@")) {
    // FatalError is the escape hatch: skip retries and fail the workflow.
    throw new FatalError(`Invalid email: ${email}`);
  }
  return { valid: true };
}

export async function smokeTestWorkflow(email: string) {
  "use workflow";

  await validateEmail(email);
  await logToConsole(email, "Step 1 — workflow started");

  // Suspend for 30 seconds. Real campaign sequences would `sleep("3 days")` etc.
  // Compute cost during sleep: zero.
  await sleep("30 seconds");

  await logToConsole(email, "Step 2 — resumed after 30s sleep");

  return { email, status: "completed" };
}
