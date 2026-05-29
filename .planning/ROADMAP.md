# Roadmap: Farsight UI Library (Helm Extraction)

## Overview

This roadmap extracts Helm's mature React UI into a framework-agnostic `packages/ui` for the Farsight pnpm monorepo, consumed by a greenfield Vite/React `apps/web` over the typed `@farsight/contracts` SDK with Clerk-React auth and org/project tenancy. Research verified the coupling to shed is shallow (design system and DataGrid have zero `next/` imports; only 3 components use `next/navigation`) — so the real work is the data/auth/tenant adapter seam plus packaging discipline, not rewriting components. The journey runs foundation-first: lock the packaging gates and theming so anything can be imported (Phase 1), port the adapter-independent headless core so `apps/web` gets a usable design system immediately (Phase 2), build the adapter seam + org/project tenancy and prove it end-to-end against the one live backend domain — notifications/webhooks (Phase 3), then port the three contract-gated feature surfaces and verify real `workspace:*` consumption from an external Vite app (Phase 4). Each phase delivers an `apps/web`-consumable increment; the five cross-cutting hard gates (org/project cache-key correctness, `'use client'` preservation, Tailwind v4 `@source` distribution, peer-dep dedupe, contracts-ahead-of-endpoints sequencing) are front-loaded into the phases where they are cheapest to get right.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Package Foundation & Theming** - Buildable `packages/ui` with subpath exports, peer-dep hygiene, `'use client'`-preserving artifact, and the lifted CSS-variable token contract (completed 2026-05-29)
- [x] **Phase 2: Headless Core Port** - 34 primitives + page primitives + DataGrid/DataTable ported framework-clean, with loading/error/empty + a11y conventions enforced at source (completed 2026-05-29)
- [x] **Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground** - `<FarsightProvider>` + typed SDK + RFC-7807 errors + org/project tenant-namespaced hooks, proven end-to-end against the live notifications/webhooks surface (completed 2026-05-29)
- [ ] **Phase 4: Contract-Gated Surfaces & Monorepo Port** - Datasets, pipelines, and agents surfaces on Farsight contracts, plus verified `workspace:*` consumption from an external Vite app

## Phase Details

### Phase 1: Package Foundation & Theming

**Goal**: `apps/web` can install the package and import a themed, tree-shakeable artifact with exactly one version of React, and the design-system token contract exists as a consumable `./theme.css` subpath.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, THEME-01, THEME-02, THEME-03
**Success Criteria** (what must be TRUE):

  1. `apps/web` can install the package and import a single primitive without pulling in the xyflow canvas or Recharts (tree-shakeable subpath `exports`, `sideEffects: ["**/*.css"]` verified)
  2. `pnpm list react -r` resolves exactly one version with `react`, `react-dom`, `@clerk/clerk-react`, `@xyflow/react`, `@tanstack/react-query` all declared as peers under root `pnpm.overrides`
  3. A CI check asserts the `'use client'` directive survives in the built/distributed output (per-module / `preserveModules`)
  4. Importing `./theme.css` applies the semantic CSS-variable tokens lifted from `app/globals.css` `@theme`, and toggling `.dark` overrides them; consumer `@source` + xyflow CSS import-order setup is documented
  5. A JS/TS token export exists so charts can read `tokens.chart[1]` instead of hardcoded hex

