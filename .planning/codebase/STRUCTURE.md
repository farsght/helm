# Project Structure

**Analysis Date:** 2026-05-29

## Top-Level Layout

```text
helm/
├── app/             # Next.js App Router — pages, layouts, and API routes
│   └── api/         # Route handlers (app/api/<feature>/route.ts)
├── components/      # React components, grouped by domain
├── config/          # Static config objects (data-table defaults)
├── db/              # Drizzle schema, Neon client, migrations, seed
├── docs/            # In-repo reference docs (workflows, email, sentry, pipelines)
├── hooks/           # Reusable React hooks (use-*.ts)
├── lib/             # Business logic, integrations, engines, utilities
├── public/          # Static assets
├── scripts/         # One-off / ops scripts (vault ingest, fixes, debug)
├── types/           # Shared TS types + ambient .d.ts shims
├── workflows/       # Vercel Workflow SDK orchestrators ("use workflow")
├── __tests__/       # Vitest test suite (mirrors source layout)
└── *.config.ts/.mjs # Root config: next, drizzle, vitest, eslint, sentry, tsconfig
```

## Directory Purposes

### `app/` — App Router (pages + API)
Pages are thin RSC shells (`page.tsx`) that render a `*-client.tsx` interactive component. One directory per domain feature:

```text
app/
├── layout.tsx                  # Root layout — ClerkProvider, Providers, SidebarProvider, AppSidebar
├── agents/        analytics/   campaigns/    companies/    connections/
├── contacts/      conversations/  datasets/  deals/        integrations/
├── notebooks/     pipelines/   prospects/    segments/     settings/
├── skills/        templates/   sign-in/      sign-up/
├── sentry-example-page/        # Sentry demo (safe to ignore)
└── api/                        # ~90 route.ts handlers (see below)
```

### `app/api/` — Route Handlers
Each `route.ts` exports HTTP-verb functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Dynamic segments use `[id]` folders. Notable groupings:

- **CRM:** `prospects/`, `companies/`, `contacts/`, `deals/`, `segments/`
- **Campaigns:** `campaigns/[id]/{activate,pause,execute,start-workflow,prospects,steps,workflow}`
- **Agents/AI:** `agents/[id]/{knowledge,mcp,skills,test}`, `agents/runs`, `ai/suggest-reply`, `messages/{send,ai-generate,ai-reply}`
- **Pipelines:** `pipelines/[id]/{canvas,run,runs,webhook/[nodeId]}`
- **Knowledge:** `datasets/[id]/{ingest,rows,search}`
- **Notebooks:** `notebooks/[id]/cells/[cellId]/run`
- **Integrations/Settings:** `connections/`, `mcp-servers/`, `settings/{accounts,general,linkedin}`, `auth/linkedin`
- **Infra / public:** `cron`, `health`, `inngest`, `webhooks/email`
- **Sentry checks:** `sentry-example-api`, `sentry-test`

### `lib/` — Business Logic
Flat `kebab-case.ts` modules plus a few subdirectories. No barrel — import each module directly (`@/lib/email-sender`).

```text
lib/
├── agent-runtime.ts             # runAgent() — skills + MCP + knowledge, two-stage LLM
├── pipeline-engine.ts           # Topological DAG runner for pipelines
├── pipeline-engine-types.ts     # Extracted pipeline types
├── workflow-graph-validator.ts  # Pure-function strict-DAG validation (campaign canvas)
├── email-sender.ts              # Resend outbound email
├── linkedin-sender.ts           # LinkedIn send (STUB)
├── knowledge-ingest.ts          # Idempotent chunk-and-embed RAG ingest
├── knowledge-retrieval.ts       # pgvector cosine retrieval, <knowledge_context> block
├── mcp-client.ts                # JSON-RPC HTTP client for MCP tool servers
├── connections.ts               # Connected-account management
├── crypto.ts  crypto/connections-crypto.ts   # AES-256-GCM cred encryption
├── cron-matcher.ts  webhook.ts  dataset-import.ts  segment-filters.ts
├── api.ts                       # Client-side apiFetch() wrapper
├── data-grid*.ts  data-table.ts  format.ts  parsers.ts  utils.ts  compose-refs.ts
├── crypto/                      # connections-crypto.ts
├── inngest/                     # client.ts + functions/ (durable pipeline execution)
└── pipeline-nodes/              # Per-node executors:
    ├── fireflies-poll.ts  classify-meeting.ts  extract-entities.ts
    ├── chunk-text.ts  embed.ts  persist-raw-pair.ts
    └── promote-{meetings,entities,chunks}.ts
```

### `components/` — React Components (grouped by domain)
```text
components/
├── ui/          # Primitive design-system components (shadcn-style)
├── page/        # PageHeader, EmptyState, ConfirmDialog (barrel: index.ts)
├── data-grid/   # DataGrid + cell variants + context menu
├── data-table/  # Lighter table primitives
├── workflow/    # Campaign canvas node types (xyflow) — ~11 node types
├── canvas/      # Pipeline canvas (xyflow) — 15 node types incl. ETL + promote_*
├── ai/          # AI-assist UI (reply suggestions, generation)
├── blocks/      # Composite page sections
└── examples/    # Demo/reference components
```

