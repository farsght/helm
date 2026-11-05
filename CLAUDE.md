# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Helm is the internal Marketing OS for Bitwage / Paystand — outbound campaigns, audience/CRM, content pipelines, knowledge/RAG, and agents on one data plane. Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Clerk auth, Neon Postgres + Drizzle + pgvector, Vercel Workflow SDK 4.x, @xyflow/react canvases, OpenAI, Resend.

Live: https://helm.gs · canonical local checkout: `~/Projects/helm` only.

## Commands

```bash
npm run dev            # Turbopack on port 3010 (NOT 3000)
npm run build
npm test               # vitest run
npm run test:watch
npx vitest run __tests__/path/to/file.test.ts        # single test file
npx vitest run -t "test name"                        # single test by name
npm run db:generate    # after editing db/schema.ts
npm run db:migrate     # apply migrations to the configured Neon branch
npm run db:studio
npx tsc --noEmit -p .  # authoritative TS check — lint runner uses a different tsconfig
```

Known-failing tests (don't get sidetracked fixing them as part of unrelated work — see STATUS.md): 3 in `__tests__/api/campaigns.test.ts` (the `/activate` validator returns 422 where the tests expect 200/404), 2 waitFor flakes in `__tests__/components/prospects-client.test.tsx`. Suite is otherwise green.

Vault ingestion (ESM hoisting forces `dotenv-cli` prefix — `db/index.ts` runs before any in-script `dotenv.config()`):

```bash
unset OPENAI_API_KEY DATABASE_URL && \
  npx dotenv-cli -e .env.local -- npx tsx scripts/ingest-vault.ts <datasetId>
```

## Architecture

### Tenancy invariant
Every domain table carries `userId` (Clerk subject). All API routes and queries MUST filter by `auth().userId` — there are no cross-tenant reads. New tables and inserts must include `userId`; new endpoints must scope SELECT/UPDATE/DELETE with it. This is the single most load-bearing rule in the codebase.

### Public route exceptions (everything else is Clerk-protected via `proxy.ts`)
- `POST /api/cron` — internal workflow scheduler tick
- `POST /api/webhooks/email` — Resend open/click/reply tracking
- `GET /api/health`
- `/sign-in`, `/sign-up`
- `/.well-known/workflow(.*)` — Vercel Workflow SDK resume endpoints. Removing this from the public matcher causes every workflow resume to 401 and campaigns silently break.

### Next config wrap order
`next.config.ts` composes as `withSentryConfig(withWorkflow(nextConfig), {...})`. `withWorkflow` injects the `"use workflow"` / `"use step"` build-time transforms; Sentry must wrap the composed result so source maps cover the workflow-augmented build. Do not swap the order.

### Two canvases share xyflow but are separate domains
- **Campaign canvas** (`components/workflow/`, ~11 node types) — strict-DAG interpreter in `lib/workflow-engine.ts`. Schema: `workflow_nodes` / `workflow_edges`. Validator: `lib/workflow-graph-validator.ts`.
- **Pipeline canvas** (`components/pipelines/`, 15 node types incl. ETL + `promote_*`) — interpreter in `lib/pipeline-engine.ts`. Schema: `pipeline_nodes` / `pipeline_edges` / `pipeline_runs`. This is where the in-flight Fireflies → meetings ETL replacement gets built (see STATUS.md).

They look similar but should not be merged — they have different node shapes, validation rules, and execution semantics.

**Node configs are untyped at the DB layer.** Both `workflow_nodes.config_json` and `pipeline_nodes.config_json` are raw `text` columns; the `type` column is free-form `text` with valid values only documented in a comment. Drizzle won't catch shape drift. When adding a new node type, add a runtime validator (Zod or hand-rolled) in the engine and inspector — don't rely on the schema to reject malformed configs. `pipeline_nodes.trigger_config` is `jsonb` with a default but is also unvalidated at the schema level.

### Vercel Workflow SDK for durable long-running work
Workflows live in `workflows/*.ts`. Use `"use workflow"` on the orchestrator and `"use step"` on each retryable unit. Throw `FatalError` to skip retries; throw `Error` for transient failures (backoff retried). `sleep("3 days")` is free during the wait. **Fluid Compute must be enabled in Vercel project settings** or every resume cold-starts. Type shim `types/workflow-next.d.ts` patches an upstream `exports` map gap — delete when upstream ships `types`.

### Agent runtime
`lib/agent-runtime.ts` `runAgent()` loads three things in parallel before completion: attached skills (`agent_skills` / `agent_skill_links`), MCP tools (`mcp_servers` / `agent_mcp_links` via `lib/mcp-client.ts`), and knowledge context (cosine search via `lib/knowledge-retrieval.ts`, injected under a `<knowledge_context>` system block). Knowledge retrieval failures are non-fatal. Cortex Mac mini hosts the MCP fleet (meetings, blackboard, code-intel, etc.) over Tailscale — agents consume those tools, they are not in this repo.

### RAG / knowledge
- `knowledge_chunks` table: 1536-dim pgvector + ivfflat cosine index. Chunks are ~800 tokens, 100 overlap, section-aware (heading-path tracked).
- `lib/knowledge-ingest.ts` is idempotent on `(datasetId, sourcePath, chunkIndex)` and uses `content_hash` for incremental updates.
- Per-agent attachment via `agent_knowledge_links` supports `pathPrefix` filter and `topK` override.
- Datasets with `source = 'obsidian_vault'` and a `sourcePath` are ingested by `scripts/ingest-vault.ts`.

### DB connection
`db/index.ts` uses `@neondatabase/serverless` + `drizzle-orm/neon-http`. `DATABASE_URL` **must be the pooled endpoint** (`-pooler` in hostname) on Vercel — cold starts exhaust unpooled connections. If `DATABASE_URL` is unset in non-prod, the module logs a warning and uses a placeholder so static analysis / CI doesn't crash; runtime calls will fail. Don't "fix" this by throwing — it's intentional.

### Sensitive creds at rest
SMTP credentials in `connected_accounts` are AES-256-GCM encrypted via `lib/crypto.ts`. Never read/write them raw.

### Email path
Campaign sends → Resend (`lib/email-sender.ts`). One-off `/api/messages/send` → nodemailer/SMTP using decrypted per-user creds. Tracking pixels + click rewriting flow back through `/api/webhooks/email`.

## Conventions

- **Aliases:** `@/*` resolves to repo root (Vitest and tsconfig both use this).
- **Auth in routes:** `const { userId } = await auth(); if (!userId) return new Response('Unauthorized', { status: 401 });` then scope every query by `userId`. The `userId` field is the Clerk subject string, not a UUID.
- **Page layout:** `PageHeader` owns the header's left/right layout via its `actions` prop. Don't wrap `PageHeader` in an outer flex row — pass controls through `actions`.
- **DataGrid:** `DataGridContextMenu` derives handlers from `tableMeta`. `DataGrid` should be passed only `tableMeta`, `columns`, and `contextMenu` — don't thread menu handlers separately.
- **Cell variants:** `components/data-grid/data-grid-cell-variants.tsx` uses effect-based syncing/measurement to avoid render-time `ref.current` reads. React Compiler flags the synchronous pattern; keep the effect-based one.
- **Pushing:** prefer `git push --force-with-lease`. A watchdog cron auto-commits every 15 minutes from a separate machine — always inspect divergent histories before force-pushing.

## Reference docs in-repo

- `AGENTS.md` — incrementally captured user preferences and workspace facts. Read alongside this file; user-confirmed conventions land there first.
- `STATUS.md` — current session handoff; read first when picking the project back up
- `ROADMAP.md` — shipped / next / deferred
- `docs/workflows.md` — Workflow SDK wiring, why config order matters
- `docs/email.md` — Resend setup, deliverability
- `docs/sentry.md` — Sentry org (`helm-gs`), project (`helm`), required env vars
- `docs/pipelines-connections-foundation.md` — pipeline connections work-in-progress
- `docs/archive/` — historical milestone snapshots, reference only
- `db/schema.ts` — 35+ tables, source of truth for the data model

---

<!-- ──────────────────────────────────────────────────────────────────────
     GSD-managed sections (get-shit-done). These describe the active planning
     initiative and refresh via `/gsd-update`. The hand-written Helm guidance
     ABOVE remains authoritative for working in THIS repo. Full codebase map:
     `.planning/codebase/` · Roadmap: `.planning/ROADMAP.md` · Handoff: `.planning/STATE.md`.
     (Redundant GSD stack/conventions/architecture blocks were intentionally
     omitted — they duplicate the sections above and the codebase map.)
     ────────────────────────────────────────────────────────────────────── -->

<!-- GSD:project-start source:PROJECT.md -->
## GSD Initiative — Farsight UI Library (Helm Extraction)

A portable React component library extracted from Helm's frontend and rebuilt to be backend-agnostic, destined to live as `packages/ui` in the Farsight pnpm monorepo and be consumed by Farsight's `apps/web`. It carries Helm's design system plus four feature surfaces (pipelines, agents, datasets/knowledge, notifications + webhooks), decoupled from Next.js / Clerk-server / Drizzle and wired to Farsight's typed `@farsight/contracts` SDK. The extraction and decoupling work happens in this Helm repo ("prep here, then port"); the cleaned package is later copied into the Farsight monorepo.

**Core Value:** Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — without rebuilding Helm's mature components from scratch. If everything else slips, the components must render and function decoupled from Helm's Next.js/Clerk-server/Drizzle stack and against Farsight's typed contracts.

### Constraints

- **Tech stack**: Library must be framework-agnostic React (no Next.js runtime deps) — consumed by a Vite/React `apps/web`, built as a pnpm-workspace package.
- **Tech stack**: Data access goes through `@farsight/contracts` (typed SDK adapter), not direct DB or Helm's `apiFetch`. Honor the RFC-7807 `ApiErrorEnvelope` error shape.
- **Compatibility**: Tenancy is org/project, not per-user. Auth is Clerk via its React client (no `@clerk/nextjs/server`).
- **Styling**: Package owns theming (Tailwind preset + CSS-var tokens) because `apps/web` is greenfield-styled.
- **Dependencies**: Three of four ported feature surfaces (pipelines, datasets, agents) depend on Farsight Phase 1 backend contracts that may not be live yet — adapters may target contract specs ahead of live endpoints. Notifications/webhooks endpoints are already live.
- **Process**: Work and commits happen in this Helm repo; final artifact is copied into the Farsight monorepo `packages/ui`.
<!-- GSD:project-end -->

## GSD Roadmap (Vertical MVP · 4 phases)

Detail in `.planning/ROADMAP.md`; requirements + traceability in `.planning/REQUIREMENTS.md`; session handoff in `.planning/STATE.md`. Each phase ships an `apps/web`-consumable increment.

1. **Phase 1 — Package Foundation & Theming**: installable, themed, tree-shakeable package with one React version + `./theme.css` token contract (PKG-01..04, THEME-01..03)
2. **Phase 2 — Headless Core Port**: 34 primitives + page primitives + DataGrid render framework-clean; a11y + loading/error/empty enforced at source (CORE-01..05)
3. **Phase 3 — Adapter Seam, Tenancy & Notifications**: `<FarsightProvider>` + typed SDK + RFC-7807 + org/project tenant-namespaced hooks, proven on the live notifications/webhooks surface (DATA-01..06, NOTIF-01..02). *Plan-time research flag: verify the `@farsight/contracts` export shape first; load the `clerk-react-patterns`/`clerk-tanstack-patterns`/`clerk-orgs` skills.*
4. **Phase 4 — Contract-Gated Surfaces & Monorepo Port**: datasets, pipelines, agents on contracts + verified `workspace:*` consumption from an external Vite app (DSET-01, PIPE-01, AGNT-01, PORT-01..02)

Next: `/gsd-plan-phase 1`.

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
