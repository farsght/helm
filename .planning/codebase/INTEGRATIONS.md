# External Integrations

**Analysis Date:** 2026-05-29

## APIs & External Services

**AI / LLM Providers:**
- OpenAI - Embeddings (`text-embedding-3-small`, 1536 dims) + LLM completions via AI SDK
  - SDK/Client: `@ai-sdk/openai` ^3.0.63 and direct `openai` ^6.25.0
  - Auth: `OPENAI_API_KEY`
  - Used in: `lib/knowledge-retrieval.ts` (embeddings), `lib/agent-runtime.ts` (via AI SDK)
  - Models: configurable via `agent_definitions.model` as `"openai:<model-id>"`

- Anthropic - LLM completions via AI SDK
  - SDK/Client: `@ai-sdk/anthropic` ^3.0.77
  - Auth: Presumed `ANTHROPIC_API_KEY` (resolved by `@ai-sdk/anthropic` package)
  - Used in: `lib/agent-runtime.ts` (`resolveModel()` function)
  - Models: configurable as `"anthropic:<model-id>"` (e.g. `anthropic:claude-3-5-sonnet-20241022`)

**Meetings Intelligence:**
- Fireflies.ai - Meeting transcript and AI summary source; GraphQL API polling
  - Endpoint: `https://api.fireflies.ai/graphql`
  - Auth: API key stored AES-256-GCM encrypted in `connections` table (`kind=fireflies`)
  - SDK/Client: Raw GraphQL fetch in `lib/pipeline-nodes/fireflies-poll.ts`
  - Used in: Pipeline `fireflies_poll` node executor (ETL source for meetings pipeline)
  - Connection retrieved via `lib/connections.ts → getConnectionForRuntime()`

**Email Sending:**
- Resend - Campaign and workflow outbound email
  - SDK/Client: `resend` ^6.12.3
  - Auth: `RESEND_API_KEY`
  - From: `RESEND_FROM_EMAIL` (optional reply-to: `RESEND_REPLY_TO`)
  - Used in: `lib/email-sender.ts` (`sendEmail()`)
  - Webhook callbacks: `/api/webhooks/email` (open/click/reply tracking)
  - Tracking: Resend sends events back via webhook; `lib/webhook.ts` handles `reply_received`

**Social Outreach (Stub):**
- LinkedIn - Planned outreach channel (OAuth credentials configured, sending is a stub)
  - OAuth: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`
  - OAuth callback: `app/api/settings/linkedin/route.ts`
  - Sending: `lib/linkedin-sender.ts` — currently stubs all sends with `console.log`
  - API: Will use `POST https://api.linkedin.com/v2/messages` with Bearer token

**Error Monitoring & Observability:**
- Sentry - Error tracking, distributed tracing, session replay, console log ingestion
  - SDK/Client: `@sentry/nextjs` ^10.53.1
  - Auth: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
  - Org/Project: `helm-gs` / `helm`
  - Server config: `sentry.server.config.ts` (100% traces dev, 10% prod; `consoleLoggingIntegration`)
  - Edge config: `sentry.edge.config.ts`
  - Client config: `instrumentation-client.ts`
  - Tunnel route: `/monitoring` (bypasses ad-blockers; must be in Clerk public routes)
  - Vercel Cron monitors: enabled via `automaticVercelMonitors` in `next.config.ts`

## Data Storage

**Databases:**
- Neon Postgres (primary database)
  - Connection: `DATABASE_URL` — must be the pooled endpoint (`-pooler` in hostname)
  - Client: `@neondatabase/serverless` + `drizzle-orm/neon-http` (see `db/index.ts`)
  - ORM: Drizzle ORM ^0.45.1 (schema: `db/schema.ts`, migrations: `db/migrations/`)
  - Extensions: `pgvector` (ivfflat cosine index on `knowledge_chunks.embedding` and `meeting_chunks.embedding`, 1536 dims)
  - Tables (35+): campaigns, prospects, segments, messages, conversations, templates, template_variants, connected_accounts, tags, prospect_tags, tasks, settings, datasets, dataset_rows, companies, contacts, deals, deal_contacts, pipelines, pipeline_nodes, pipeline_edges, pipeline_runs, pipeline_step_data, notebooks, notebook_cells, agent_definitions, agent_runs, agent_skills, agent_skill_links, mcp_servers, agent_mcp_links, knowledge_chunks, agent_knowledge_links, meetings, meeting_chunks, entities, entity_mentions, connections, prompt_runs

**File Storage:**
- Local filesystem only — Obsidian vault ingested from disk via `scripts/ingest-vault.ts`
- No object storage (S3, GCS, etc.) detected

**Caching:**
- None detected — no Redis, Upstash, or in-memory caching layer in use (despite `@upstash/box` being listed in dependencies, no imports found)

## Authentication & Identity

**Auth Provider:**
- Clerk — primary auth and user identity
  - SDK/Client: `@clerk/nextjs` ^7.3.3
  - Keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Middleware: `proxy.ts` — `clerkMiddleware` protects all routes except public exceptions
  - `userId` = Clerk subject string (not a UUID); used as `user_id` on every domain table
  - Auth pattern in routes: `const { userId } = await auth(); if (!userId) return new Response('Unauthorized', { status: 401 });`

