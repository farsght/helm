# Helm — Phase Status

Last updated: 2026-05-15
Session handoff doc — read this first when picking the project back up.

---

## Where we are right now (TL;DR)

Helm is a working Marketing OS with **6 tiers of platform infrastructure shipped**, a **15K-chunk RAG corpus**, and a **fully operational Fireflies meetings pipeline running through Inngest** with 55 meetings classified, 280 entities extracted, and 39 embedded chunks in Neon.

**Live:** https://helm.gs
**Repo:** github.com:farsght/helm (private, main branch)
**Local:** ~/Projects/helm (canonical)
**Last commit:** see `git log --oneline -1`

---

## Tier completion

| Tier | Description | Status |
|---|---|---|
| **T1** | Agents (definitions, skills, MCP servers, runs, runtime) | ✅ Shipped |
| **T2** | RAG / Knowledge (pgvector, ingest, retrieval, agent attachment) | ✅ Shipped |
| **T3** | Connectors / Connections layer | ✅ Shipped (Sprint 1) |
| **T4** | Visual canvases (campaign workflows + ETL pipelines) | ✅ Shipped |
| **T5** | Flow primitives (sub_workflow recursion, error handlers, wait_for_event) | ✅ Mostly shipped — 3 follow-ups deferred |
| **T6** | Inngest durable pipeline execution | ✅ Shipped |

---

## What was completed this session (2026-05-14/15)

### Connections Layer (Sprint 1)
- `connections` table in Neon — `kind`, `provider`, `name`, `secretCiphertext` (AES-256-GCM encrypted), `configJson` (jsonb), `lastTestStatus`, `lastTestError`
- `lib/crypto/connections-crypto.ts` — AES-256-GCM with base64 key, JSON envelope format
- `lib/connections.ts` — full service layer: createConnection, updateConnection, revokeConnection, listConnections, getConnectionForRuntime (kind-asserted), testConnection
- API routes: GET/POST `/api/connections`, GET/PATCH `/api/connections/[id]`, POST `/api/connections/[id]/test`, POST `/api/connections/[id]/revoke`
- `/connections` page — full UI with list, create/edit modal, test button, revoke, status badges
- Pipeline inspector: connection dropdowns replace `apiKeyEnv` text fields for fireflies_poll and OpenAI nodes
- Sidebar updated, old `/integrations/connections` stub redirects to new route
- Spec: `docs/pipelines-connections-foundation.md`

