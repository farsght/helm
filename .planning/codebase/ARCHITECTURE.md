<!-- refreshed: 2026-05-29 -->
# Architecture

**Analysis Date:** 2026-05-29

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    Next.js App Router (app/)                              │
│   Pages (RSC)          Client Components          API Routes              │
│  app/*/page.tsx      app/*/[domain]-client.tsx   app/api/*/route.ts      │
└────────┬──────────────────────┬───────────────────────┬──────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Business Logic (lib/)                                │
│  lib/agent-runtime.ts   lib/pipeline-engine.ts   lib/email-sender.ts     │
│  lib/workflow-graph-validator.ts   lib/knowledge-retrieval.ts             │
│  lib/knowledge-ingest.ts   lib/mcp-client.ts   lib/connections.ts        │
└────────┬──────────────────────┬───────────────────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────┐  ┌──────────────────────────────────────────────────┐
│ Durable Execution   │  │                Database Layer                     │
│                     │  │                                                   │
│ workflows/          │  │  db/schema.ts  (35+ tables, source of truth)      │
│ campaign-sequence   │  │  db/index.ts   (Neon serverless + Drizzle ORM)   │
│ (Vercel Workflow    │  │  db/migrations/                                   │
│  SDK "use workflow")│  └──────────────────────────────────────────────────┘
│                     │
│ lib/inngest/        │
│ functions/          │
│ pipeline-run.ts     │
│ (Inngest durable    │
│  step execution)    │
└─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App Router Pages | Server components — thin RSC wrappers, pass data to client | `app/*/page.tsx` |
| Client Components | Interactive UI, canvas editors, data grids | `app/*/[domain]-client.tsx` |
| API Routes | Auth, tenancy scoping, input validation, call lib/ | `app/api/*/route.ts` |
| Agent Runtime | Two-stage LLM invocation (tool-use loop + forced decision) | `lib/agent-runtime.ts` |
| Campaign Workflow | Durable prospect journey execution via Vercel Workflow SDK | `workflows/campaign-sequence.ts` |
| Pipeline Engine | Topological DAG runner for ETL/data pipelines | `lib/pipeline-engine.ts` |
| Pipeline Inngest | Durable per-node pipeline execution via Inngest | `lib/inngest/functions/pipeline-run.ts` |
| Workflow Validator | Pure-function strict-DAG graph validation | `lib/workflow-graph-validator.ts` |
| Email Sender | Resend-based outbound email, plain-text-first | `lib/email-sender.ts` |
| Knowledge Retrieval | Vector search (pgvector cosine) against knowledge_chunks | `lib/knowledge-retrieval.ts` |
| Knowledge Ingest | Idempotent chunk-and-embed pipeline for RAG datasets | `lib/knowledge-ingest.ts` |
| MCP Client | JSON-RPC HTTP client for external MCP tool servers | `lib/mcp-client.ts` |
| DB Layer | Neon Postgres via drizzle-orm/neon-http, pooled endpoint | `db/index.ts` |
| Auth Middleware | Clerk clerkMiddleware with public route allowlist | `proxy.ts` |
| Cron Worker | Dispatches cron-scheduled pipeline source nodes | `app/api/cron/route.ts` |

## Pattern Overview

**Overall:** Multi-tenant single-codebase Next.js App Router with strict per-user data isolation (Clerk `userId` as the tenancy key on every table and every query).

**Key Characteristics:**
- Server Components for initial render; Client Components only where interactivity is required
- API routes are thin auth+validation shells that call pure business logic in `lib/`
- Durable execution via two runtimes: Vercel Workflow SDK (campaign sequences) and Inngest (pipeline runs)
- Two separate canvas domains (campaign workflow / pipeline ETL) sharing `@xyflow/react` but with fully separate schemas, engines, and validation
- RAG retrieval injected into agent prompts at runtime via pgvector cosine similarity

## Layers

**Presentation (RSC + Client Components):**
- Purpose: Render UI, collect user input
- Location: `app/` (pages and client components)
- Contains: `page.tsx` (RSC shells), `*-client.tsx` (interactive components), canvas editors
- Depends on: `components/`, API routes via `lib/api.ts` `apiFetch()`
- Used by: Browser

**API Layer:**
- Purpose: Auth enforcement, tenancy scoping, HTTP interface to business logic
- Location: `app/api/*/route.ts`
- Contains: Next.js route handlers (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
- Depends on: `lib/`, `db/`
- Used by: Browser client components, Vercel Cron, Inngest, Resend webhooks

**Business Logic:**
- Purpose: Domain operations, durable execution, integrations
- Location: `lib/`
- Contains: Agent runtime, pipeline engine, email sender, knowledge retrieval/ingest, MCP client, graph validator, crypto
- Depends on: `db/`, external SDKs (Resend, OpenAI, Anthropic, Inngest)
- Used by: API routes, workflows, scripts

**Durable Execution:**
- Purpose: Long-running, retryable, sleep-capable workflows
- Location: `workflows/` (Vercel Workflow SDK), `lib/inngest/` (Inngest)
- Contains: Campaign sequence orchestrator, pipeline Inngest function
- Depends on: `lib/`, `db/`
- Used by: `app/api/campaigns/[id]/start-workflow/route.ts`, `app/api/pipelines/[id]/run/route.ts`

**Data:**
- Purpose: Schema definitions and DB connection
- Location: `db/`
- Contains: `schema.ts` (35+ table definitions), `index.ts` (Neon pooled client), `migrations/`
- Depends on: `@neondatabase/serverless`, `drizzle-orm`
- Used by: All lib/, API routes, workflows

## Data Flow

### Campaign Execution Path

1. User activates campaign — `POST /api/campaigns/[id]/activate` (`app/api/campaigns/[id]/activate/route.ts`) validates the workflow graph via `validateWorkflowGraph()` from `lib/workflow-graph-validator.ts`. Returns 422 with errors if invalid.
2. User starts workflow for a prospect — `POST /api/campaigns/[id]/start-workflow` triggers `campaignSequenceWorkflow()` in `workflows/campaign-sequence.ts` using the Vercel Workflow SDK.
3. The workflow loads the graph snapshot once (a `"use step"` DB read), then walks nodes in a loop. Each side-effecting operation is its own `"use step"` function: `sendCampaignEmail`, `checkMessageStatus`, `runAgentNode`, `updateProspectProgress`.
4. `wait` nodes call the SDK's `sleep()` — the workflow suspends durably with no compute cost during the wait window.
5. `ai_agent` nodes call `runAgent()` from `lib/agent-runtime.ts`, which returns a structured decision string used to select the outgoing edge.
6. Emails are sent via `sendEmail()` in `lib/email-sender.ts` (Resend API).
7. Resend open/click/reply events POST to `POST /api/webhooks/email` which updates `messages` rows.

### Agent Invocation Path

1. Agent is invoked from a workflow node, manual test, or conversation.
2. `runAgent(agentId, context)` in `lib/agent-runtime.ts` loads skills, MCP tools, and knowledge context **in parallel** via `Promise.all()`.
3. Stage A (if tools present): `generateText()` with MCP tool set — bounded loop via `stopWhen: ({ steps }) => steps.length >= maxTurns`.
4. Stage B: `generateObject()` forces a structured decision from `agent.outputSchemaJson.decisions[]`.
5. Run is logged to `agent_runs` with full input, decision, reasoning, tool calls, and token count.

### Pipeline Execution Path (UI-triggered)

1. User clicks Run on pipeline canvas — `POST /api/pipelines/[id]/run` (`app/api/pipelines/[id]/run/route.ts`) creates a `pipeline_runs` row and sends `helm/pipeline.run.requested` to Inngest.
2. Inngest receives the event and executes `lib/inngest/functions/pipeline-run.ts`. Each node runs as `step.run()` for per-node retries.
3. Large intermediate row data is staged to `pipeline_step_data` in Neon (avoids Inngest's ~4MB step output limit).
4. Cron-triggered pipelines bypass Inngest: `GET /api/cron` (`app/api/cron/route.ts`) calls `runPipeline()` in `lib/pipeline-engine.ts` directly.

### Knowledge RAG Path

1. Vault/document is ingested by `scripts/ingest-vault.ts` → `lib/knowledge-ingest.ts`. Chunks are ~800 tokens with 100-token overlap. Each chunk is embedded via `text-embedding-3-small` and stored in `knowledge_chunks` with a pgvector column.
2. At agent runtime, `loadKnowledgeContextForAgent()` calls `retrieveContext()` in `lib/knowledge-retrieval.ts`, which embeds the rendered query and runs a cosine similarity search filtered by `datasetId` and optional `pathPrefix`.
3. Retrieved chunks are formatted into a `<knowledge_context>` block and concatenated into the agent's system prompt.

**State Management:**
- Server state: Neon Postgres via Drizzle (source of truth)
- Client state: React component state and SWR/fetch patterns in client components
- Workflow state: Vercel Workflow SDK runtime (durable, survives server restarts)
- Pipeline step state: Inngest + `pipeline_step_data` staging table in Neon

## Key Abstractions

**Campaign Workflow Graph:**
- Purpose: DAG of outreach steps (email, wait, condition, ai_agent, sub_workflow, etc.) executed per prospect
- Schema: `workflow_nodes` / `workflow_edges` in `db/schema.ts`
- Validator: `lib/workflow-graph-validator.ts` (pure function, called at activate + workflow start)
- Executor: `workflows/campaign-sequence.ts`
- Node types (implemented): `email`, `wait`, `condition`, `end`, `ai_agent`, `switch`, `wait_for_event`, `sub_workflow`
- Node types (deferred/paused): `linkedin_message`, `linkedin_connection`, `linkedin_profile_view`, `ai_decision`, `manual_task`, `tag`, `move_to_campaign`

**Pipeline DAG:**
- Purpose: ETL/data transformation pipeline (Fireflies meetings absorption, dataset promotion, enrichment)
- Schema: `pipeline_nodes` / `pipeline_edges` / `pipeline_runs` / `pipeline_step_data` in `db/schema.ts`
- Executor: `lib/pipeline-engine.ts` (topological sort runner) + `lib/inngest/functions/pipeline-run.ts` (durable, UI-triggered)
- Node executors: `lib/pipeline-nodes/` (fireflies-poll, classify-meeting, extract-entities, chunk-text, embed, promote-*)
- Node types (15): `source_dataset`, `map_fields`, `filter`, `clean`, `deduplicate`, `enrich`, `ai_classify`, `split`, `run_notebook`, `promote_prospects`, `promote_companies`, `promote_contacts`, `promote_deals`, `promote_segment`, plus Fireflies-specific nodes

**Agent Definition:**
- Purpose: Reusable AI persona with model, prompts, skills, MCP tools, and knowledge attachments
- Schema: `agent_definitions` → `agent_skill_links` → `agent_skills`; `agent_mcp_links` → `mcp_servers`; `agent_knowledge_links` → `datasets`/`knowledge_chunks`
- Runtime: `lib/agent-runtime.ts` `runAgent()`

**Tenancy:**
- Every domain table has a `userId` text column (Clerk subject string)
- Every API route extracts `userId` from `auth()` before any DB read
- Every SELECT/UPDATE/DELETE includes `eq(table.userId, userId)` as a WHERE clause condition

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: All page renders
- Responsibilities: Wraps ClerkProvider, Providers (theme), SidebarProvider, AppSidebar

**Auth Middleware:**
- Location: `proxy.ts`
- Triggers: Every request matched by the Next.js `matcher`
- Public routes: `/sign-in(.*)`, `/sign-up(.*)`, `/api/webhooks(.*)`, `/api/cron(.*)`, `/api/health`, `/api/inngest(.*)`, `/monitoring(.*)`, `/.well-known/workflow(.*)`

**API Routes:**
- Location: `app/api/*/route.ts`
- Pattern: `const { userId } = await auth(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`

**Cron Scheduler:**
- Location: `app/api/cron/route.ts`
- Triggers: Vercel Cron every 5 minutes (authenticated via `CRON_SECRET`)
- Responsibilities: Scans all `pipeline_nodes` with `trigger_config.kind='cron'`, fires matching schedules

**Workflow Resume Endpoints:**
- Location: `app/.well-known/workflow/v1/` (generated by Vercel Workflow SDK)
- Triggers: Vercel Workflow SDK runtime for durable step/sleep resume

## Architectural Constraints

- **Tenancy invariant:** Every query must filter by `userId`. New tables require `userId` column. New API routes must scope every DB operation. This is the single most critical rule — there are no cross-tenant reads in any circumstance.
- **DB connection:** `DATABASE_URL` must be the pooled Neon endpoint (`-pooler` in hostname) in production. Cold starts on Vercel exhaust unpooled connections. `db/index.ts` logs a warning and uses a placeholder when unset — do NOT convert to a throw.
- **Config wrap order:** `next.config.ts` composes as `withSentryConfig(withWorkflow(nextConfig), {...})`. `withWorkflow` must be inner, Sentry must wrap the result. Swapping the order breaks workflow build-time transforms.
- **Fluid Compute:** Must be enabled in Vercel project settings for durable workflows. Without it, every resume cold-starts.
- **Global state:** `db/index.ts` exports a singleton `db` client. `lib/knowledge-retrieval.ts` holds a lazily-initialized `_openai` singleton. `lib/email-sender.ts` holds a lazily-initialized `_resend` singleton.
- **Threading:** Node.js single-threaded event loop. No worker threads. Pipeline node executors are async but sequential within a topological level.
- **Two canvas domains must not be merged:** Campaign canvas (`components/workflow/`, `workflow_nodes`, `lib/workflow-graph-validator.ts`) and Pipeline canvas (`components/pipelines/` — not yet present, canvas at `components/canvas/`, `pipeline_nodes`, `lib/pipeline-engine.ts`) have different node shapes, validation rules, and execution semantics.

## Anti-Patterns

### Cross-tenant queries without userId filter

**What happens:** Fetching records without `eq(table.userId, userId)` in the WHERE clause.
**Why it's wrong:** Leaks one tenant's data to another. The entire security model depends on this filter being present on every query.
**Do this instead:** Always include `and(eq(table.id, id), eq(table.userId, userId))` for resource lookups. See `app/api/campaigns/[id]/activate/route.ts` lines 58-64 for the correct pattern.

### Reading node config_json without runtime validation

**What happens:** Directly type-casting `JSON.parse(node.configJson)` to a typed interface without validation.
**Why it's wrong:** `workflow_nodes.config_json` and `pipeline_nodes.config_json` are raw `text` columns — Drizzle has no schema enforcement. Shape drift causes silent runtime failures.
**Do this instead:** Add a Zod schema or hand-rolled validator in the node executor for every config shape. See `workflows/campaign-sequence.ts` for the pattern of parsing config into typed variables per node type.

### Throwing instead of placeholder in db/index.ts when DATABASE_URL is unset

**What happens:** Converting the warning-and-placeholder pattern to an early throw.
**Why it's wrong:** Breaks static analysis, CI, and build tooling that import DB schema without a live connection.
**Do this instead:** Leave the warning + placeholder. Runtime calls will fail with a clear error; the module must remain importable.

### Swapping withSentryConfig/withWorkflow wrap order

**What happens:** Placing `withWorkflow` outside `withSentryConfig` in `next.config.ts`.
**Why it's wrong:** Workflow build-time transforms (`"use workflow"` / `"use step"` directives) must execute before Sentry instrumentation. Wrong order silently breaks workflow execution.
**Do this instead:** Keep `withSentryConfig(withWorkflow(nextConfig), {...})` — Workflow inner, Sentry outer.

## Error Handling

**Strategy:** Layered — fatal vs. retryable errors distinguished explicitly in durable runtimes; structured JSON error responses in API routes.

**Patterns:**
- Workflow SDK: throw `FatalError` (from `"workflow"`) to skip retries; throw standard `Error` for transient failures (retried with backoff). See `workflows/campaign-sequence.ts`.
- Inngest: throw `NonRetriableError` (from `"inngest"`) to skip retries. See `lib/inngest/functions/pipeline-run.ts`.
- API routes: return `NextResponse.json({ error: '...' }, { status: NNN })` — no unhandled exceptions reach the client.
- Agent runtime: three typed error classes — `AgentNotFoundError`, `AgentConfigError`, `AgentRuntimeError`. Config/not-found errors become `FatalError` in workflow context. See `lib/agent-runtime.ts`.
- Knowledge retrieval failures in agent runtime are non-fatal — agent runs without context rather than failing.
- MCP server individual failures are non-fatal — partial tool availability is preferred over total failure.

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` / `console.warn` throughout. Sentry captures uncaught exceptions (configured in `instrumentation.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`).

**Validation:** Zod used in agent runtime (`lib/agent-runtime.ts`) for MCP schema conversion and structured output. `lib/workflow-graph-validator.ts` is hand-rolled (no Zod). Node `configJson` parsing is largely unvalidated — see Anti-Patterns above.

**Authentication:** Clerk via `@clerk/nextjs/server`. Every protected API route: `const { userId } = await auth(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`. Public routes declared in `proxy.ts`.

**Encryption:** SMTP credentials in `connected_accounts` are AES-256-GCM encrypted via `lib/crypto.ts` / `lib/crypto/connections-crypto.ts`. Never read or write SMTP creds raw.

---

*Architecture analysis: 2026-05-29*