**Public Route Exceptions (all others Clerk-protected):**
- `POST /api/cron` — Vercel Cron scheduler tick (optional `CRON_SECRET` Bearer check)
- `POST /api/webhooks/email` — Resend open/click/reply event receiver
- `GET /api/health` — Health check
- `/api/inngest(.*)` — Inngest webhook callbacks
- `/monitoring(.*)` — Sentry tunnel route
- `/.well-known/workflow(.*)` — Vercel Workflow SDK resume endpoints
- `/sign-in`, `/sign-up`

## Workflow & Job Infrastructure

**Durable Workflows:**
- Vercel Workflow SDK (`workflow` ^4.2.4) — campaign sequence execution
  - Orchestrators: `workflows/campaign-sequence.ts`, `workflows/smoke-test.ts`
  - Build integration: `withWorkflow(nextConfig)` in `next.config.ts`
  - Resume routes: `/.well-known/workflow(.*)` (must be public)
  - Platform requirement: Fluid Compute enabled in Vercel project settings
  - Sleep: `sleep("3 days")` has no compute cost during wait periods
  - Error handling: throw `FatalError` to skip retries; throw `Error` for transient retry

**Durable Background Jobs:**
- Inngest ^4.4.0 — pipeline node execution (ETL, LLM classify/embed, meetings ingestion)
  - Client: `lib/inngest/client.ts` (app ID: `helm`)
  - Functions: `lib/inngest/functions/pipeline-run.ts` (event: `helm/pipeline.run.requested`)
  - Route: `app/api/inngest/route.ts` — `maxDuration = 300s`
  - Large step outputs (>4MB) staged in `pipeline_step_data` table to bypass Inngest step limit
  - Local dev: `npm run inngest:dev` (uses `inngest-cli`)
  - Auth: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`; `INNGEST_DEV=1` for local dev

## Monitoring & Observability

**Error Tracking:**
- Sentry (see above)

**Logs:**
- `console.log/warn/error` piped to Sentry via `consoleLoggingIntegration` (server + edge)
- Pipeline run logs stored in `pipeline_runs.log_json` (array of `{ nodeId, message, level }`)
- Agent run details (prompts, decisions, tool calls, token usage) stored in `agent_runs` table
- LLM call audit trail in `prompt_runs` table (cost, latency, input/output)

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js serverless + edge functions)

**CI Pipeline:**
- Not detected (no `.github/workflows/*.yml` or other CI config found in root)

**Cron Scheduling:**
- Vercel Cron: `vercel.json` schedules `GET /api/cron` every 5 minutes (`*/5 * * * *`)

## Agent MCP Infrastructure

**MCP (Model Context Protocol):**
- HTTP MCP client: `lib/mcp-client.ts` — JSON-RPC 2.0 over HTTP+SSE
- Servers configured per-user in `mcp_servers` table; linked to agents via `agent_mcp_links`
- Auth headers stored AES-256-GCM encrypted (env-var substitution at runtime via `expandEnvVars()`)
- Tool whitelist per agent-server link via `agent_mcp_links.enabled_tools_json`
- Cortex Mac mini hosts the MCP fleet (meetings, blackboard, code-intel, etc.) over Tailscale — these are not in this repo

## Security: Credential Encryption at Rest

**Encrypted credential stores:**
- `connected_accounts.config_json` — SMTP credentials, AES-256-GCM via `lib/crypto.ts`
- `connections.secret_ciphertext` — API keys for all provider connections, AES-256-GCM via `lib/crypto/connections-crypto.ts`
- Key: `CONNECTIONS_ENCRYPTION_KEY` (32-byte hex, 64 chars); generate with `openssl rand -hex 32`
- Never read/write raw; always use `encrypt()` / `decrypt()` helpers

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/email` — Resend open/click/reply tracking events (public route, no Clerk auth)
- `POST /api/inngest` — Inngest step callbacks and event delivery (public route, signed by Inngest)
- `/.well-known/workflow(.*)` — Vercel Workflow SDK resume callbacks (public route)

**Outgoing:**
- `lib/webhook.ts` — `fireWebhook()` triggers internal events (e.g. `reply_received`) that advance campaign workflow state

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — Neon pooled Postgres endpoint
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- `CLERK_SECRET_KEY` — Clerk backend key
- `OPENAI_API_KEY` — OpenAI embeddings + LLM
- `RESEND_API_KEY` — Campaign email sending
- `CONNECTIONS_ENCRYPTION_KEY` — AES-256-GCM key for credential encryption
- `INNGEST_EVENT_KEY` — Inngest event API key
- `INNGEST_SIGNING_KEY` — Inngest webhook signature verification

**Optional env vars:**
- `FIREFLIES_API_KEY` — Fallback; primary path uses encrypted `connections` table
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` — LinkedIn OAuth
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` — Error monitoring
- `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` — Email sender identity
- `CRON_SECRET` — Bearer token for cron endpoint in production
- `INNGEST_DEV=1` — Enables local Inngest dev mode

**Secrets location:**
- `.env.local` (local dev, gitignored)
- Vercel environment variables (production)
- `.env.example` (template only, no real values)

---

*Integration audit: 2026-05-29*
