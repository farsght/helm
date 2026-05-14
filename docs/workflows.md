# Vercel Workflows — ai-sdr

Last updated: 2026-05-14

Quick reference for how the Workflow SDK is wired into this Next.js app and what we'll use it for.

---

## Current state

| Piece | Status | Notes |
|---|---|---|
| `workflow` package | ✅ Installed | v4.2.4 (Vercel Workflow SDK) |
| `next.config.ts` wrap | ✅ Active | `withSentryConfig(withWorkflow(nextConfig), {...})` — order matters, see below |
| Clerk public route | ✅ Added | `/.well-known/workflow(.*)` in `proxy.ts` matcher |
| Type shim | ⚠️ Workaround | `types/workflow-next.d.ts` — upstream `workflow/next` exports map lacks `types` entry |
| Sample workflow | ✅ Smoke test + real campaign workflow | `workflows/smoke-test.ts` (delete when ready) and `workflows/campaign-sequence.ts` (production) |
| Trigger routes | ✅ Smoke + real | `POST /api/workflows/test` (delete), `POST /api/campaigns/:id/start-workflow` (production) |
| Fluid Compute (Vercel) | ⚠️ **MUST ENABLE before prod deploy** | See "Production checklist" below |

---

## Why this exists

We're adopting Vercel Workflows for **outbound campaign sequences** (multi-day, multi-touch email nurture flows) and eventually long-running ops jobs (async dataset enrichment, scheduled syncs).

The alternative — hand-rolled state machine + cron poller + retry table — is the kind of thing that eats weeks of engineering and breaks in fun ways at 3am. Workflows make `await sleep("3 days")` a single line with zero compute cost during the wait.

See also: `docs/sentry.md` (Sentry pipeline), `CHECKLIST.md` (autoupdated, ephemeral).

---

## Decisions

### Why Vercel Workflows over Inngest
- Stack consistency: we're already deep in Vercel + Next.js. Workflows are a directive-level feature, not a separate service.
- DX: `"use workflow"` / `"use step"` directives feel native to TypeScript. No event schema to maintain.
- Observability: free in the Vercel dashboard, no separate Inngest tier billing.
- Tradeoff: less event-driven sophistication than Inngest (fan-out, throttling, complex routing). Acceptable for our use cases — campaign sequences are simple linear flows.

If this stops being true (we need complex event routing, or we leave Vercel), Inngest is the next stop. Don't mix both.

### Why `withWorkflow` is wrapped INSIDE `withSentryConfig`
```ts
withSentryConfig(withWorkflow(nextConfig), { ...sentryOpts })
```
`withWorkflow` injects build-time transforms (compiles `"use workflow"` / `"use step"` directives into runtime registrations). Sentry then wraps the final composed config so source map upload and runtime instrumentation see the workflow-augmented build. Swapping the order — `withWorkflow(withSentryConfig(...))` — means Sentry never sees the workflow transforms and source maps for workflow code won't resolve.

### Why `/.well-known/workflow(.*)` is in Clerk's public route matcher
The Workflow SDK generates route handlers at `app/.well-known/workflow/*` at build time. These are how the workflow runtime resumes suspended workflows — they accept POSTs from Vercel's workflow infrastructure. If Clerk's `auth.protect()` runs on them, every workflow resume returns 401 and your campaigns silently break. Same pattern as `/monitoring` for Sentry tunneling.

### Why we have a type shim (`types/workflow-next.d.ts`)
The `workflow` package's `exports` map in `package.json` has `workflow/next → dist/next.cjs` but no `types` entry, so TS with `moduleResolution: bundler` can't find the `.d.cts` file. Tiny module declaration patches the gap. Delete the shim once upstream fixes it: https://github.com/vercel/workflow

---

## Production checklist (before first prod deploy)

1. **Enable Fluid Compute** — Vercel dashboard → ai-sdr → Settings → Functions → Fluid Compute → **On**.
   - Without it: every workflow resume = cold start = high latency + high cost.
   - With it: suspended workflows resume cheaply. The SDK is designed around this.
2. Verify the build emits `app/.well-known/workflow/` routes. Build log will show them generated.
3. Run the smoke test in preview env first: `POST <preview-url>/api/workflows/test` with `{"email":"test@example.com"}`. Watch Vercel dashboard → Functions → Workflow Runs.
4. **Delete the smoke test** (`workflows/smoke-test.ts` + `app/api/workflows/test/route.ts`) before real campaigns ship — that route is unauthenticated.

---

## How to write a workflow

Three files, three responsibilities:

```ts
// workflows/my-flow.ts — the orchestrator
import { sleep, FatalError } from "workflow";

async function sendEmail(to: string, template: string) {
  "use step";  // ← retryable unit of work, runs as a separate request
  const resp = await fetch("...", { /* ... */ });
  if (resp.status === 400) throw new FatalError("bad request");  // skip retries
  if (!resp.ok) throw new Error("transient");  // will retry with backoff
}

export async function myFlow(prospectId: string) {
  "use workflow";  // ← orchestrator, durable, can sleep
  await sendEmail(prospectId, "intro");
  await sleep("3 days");        // zero compute cost during this wait
  await sendEmail(prospectId, "followup");
  return { status: "done" };
}
```

```ts
// app/api/start-flow/route.ts — trigger
import { start } from "workflow/api";
import { myFlow } from "@/workflows/my-flow";

export async function POST(req: Request) {
  const { prospectId } = await req.json();
  const run = await start(myFlow, [prospectId]);
  return Response.json({ runId: run.runId });
}
```