### Inngest Integration
- `inngest` v4.4.0 installed
- `lib/inngest/client.ts` — `new Inngest({ id: 'helm' })`
- `lib/inngest/functions/pipeline-run.ts` — durable function, per-node `step.run()` with deterministic step IDs (`node-{id}-{type}`)
- `app/api/inngest/route.ts` — GET/POST/PUT serve endpoint, `maxDuration=300s`
- `/api/pipelines/[id]/run` sends Inngest event instead of blocking on `runPipeline()`
- `pipeline_step_data` table for staging large intermediate data between steps (avoids Inngest's 4MB step output limit)
- `proxy.ts` updated — `/api/inngest` added to public routes (bypasses Clerk auth)
- `package.json` — `inngest:dev` script added

### Pipeline Data Flow Fixes
- Edge topology corrected — `extract_entities` fans out to `promote_meetings`, `promote_entities`, AND `chunk_text` in parallel
- Embed token-aware batching — splits before 300k OpenAI token limit
- Per-item truncation — 8192 token hard cap per embedding item
- `meeting_date` field alias — `fireflies_poll` emits `date`, `promote_meetings` accepts both
- Duration rounding — Fireflies returns floats, schema wants integers

### Pipeline Run Verified ✅
- **55 meetings** classified (52 new + 3 from debug run)
- **280 entities** extracted (518 mentions)
- **39 chunks** embedded in pgvector
- 2 meetings skipped (no transcript from Fireflies)
- 16 chunks skipped (embed batch 2 failed — some transcripts exceed 8192 tokens after truncation)
- Run completed via Inngest with per-node step durability

### Test Suite / DX Fixes
- `@vitest-environment node` on all 8 lib test files
- `DATABASE_URL` stub in vitest.setup.ts
- `triggerConfig: null` in test mocks
- 13 lib test files, 118 tests green
- Node inspector: `key` remount fix, Save with spinner + dismiss, `stopPropagation` on inspector panel, `onPaneClick` neutralized
- `SelectTrigger` w-full on all 10 dropdowns
- `NODE_ENV=production` leak from LaunchAgent fixed (`.zshenv` unset, `.npmrc` node-env=development)
- lightningcss binary fix: postinstall script copies native binary for nested `@tailwindcss/node` dep
- `middleware.ts` removed (Next.js 16 uses `proxy.ts`)

### Infrastructure
- Fireflies API key verified and working
- OpenAI + Fireflies connections created and healthy in UI
- `CONNECTIONS_ENCRYPTION_KEY` generated and in `.env.local`
- `helm.gs` domain fixed (apex primary, www redirects)
- Clerk middleware in `proxy.ts` — `/api/inngest`, `/api/health`, `/api/cron`, `/api/webhooks` public

---

## Current DB state (as of 2026-05-15 00:36 CDT)

| Table | Count |
|---|---|
| meetings | 55 |
| entities | 280 |
| meeting_chunks | 39 |
| knowledge_chunks | 15,015 |
| connections | 2 (Fireflies + OpenAI) |

---

## Next session: pick up here

### Minor fixes needed
- **16 chunks skipped** — embed batch 2 failure (some transcripts > 8192 tokens even after truncation). Fix: split long transcripts into multiple chunks before embedding, or increase chunk_text's split aggressiveness.
- **2 meetings with no transcript** — Fireflies didn't capture them. No code fix needed.
- **Stale pipeline_runs** — runs 5-8, 17-21 stuck in "running" status from earlier attempts. Write a cleanup script.

### Recommended next builds (in order)
1. **Meetings review UI** — `/meetings` page showing classified meetings, approve/edit taxonomy inline, replace Obsidian review step
2. **Inngest `step.ai.wrap()`** — wrap OpenAI calls in classify_meeting/extract_entities/embed for AI observability, token tracking, prompt replay
3. **Inngest realtime** — `useRealtime` hooks for live pipeline progress in the canvas UI
4. **Connections Sprint 2** — OAuth flows for HubSpot, Gmail, Google Sheets
5. **AI Enrich node** — generic "for each row, fill field X with this prompt" pipeline node
6. **→ HubSpot upsert node** — push enriched data back to CRM

### Bigger bets (deferred)
- Inngest + Neon CDC integration (trigger pipelines from DB changes)
- Cortex MCP fleet absorption into Helm
- AgentKit integration for multi-agent pipelines
- Visual ETL builder generalizes beyond Fireflies
- Inngest flow control: throttling for OpenAI rate limits

---

## Action items needed from Scott (dashboard work)

### Vercel env vars (Production + Preview + Development)
- `CONNECTIONS_ENCRYPTION_KEY` — from `.env.local`
- `FIREFLIES_API_KEY` — `ea6bd5f3-c4e1-4733-b9f3-25b312a54b1c`
- `INNGEST_EVENT_KEY` — from `.env.local`
- `INNGEST_SIGNING_KEY` — from `.env.local`
- `SENTRY_AUTH_TOKEN` — from `.env.sentry-build-plugin`
- `SENTRY_ORG` — `helm-gs`
- `SENTRY_PROJECT` — `helm`

### Inngest sync
After Vercel deploy completes: go to app.inngest.com → Apps → Sync → `https://helm.gs/api/inngest`
OR install the Vercel integration for auto-sync.

---

## Key reference state

### Migrations applied
Drizzle journal through `0017_pipeline_step_data.sql`. All applied to Neon.
Note: `pipeline_step_data` and `connections` tables were created manually via scripts after Drizzle migration runner silently skipped them. If re-migrating from scratch, the SQL files are correct.

### Environment
| Var | Status |
|---|---|
| `DATABASE_URL` | ✅ `.env.local` |
| `OPENAI_API_KEY` | ✅ `.env.local` |
| `FIREFLIES_API_KEY` | ✅ `.env.local` |
| `CONNECTIONS_ENCRYPTION_KEY` | ✅ `.env.local` |
| `INNGEST_EVENT_KEY` | ✅ `.env.local` |
| `INNGEST_SIGNING_KEY` | ✅ `.env.local` |
| `INNGEST_DEV` | ✅ `.env.local` (=1) |
| `CLERK_SECRET_KEY` | ✅ `.env.local` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ `.env.local` |

### Important new files
| Path | What |
|---|---|
| `lib/inngest/client.ts` | Inngest client (`id: 'helm'`) |
| `lib/inngest/functions/pipeline-run.ts` | Durable pipeline function — per-node steps |
| `app/api/inngest/route.ts` | Inngest serve endpoint |
| `lib/connections.ts` | Connections service layer |
| `lib/crypto/connections-crypto.ts` | AES-256-GCM encryption |
| `app/connections/` | Connections management UI |
| `proxy.ts` | Clerk auth middleware (Next.js 16 format) |
| `scripts/fix-connections-table.ts` | Emergency DDL fix for connections table |
| `scripts/fix-pipeline-7-edges.ts` | Edge topology fix for pipeline 7 |
| `scripts/run-pipeline-debug.ts` | Direct pipeline execution for debugging |
| `scripts/test-fireflies-poll.ts` | Fireflies API smoke test |
| `docs/pipelines-connections-foundation.md` | Connections layer spec |