**Plans**: 3 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Package scaffold: package.json (exports, sideEffects, peerDeps) + tsdown config + cn() utility (PKG-01, PKG-02, PKG-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Token lift: theme.css from app/globals.css + tokens.ts JS export + consumer setup README (THEME-01, THEME-02, THEME-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Button + Label primitive port + full build verification: 'use client' preservation, publint clean, walking skeleton import smoke (PKG-01, PKG-03, PKG-04)

### Phase 2: Headless Core Port

**Goal**: `apps/web` can render the full design system — primitives, page primitives, and DataGrid/DataTable — decoupled from Next.js/Clerk-server, with loading/error/empty and accessibility as first-class conventions rather than per-screen afterthoughts.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05
**Success Criteria** (what must be TRUE):

  1. A CI import-guard passes proving zero `next/*` and zero `@clerk/nextjs/server` imports across all in-scope components
  2. `apps/web` can import and render all 34 shadcn `ui/` primitives plus `PageHeader`, `EmptyState`, `ConfirmDialog`, and `Toaster` in light and dark, with `@/` paths rewritten to package-local
  3. DataGrid/DataTable (including `use-data-grid.ts`) render and behave correctly outside Next.js, with characterization tests passing (ported, not rewritten)
  4. No `alert()` or `confirm()` remains in ported components — destructive confirms use `ConfirmDialog` and transient messages use Sonner toast; every surface exposes standardized loading/error/empty states
  5. Components show visible focus rings, are fully keyboard-operable, and icon-only buttons carry `aria-label`

**Plans**: 5 plans

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Test/CI harness: vitest.config.ts + vitest.setup.ts + check-imports.sh (3-rule guard) + eslint.config.mjs (jsx-a11y) + Button axe smoke test (CORE-01, CORE-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — 34 ui/ primitives port: alias rewrite + 'use client' preservation + neverBundle updates + render smoke tests (CORE-01, CORE-02, CORE-05)

**Wave 3** *(blocked on Wave 2 completion — Plans 03/04/05 run in parallel)*

- [x] 02-03-PLAN.md — Page primitives: port PageHeader/EmptyState/ConfirmDialog + new ErrorState (D-02) + new Toaster (D-08/D-10) + three layout skeletons (D-03) + package.json next-themes peer reclassification (CORE-02, CORE-04, CORE-05)
- [x] 02-04-PLAN.md — DataGrid port: 17 component files + use-data-grid.ts (3273 lines, framework-clean, no state changes per D-06) + lib/types files + characterization tests (CORE-03, CORE-05)
- [x] 02-05-PLAN.md — DataTable port: 9 component files + use-data-table.ts nuqs seam (D-05/D-06/D-07: React.useState default + controlled state/onStateChange props) + utility hooks + lib/types/config + characterization tests + final check-directives.sh threshold update (CORE-03, CORE-04, CORE-05)

**UI hint**: yes

### Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground

**Goal**: A consumer can mount `<FarsightProvider>` once and get a typed, org/project-scoped data layer that round-trips against a real Farsight backend — proven by a fully working notifications inbox, preferences, and outbound-webhooks management surface on the live endpoints.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):

  1. Mounting `<FarsightProvider>` supplies an injectable `QueryClient` + Clerk React client + tenant context `{ orgId, orgSlug, role, userId, projectId }`, and the typed SDK client attaches the Clerk Bearer token + org header on every request
  2. Switching orgs shows no stale or cross-tenant data — every query key is namespaced with `orgId`/`projectId` and the provider remounts on org switch (verified by multi-org testing)
  3. A backend RFC-7807/9457 error renders as a typed error discriminated on the `type` URI (status/detail/extension surfaced; `detail` never drives control flow), and renaming a `@farsight/contracts` field produces a compile error at the call site
  4. A user can view their notifications inbox, edit notification preferences, and register/list/toggle/rotate-secret/delete outbound webhooks against the live `/me/notifications`, `/me/notification-preferences`, and webhooks endpoints — with optimistic updates and loading/error/empty states wired through the hook shape

**Plans**: 6 plans

Plans:
**Wave 0**

- [x] 03-01-PLAN.md — Workspace linking (@farsight/sdk + @farsight/contracts via file: deps) + test harness (13 stub test files + 2 helper files; mock fetchImpl factory) (DATA-01..06, NOTIF-01/02)

**Wave 1** *(blocked on Wave 0 completion)*

- [x] 03-02-PLAN.md — Adapter seam foundation: FarsightProvider + useTenant + useApiClient + create-client.ts + FarsightError helpers + tokens.warning + barrel section (DATA-01, DATA-02, DATA-04, DATA-05)

**Wave 2** *(Plans 03 and 04 run in parallel — blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — Notifications vertical: use-notifications + use-notification-preferences hooks + NotificationBell + NotificationInbox + NotificationItem + NotificationPreferences surfaces (DATA-03, DATA-06, NOTIF-01)
- [x] 03-04-PLAN.md — Webhooks list vertical: use-webhooks hooks (all 5 mutations) + WebhookHealthBadge + WebhookList surface with ConfirmDialog gates + no-project guard (DATA-02, DATA-03, DATA-06, NOTIF-02)

**Wave 3** *(blocked on Wave 2 / Plan 04 completion)*

- [x] 03-05-PLAN.md — Webhooks modals: EventTypesInput + WebhookCreateModal + WebhookSecretReveal (copy-once) + WebhookRotateSecretModal + barrel finalization (DATA-06, NOTIF-02)

**Wave 4** *(blocked on Wave 2/3 completion — Plans 03 + 05 both done)*

- [x] 03-06-PLAN.md — Final gate: barrel audit + check-directives.sh threshold update + full vitest suite + tsc --noEmit + check-imports.sh (DATA-01..06, NOTIF-01/02)

**UI hint**: yes

### Phase 4: Contract-Gated Surfaces & Monorepo Port

**Goal**: The three Farsight-Phase-1-contract feature surfaces (datasets, pipelines, agents) render and operate on their contracts using the proven seam, and the whole package is confirmed consumable as a `workspace:*` dependency from a real external Vite consumer.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02
**Success Criteria** (what must be TRUE):

  1. A user can browse the datasets list/detail and run RAG search bound to Farsight `datasets` contracts (UI only — no ingestion/chunking/pgvector backend), with completion gated on a real-endpoint call
  2. The pipelines `@xyflow/react` canvas and run views render and operate on `pipelines`/`pipeline_runs` contracts, with edges visible and the xyflow CSS import-order contract locked by a visual smoke test
  3. The agents definitions, canvas, and run-history UI render and operate on Farsight `agents` contracts, reusing the canvas-kit and DataGrid
  4. A minimal external Vite app consuming the package via `workspace:*` resolves utility classes via `@source`, applies tokens, and renders the canvases — validated outside Helm, not only inside it
  5. A consumer-setup README documents required peer versions, `@source` config, xyflow CSS import order, and `<FarsightProvider>` mount

**Plans**: 6 plans

Plans:
**Wave 0**

- [x] 04-01-PLAN.md — Test harness stubs (6 test files for all 3 surfaces) + examples/farsight-ui-consumer Vite scaffold + root pnpm-workspace.yaml (DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02)

**Wave 1** *(blocked on Wave 0 completion)*

- [x] 04-02-PLAN.md — Datasets vertical (walking slice): use-datasets.ts + DatasetList/Detail/Records/Search + barrel registration (DSET-01)

**Wave 2** *(blocked on Wave 0 completion — runs parallel to Wave 1)*

- [x] 04-03-PLAN.md — canvas-kit extraction + pipeline-adapter + node-ids (PIPE-01)

**Wave 3** *(blocked on Waves 1 + 2 completion)*

- [x] 04-04-PLAN.md — Pipelines vertical: use-workflows.ts + WorkflowList/Canvas/RunView + 3 nodes + barrel registration (PIPE-01)
- [ ] 04-05-PLAN.md — Agents vertical: use-agents.ts + AgentChatView/AgentMessage + barrel registration (AGNT-01)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 04-06-PLAN.md — PORT-01 Vite app wiring + PORT-02 CONSUMER.md + publint/attw + check-directives.sh update + full phase gate (PORT-01, PORT-02)

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Package Foundation & Theming | 3/3 | Complete   | 2026-05-29 |
| 2. Headless Core Port | 5/5 | Complete   | 2026-05-29 |
| 3. Adapter Seam, Tenancy & Notifications | 6/6 | Complete    | 2026-05-29 |
| 4. Contract-Gated Surfaces & Monorepo Port | 4/6 | In Progress|  |
