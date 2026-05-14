import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

/**
 * Smoke test for the Sentry pipeline (logs + exceptions).
 *
 * GET  /api/sentry-test           → emits log + warn, returns 200
 * GET  /api/sentry-test?throw=1   → throws on the server, returns 500
 *
 * Then check:
 *   • Sentry → Issues  (for the thrown error)
 *   • Sentry → Logs    (for logger.info + console.warn)
 *
 * Delete this route once you've verified events are flowing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("throw") === "1") {
    throw new Error("Sentry smoke test — server route throw");
  }

  Sentry.logger.info("User triggered test log", { log_source: "sentry_test" });
  console.warn("[sentry-test] console.warn should appear in Sentry Logs");

  return NextResponse.json({
    ok: true,
    sent: ["logger.info", "console.warn"],
    hint: "Add ?throw=1 to also test exception capture",
  });
}