---

## Smoke test

`POST /api/workflows/test` with `{"email":"test@example.com"}` triggers `smokeTestWorkflow`:
1. `validateEmail` step (throws `FatalError` if no @)
2. `logToConsole` step
3. `sleep("30 seconds")`
4. `logToConsole` step again

Observe locally with:
```bash
npx workflow web         # web UI on http://localhost:<port>
# or
npx workflow inspect runs
```

In prod: Vercel dashboard → ai-sdr → Functions → Workflow Runs.

---

## Pitfalls

1. **Don't put long-running synchronous work in step functions.** Steps have a per-request timeout (Vercel function limit). Anything > 5 min should be split into multiple steps with `sleep` between them.
2. **Don't import non-serializable values across workflow boundaries.** Workflow state is persisted between resumptions — Date, Buffer, custom classes need explicit serialization. Cookbook has a "Serializable Steps" recipe.
3. **`FatalError` vs `Error`.** Plain `Error` retries with backoff. `FatalError` skips retries and fails the workflow. Use `FatalError` for permanent failures (invalid email format, deleted user); plain `Error` for transient failures (network blip, rate limit — though see `RetryableError` for explicit backoff control).
4. **`/.well-known/workflow(.*)` must stay public in `proxy.ts`.** Same lesson as `/monitoring`. Removing it = silent workflow failure.
5. **Don't `withWorkflow(withSentryConfig(...))`.** Wrong order. Wrap workflow inner, Sentry outer.
6. **Fluid Compute is not on by default.** Enable it before going to production. Cost difference is significant.
7. **Build output cache** (if/when Turborepo enters the picture) must include `app/.well-known/workflow/**` — see SDK docs. Not relevant today; flag if we adopt Turborepo.

---

## Future plans (not implemented)

## Campaign workflow v1 (`workflows/campaign-sequence.ts`)

The first real workflow. Reads each campaign's `workflow_nodes` + `workflow_edges` graph from the DB and walks one prospect's path through it. One workflow run per prospect.

**Trigger:** `POST /api/campaigns/:id/start-workflow` (Clerk-authed; verifies campaign ownership + active status; enrolls every prospect with `status='active'` in `campaign_prospects`).

**Supported node types:**
- `email` — render template with `{{firstName}}` etc., insert into `messages`, call `sendEmail`, mark sent
- `wait` — `sleep(configJson.duration ?? "1 day")` (ISO-8601 or human strings — "PT3H", "3 days", "1 week")
- `condition` — inspect last sent message's `openedAt` / `repliedAt`, branch via edge `label` (`"yes"` / `"no"`)
- `end` — terminus

**Deferred** (workflow pauses prospect, logs warning):
linkedin_*, ai_decision, manual_task, tag, move_to_campaign.

**Side effects per step (idempotency notes):**
- `loadGraph` / `loadProspect` — read-only, safe to retry
- `sendCampaignEmail` — inserts then sends then marks. If sending fails on retry, you may get duplicate `messages` rows in `status='draft'`. Acceptable trade-off for v1; can dedup later via idempotency key on `(campaignId, prospectId, nodeId, attempt#)`.
- `updateProspectProgress` — single UPDATE, naturally idempotent
- `checkMessageStatus` — read-only

**Legacy `/execute` route still exists** — polling-based. Migrate campaigns one at a time, verify the workflow path, then delete `/execute` and its support code.

**Known limitations vs the legacy executor:**
1. Doesn't yet evaluate edge-level `conditionJson` (only node-level conditions). Edges with conditions are treated as unconditional.
2. `wait` config schema is simplified — only `duration` field. Calendar-based waits ("next Monday 9am") not supported until a custom step computes the target Date.
3. No throttling between sends. If you enroll 10k prospects, that's 10k workflows starting near-simultaneously; the `sendEmail` rate limiting would need to live in the email-sender lib or as a workflow-level semaphore. Fine for v1 with low volumes.
4. Campaign edits while prospects are running: the workflow loaded the graph at `loadGraph` time and won't see schema changes. Stop + restart the workflow if you change a live campaign's graph.

**Email sending:** `email` nodes route through `lib/email-sender.ts` (Resend backend, plain-text by default). See `docs/email.md` for full setup, deliverability checklist, and the `configJson` schema for email nodes. **You must complete the Resend DNS + warmup setup before running real campaigns.**

## Future plans (not implemented)

- **Edge-level conditions**: evaluate `workflow_edges.conditionJson` to support conditional transitions beyond just `condition` nodes.
- **LinkedIn node types**: extend the switch with `linkedin_message` / `linkedin_connection` calls (need to wire `lib/linkedin-sender` analogous to email).
- **AI decision nodes**: `ai_decision` calls into OpenAI in a step, branches on the result. Cookbook has "Durable Agent" pattern.
- **Throttling / rate limiting**: shared semaphore across all running workflows so we don't blast a domain with thousands of sends/sec.
- **Async dataset enrichment**: for imports > 10k rows, enqueue per-batch workflows with rate-limited external API calls.
- **HubSpot / Google Sheets scheduled syncs**: `sleep("1 hour")` loop replaces cron jobs.
- **Human-in-the-loop approvals**: pause a workflow on "send" button click, resume via webhook when user approves. Cookbook recipe exists.