### `db/` — Data Layer
```text
db/
├── schema.ts      # 35+ table definitions — source of truth for the data model
├── index.ts       # Neon serverless + drizzle-orm/neon-http singleton client
├── migrate.ts     # tsx db/migrate.ts (npm run db:migrate)
├── seed.ts        # tsx db/seed.ts (npm run db:seed)
└── migrations/    # drizzle-kit generated SQL migrations
```

### `workflows/` — Durable Orchestrators
```text
workflows/
├── campaign-sequence.ts   # "use workflow" — per-prospect campaign journey
└── smoke-test.ts          # Workflow SDK smoke test
```

### `hooks/`, `scripts/`, `types/`, `config/`
- **`hooks/`** — `use-*.ts` React hooks. Note `use-data-grid.ts` is very large (3273 lines).
- **`scripts/`** — `ingest-vault.ts` (vault RAG ingest), `fix-*.ts` (one-off data fixes), `run-pipeline-debug.ts`, `test-fireflies-poll.ts`, `postinstall.sh`, `theme-codemod.py`.
- **`types/`** — `data-grid.ts`, `data-table.ts`, and `workflow-next.d.ts` (ambient shim patching an upstream Workflow SDK `exports` gap — delete when upstream ships `types`).
- **`config/`** — `data-table.ts` static config.

## Key File Locations

| Concern | Location |
|---------|----------|
| Auth middleware + public route allowlist | `proxy.ts` |
| Next config (Sentry ∘ Workflow wrap order) | `next.config.ts` |
| DB schema (source of truth) | `db/schema.ts` |
| DB client | `db/index.ts` |
| Campaign workflow orchestrator | `workflows/campaign-sequence.ts` |
| Campaign graph validator | `lib/workflow-graph-validator.ts` |
| Pipeline DAG runner | `lib/pipeline-engine.ts` |
| Pipeline durable execution | `lib/inngest/functions/` |
| Agent runtime | `lib/agent-runtime.ts` |
| RAG retrieval / ingest | `lib/knowledge-retrieval.ts` / `lib/knowledge-ingest.ts` |
| Cred encryption | `lib/crypto.ts`, `lib/crypto/connections-crypto.ts` |
| Test setup + global mocks | `vitest.setup.ts` |
| Test DB mock helper | `__tests__/helpers/db-mock.ts` |
| Sentry config | `instrumentation.ts`, `instrumentation-client.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts` |
| Project docs | `CLAUDE.md`, `AGENTS.md`, `STATUS.md`, `ROADMAP.md`, `docs/` |

## Naming Conventions

- **Pages:** `app/<feature>/page.tsx` (RSC shell) → renders `app/<feature>/<feature>-client.tsx`
- **API routes:** `app/api/<feature>/route.ts`; dynamic params via `[id]` folders
- **Client components:** `<feature>-client.tsx` with `'use client'` on line 1
- **Library modules:** `kebab-case.ts` (e.g. `email-sender.ts`, `pipeline-engine.ts`)
- **Components:** `kebab-case.tsx` inside a domain group under `components/<group>/`
- **Hooks:** `use-<thing>.ts`
- **Types files:** `<domain>-types.ts` for extracted types; `*.d.ts` for ambient shims
- **Tests:** mirror source path under `__tests__/` with `.test.ts(x)` suffix
- **Migrations:** generated by `drizzle-kit` into `db/migrations/`

## Where to Add New Code

| Adding... | Put it in... | Then... |
|-----------|--------------|---------|
| A new page | `app/<feature>/page.tsx` + `<feature>-client.tsx` | Add nav entry in `AppSidebar` |
| A new API endpoint | `app/api/<feature>/route.ts` | Scope every query by `auth().userId`; add to `proxy.ts` only if it must be public |
| Business logic | `lib/<name>.ts` (kebab-case) | Import directly via `@/lib/<name>` (no barrel) |
| A DB table | `db/schema.ts` | Include `userId` column; run `npm run db:generate` then `npm run db:migrate` |
| A campaign canvas node | `components/workflow/` + handle in `lib/workflow-graph-validator.ts` + `workflows/campaign-sequence.ts` | Add a runtime config validator (configs are untyped `text`) |
| A pipeline node | `components/canvas/` + executor in `lib/pipeline-nodes/` + wire in `lib/pipeline-engine.ts` / Inngest fn | Add a runtime config validator |
| A reusable hook | `hooks/use-<thing>.ts` | — |
| A durable workflow | `workflows/<name>.ts` | `"use workflow"` on orchestrator, `"use step"` on each unit |
| A test | `__tests__/<mirror-source-path>.test.ts(x)` | Mock `@/db` + SDKs; use `q()` / `queue()` from `__tests__/helpers/db-mock.ts` |

## Special Directories & Files

- **`app/.well-known/workflow/`** — Vercel Workflow SDK resume endpoints (must stay in the public route matcher in `proxy.ts`, or every workflow resume 401s).
- **`db/migrations/`** — generated SQL; do not hand-edit applied migrations.
- **`types/workflow-next.d.ts`** — temporary upstream type shim.
- **`scripts/*.review.md`** — review notes paired with their script (e.g. `fix-connections-table.review.md`).
- **Root docs** — `CLAUDE.md` (instructions), `AGENTS.md` (captured preferences), `STATUS.md` (session handoff), `ROADMAP.md` (shipped/next/deferred), `CHECKLIST.md`.

---

*Structure analysis: 2026-05-29*
