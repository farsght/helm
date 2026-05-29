# Farsight UI Library (Helm Extraction)

## What This Is

A portable React component library extracted from Helm's frontend and rebuilt to be backend-agnostic, destined to live as `packages/ui` in the Farsight pnpm monorepo and be consumed by Farsight's `apps/web`. It carries Helm's design system plus four feature surfaces (pipelines, agents, datasets/knowledge, notifications + webhooks), decoupled from Next.js / Clerk-server / Drizzle and wired to Farsight's typed `@farsight/contracts` SDK. The extraction and decoupling work happens in this Helm repo ("prep here, then port"); the cleaned package is later copied into the Farsight monorepo.

## Core Value

Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — without rebuilding Helm's mature components from scratch. If everything else slips, the components must render and function decoupled from Helm's Next.js/Clerk-server/Drizzle stack and against Farsight's typed contracts.

## Requirements

### Validated

<!-- Existing Helm UI capabilities we mine from — confirmed working in this repo today. -->

- ✓ shadcn (new-york) design system — 34 UI primitives in `components/ui/`, theming via `app/globals.css` CSS-variable tokens — existing
- ✓ Page primitives — `PageHeader`, `EmptyState`, `ConfirmDialog` in `components/page/` (barrel-exported) — existing
- ✓ DataGrid + DataTable — `components/data-grid/`, `components/data-table/`, `hooks/use-data-grid.ts` (large, stateful) — existing
- ✓ Pipeline canvas — `@xyflow/react` canvas with 15 node types + inspectors in `components/canvas/`, run views — existing
- ✓ Agent UI — agent definitions, agent canvas (`app/agents/[id]/agent-canvas-client.tsx`), run history (`app/agents/runs/`) — existing
- ✓ Datasets / knowledge UI — list/detail, ingest, RAG search surfaces (`app/datasets/`) — existing
- ✓ Tailwind + CSS-variable design tokens — `text-foreground` / `bg-card` / `border-border` etc., `cn()` merge util — existing
- ✓ Library build tooling — `packages/ui` package (`@farsight/ui`, `private:true`): subpath `exports`, `sideEffects:["**/*.css"]`, 5 peers (`@clerk/react` corrected name, clerk/xyflow/query optional), tsdown unbundled per-module ESM build with `rollup-preserve-directives`, `cn()` util, publint clean — **validated Phase 1**
- ✓ Design-system token contract as a consumable `./theme.css` subpath + `tokens.ts` JS export (lifted verbatim from `app/globals.css`, no `@import "tailwindcss"`), with `'use client'` preservation proven through the build via a Button/Label walking skeleton — **validated Phase 1**
- ✓ Headless design-system core — all 34 `ui/` primitives + page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`, new `ErrorState`, new themed `Toaster`, 3 new layout skeletons) + DataGrid/DataTable render framework-clean and are exported from the package entry (`src/index.ts`) into dist; CI import-guard (`check-imports.sh`) proves zero `next/*` / `@clerk/nextjs/server` / `alert()`/`confirm()` while allowing `next-themes`; zero `@/` aliases remain — **validated Phase 2 (CORE-01, CORE-02, CORE-04)**
- ✓ DataTable headless URL-state seam — `use-data-table.ts` has nuqs removed, defaults to internal React state, exposes opt-in controlled `state`/`onStateChange` props (`DataTableState`/`DataTableStateProps`); the 3,273-line DataGrid hook ported with no state-model change; characterization tests pin both internal-default and controlled-override modes — **validated Phase 2 (CORE-03)**
- ✓ Accessibility + loading/error/empty as first-class conventions — vitest-axe + `eslint-plugin-jsx-a11y` wired into CI (0 errors); `CONVENTIONS.md` documents the four-branch loading/error/empty pattern + destructive→`ConfirmDialog`/transient→Sonner-toast rule; focus-ring visibility + keyboard traversal + Toaster theme-sync carried to manual UAT (verified at consumer-integration in Phase 4) — **validated Phase 2 (CORE-04, CORE-05)**

### Active

<!-- New work this project builds toward. -->

- [ ] Decouple in-scope components from Next.js App Router — remove RSC `page.tsx`/`*-client.tsx` split, `next/navigation`, `next/headers`, `'use client'`-as-Next-boundary assumptions
- [ ] Replace Drizzle/Neon + `lib/api.ts` `apiFetch` data access with SDK-adapter hooks/providers against the typed `@farsight/contracts`
- [ ] Swap `@clerk/nextjs/server` for Clerk's framework-agnostic React client; library assumes Clerk on the consumer
- [ ] Reshape data-bound components from Helm's per-user (`userId`) tenancy to Farsight's org/project tenant context (`{ orgId, orgSlug, role, userId }`)
- [~] Establish the package as the authoritative design system — CSS-variable token export landed in Phase 1 (`./theme.css` + `tokens.ts`); the shareable Tailwind **preset** is still outstanding (Farsight `apps/web` is greenfield-styled)
- [x] Make the design-system layer portable — primitives, page primitives, DataGrid/DataTable, hooks build and consume cleanly outside Next.js (Phase 2)
- [ ] Port the pipelines surface (xyflow canvas + run views) onto Farsight pipelines/pipeline_runs contracts
- [ ] Port the agents surface (definitions + canvas + runs) onto Farsight agents contracts
- [ ] Port the datasets/knowledge surface onto Farsight datasets contracts
- [ ] Build notifications + webhooks UI (in-app inbox, notification preferences, outbound-webhook management) against Farsight's already-live endpoints — largely new UI, not a port
- [x] Set up library build tooling — package entry/exports, peer dependencies, build pipeline producing a consumable artifact (Phase 1)
- [ ] Provide a clean port path into the Farsight monorepo `packages/ui` (workspace-consumable by `apps/web`)

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- CRM surfaces (prospects, contacts, companies, deals, segments) — not part of Farsight's domain
- Campaigns, the campaign/workflow xyflow canvas, and email sending — not traveling to Farsight
- Knowledge **ingestion backend** (chunking/embedding pipeline, pgvector) — Farsight owns its own backend; only the dataset *UI* travels
- Building / modifying the Farsight backend (`@farsight/api`) — already mature, deployed, and tested (209 tests)
- The Farsight `apps/web` app shell itself — this project produces a library, not the consuming app
- Helm's per-user runtime behavior and existing Next.js routes — Helm continues to run; we mine its components, we don't refactor Helm in place beyond what extraction requires

## Context

- **Source repo (this one):** Helm — Next.js 16 App Router + React 19 + TS, Clerk, Neon/Drizzle + pgvector, Vercel Workflow SDK, `@xyflow/react`, shadcn (new-york) + Tailwind. Codebase map lives in `.planning/codebase/`; a standalone UI audit lives in `.planning/codebase/UI-REVIEW.md` (page surfaces scored 15/24 — flags `alert()`/`confirm()` overuse, missing loading/error states, hardcoded chart hex, `PageHeader` convention breaks).
- **Target backend:** Farsight `@farsight/api` — Cloudflare Worker (Hono) at `api.farsght.com`, D1 database, Workers Analytics Engine, AI Gateway, Clerk auth, Resend. Org/project multi-tenancy via `requireOrgMember()` → `c.get('tenant')`. Typed contracts in `@farsight/contracts` (`apiRoutes` manifest, `RouteSpec`, RFC-7807 `ApiErrorEnvelope`), with an SDK↔contracts↔api conformance test (FAR-71) and a "future fluent SDK". Live surfaces today: orgs, projects, cost, notifications, notification-preferences, outbound webhooks. Future Farsight Phase 1 adds `datasets`, `pipelines`, `pipeline_runs`, `agents` — which aligns with three of the four feature surfaces we're porting.
- **Target frontend:** Farsight `apps/web` — greenfield styling; this library becomes its design-system source of truth.
- **Tenancy mismatch is the central remodel:** Helm assumes per-user data scoping on every query; Farsight scopes by org + project. Every data-bound component must move to org/project context.
- **Known portability hot spots:** the 3,273-line `use-data-grid.ts` hook, the two `@xyflow/react` canvases (heavy/stateful), and Helm's deep `@/` alias + RSC assumptions.

## Constraints

- **Tech stack**: Library must be framework-agnostic React (no Next.js runtime deps) — consumed by a Vite/React `apps/web`, built as a pnpm-workspace package.
- **Tech stack**: Data access goes through `@farsight/contracts` (typed SDK adapter), not direct DB or Helm's `apiFetch`. Honor the RFC-7807 `ApiErrorEnvelope` error shape.
- **Compatibility**: Tenancy is org/project, not per-user. Auth is Clerk via its React client (no `@clerk/nextjs/server`).
- **Styling**: Package owns theming (Tailwind preset + CSS-var tokens) because `apps/web` is greenfield-styled.
- **Dependencies**: Three of four ported feature surfaces (pipelines, datasets, agents) depend on Farsight Phase 1 backend contracts that may not be live yet — adapters may target contract specs ahead of live endpoints. Notifications/webhooks endpoints are already live.
- **Process**: Work and commits happen in this Helm repo; final artifact is copied into the Farsight monorepo `packages/ui`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Portability = component library in Farsight monorepo (`packages/ui`) | Reuse mature Helm UI; consumed by `apps/web` via workspace — not decouple-in-place, not a published npm dep | — Pending |
| Data access via SDK-adapter hooks against `@farsight/contracts` | Least consumer wiring; leverages Farsight's typed contracts + conformance guarantees | — Pending |
| Adopt Farsight org/project tenancy; Clerk React client | Library targets Farsight's actual tenancy + auth model, drops Next/Clerk-server coupling | — Pending |
| Package is the authoritative design system | `apps/web` is greenfield-styled, so theming lives in the package (Tailwind preset + CSS-var export) | CSS-var token export shipped (Phase 1); Tailwind preset still pending |
| Develop in Helm repo, port to Farsight later ("prep here, then port") | Helm is the donor; keeps GSD execution/commits local while Farsight stays untouched until ready | In progress — `packages/ui` staged in Helm (Phase 1) |
| Scope = design system + 4 feature surfaces (pipelines, agents, datasets, notifications+webhooks) | These map to Farsight's domain; CRM/campaigns/knowledge-backend excluded | — Pending |
| Build tool = tsdown (not tsup fallback); peer name `@clerk/react` (not `@clerk/clerk-react`) | tsdown 0.22.x `unbundle:true` gives per-module output + `rollup-preserve-directives`; `@clerk/react` is the correct framework-agnostic package (01-RESEARCH Finding 2) | Decided & validated (Phase 1) |
| `radix-ui` + `class-variance-authority` are `dependencies` (not peers) | Component-lib primitives the package ships its own copy of; unlike React they are not singleton-sensitive | Decided (Phase 1 gap closure) |
| Toaster reads theme via `next-themes` as an **optional** peer; library does not own toggle/persistence/FOUC | Real light/dark Sonner sync without coupling the library to theme state; degrades to `theme="system"` when no consumer `ThemeProvider` is mounted (D-10). Clarifies the theming boundary: library **reads** theme, consumer **owns** it | Decided & validated (Phase 2) |
| DataTable URL-state is an injectable seam (controlled `state`/`onStateChange`, internal-state default), not a hook rewrite; `nuqs`/`lib/parsers.ts` stay out of the package | Keeps the port within "ported, not rewritten"; live URL-sync round-trip is proven by the Phase 4 Vite consumer (PORT-01) (D-05/06/07) | Decided & validated (Phase 2) |
| shadcn.io is a pattern source, not a dependency — skeletons/`ErrorState` re-implemented from scratch | shadcn.io Pro license prohibits redistribution inside a derived/copied package; MIT `<Skeleton>` primitive is the build block (D-12/D-13/D-14) | Decided & validated (Phase 2) |
| CI import-guard = bash grep script (`check-imports.sh`); a11y = vitest-axe + `eslint-plugin-jsx-a11y` | Cheapest CI-friendly mechanism, composes with Phase 1's `check-directives.sh`; focus-ring visibility stays a manual check (no false auto-claim) | Decided & validated (Phase 2) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-29 — Phase 2 (Headless Core Port) complete: the full design system — 34 `ui/` primitives, page primitives (incl. new `ErrorState`, themed `Toaster`, 3 layout skeletons), and DataGrid/DataTable — renders framework-clean and is exported from the package entry, with a CI import-guard, the DataTable nuqs→injectable-state seam, and a11y + loading/error/empty conventions as first-class primitives. Focus-ring/keyboard/theme-sync manual UAT carried to Phase 4 consumer integration.*
