# Project Research Summary

**Project:** Farsight UI Library (Helm Extraction)
**Domain:** Framework-agnostic React component library in a pnpm monorepo (extracted from a Next.js App Router donor, consumed by a Vite/React `apps/web` over a typed `@farsight/contracts` SDK with org/project tenancy)
**Researched:** 2026-05-29
**Confidence:** HIGH

## Executive Summary

This project extracts Helm's React UI into a versioned, framework-agnostic `packages/ui` for the Farsight pnpm monorepo, consumed by a greenfield Vite/React `apps/web` and wired to the typed `@farsight/contracts` SDK with Clerk-React auth and org/project tenancy. The single most important finding — verified by direct source inspection — is that **the coupling to be shed is concentrated and shallow, not pervasive.** The design-system core is already framework-clean: `components/ui/` has zero `next/` imports, the 3,273-line `use-data-grid.ts` has zero `next/` imports, and Helm is already on Tailwind v4 CSS-first `@theme` tokens (the exact recommended distribution pattern). `next/navigation` lives in only 3 components; `next/headers` in zero. The real work is **plumbing a new data/auth/tenant seam** (26 files call `apiFetch`/`fetch` against `/api/*` Next routes today) and a disciplined packaging setup — not rewriting components.

All four research dimensions converge on the same conclusion: **build foundation-first, then vertical slices.** The headless presentational core has no dependency on the data layer, so it moves first and cheapest. The adapter seam (`FarsightProvider` = typed SDK client + QueryClient + org/project tenant context, with RFC-7807 error parsing and tenant-namespaced query keys) is a hard prerequisite for every data-bound surface and must precede them. Because the *Farsight backend's* Phase 1 contracts (pipelines/datasets/agents) may not be live while notifications/webhooks endpoints are, the seam should be validated end-to-end against the live notifications domain before porting the contract-gated surfaces. The recommended distribution model is the Turborepo "internal packages" pattern: consume `.tsx` source in-monorepo (Vite/Vitest compile it, zero build step blocks dev), and add a real bundler (tsdown or tsup) only for the eventual publish/port artifact.

The key risks are five cross-cutting hard gates that are expensive to discover late and cheap to get right early: **(1)** org/project cache-key correctness (omitting `orgId`/`projectId` from query keys causes silent cross-tenant data disclosure on org switch — renders fine, passes types, only shows in multi-org testing); **(2)** `'use client'` directive preservation (bundlers strip it by default — decide bundled-vs-per-module output up front); **(3)** Tailwind v4 `@source` distribution (tokens import fine but components render *unstyled* unless the consumer's `@source` scans the package — the #1 "styles missing" gotcha); **(4)** React/peer-dep deduplication (React/Clerk-React/xyflow as `dependencies` instead of `peerDependencies` yields duplicate-React `Invalid hook call` crashes under pnpm's strict isolation); and **(5)** contracts-ahead-of-endpoints sequencing (types compile but runtime 404s — build live-backed surfaces first, mock the rest from spec, gate completion on real-endpoint verification). All five map cleanly onto the foundation-first phase structure below.

## Key Findings

### Recommended Stack

The dominant 2026 pattern for an in-monorepo `packages/ui` is **"internal packages": ship transpiled-on-demand source, not a pre-bundled artifact.** The consumer's Vite bundler compiles the TypeScript, so HMR and Vitest work transparently and no build step blocks `apps/web` dev. This makes the heavy bundler question *secondary* — a real library bundler is only needed for the eventual publish/port artifact. Theming ships as a Tailwind v4 `@theme` CSS file under a `./theme.css` subpath; shadcn primitives travel verbatim as owned source (shadcn is a CLI that copies source, never an npm dependency). The full detail is in `STACK.md`.

**Core technologies:**
- **pnpm workspaces** (pnpm 9+, `workspace:*`): monorepo linking; strict dep isolation *surfaces* hidden Next/Clerk coupling during extraction — a feature, not a friction.
- **tsdown 0.22.x** (or **tsup 8.5.1**): library build for the publish/port artifact only; both externalize React correctly. tsdown is the forward-looking Rolldown-based choice; tsup is the battle-tested incumbent matching the Vercel/Turborepo template.
- **TypeScript 6.0.x** (5.5+ min): types + `.d.ts`; internal-packages pattern reads `.tsx` as valid type sources, so no in-repo build needed.
- **Tailwind CSS 4.3.x**: design-system theming distributed CSS-first via `@theme` (no JS config to ship) — the *enabling* technology for a themeable package.
- **@clerk/clerk-react 5.61.x** (peer): framework-agnostic Clerk replacement for `@clerk/nextjs`; consumer owns `<ClerkProvider>`.
- **@xyflow/react 12.10.x** (peer): pipeline + agent canvases; heavy/stateful, must stay a peer to share one context.
- **@tanstack/react-query** (peer): the data-fetching engine for the adapter; consumer owns the `QueryClient`.
- **Peer deps:** `react`, `react-dom`, `@clerk/clerk-react`, `@xyflow/react`, `@tanstack/react-query`. Tailwind is **NOT** a peer — it's build-time, distributed via `@theme` CSS + `@source`.

### Expected Features

A component library has two consumers: the *integrating developer* (`apps/web` author — exports, theming, types, SSR-safety, stable API) and the *end user* (loading/error/empty states, a11y, dark mode). The UI-REVIEW debt (48 `alert()` calls, 9 `confirm()` calls, hardcoded chart hex, missing loading states, `PageHeader` breaks) is the **to-fix list during extraction** — the library is the right place to enforce these conventions so they can't regress. The full landscape, MVP definition, and prioritization matrix are in `FEATURES.md`.

**Must have (table stakes):**
- Tree-shakeable ESM + per-component subpath exports + correct `sideEffects: ["**/*.css"]` — or one Button drags xyflow + Recharts into the bundle.
- CSS-variable semantic token contract + dark mode via `.dark` override (token layer, not scattered `dark:` utilities).
- `<FarsightProvider>`: SDK client + QueryClient + auth/tenant context, mounted once.
- `queryOptions`-factory SDK adapter over `@farsight/contracts` with RFC-7807/9457 error parsing + tenant-namespaced query keys.
- Loading/error/empty conventions wired through the adapter hook shape + Sonner toast + `ConfirmDialog` (kills the `alert()`/`confirm()` debt at source).
- SSR-safe / Next-decoupled primitives; first-class shipped TypeScript types; peer-dep hygiene (single QueryClient/React).

**Should have (differentiators):**
- End-to-end type flow contract -> hook -> component prop (rename a contracts field -> compile error in `apps/web`; the headline value).
- Optimistic mutation updates; Suspense-ready hook variants (free from `queryOptions` factories).
- Token JS/TS export so charts read `tokens.chart[1]` instead of hardcoded hex.
- Storybook stories per component (de-risks extraction by proving components render outside Helm/Next).

**Defer (v1+):**
- Chromatic visual + a11y regression (defer until component set + stories stabilize).
- Headless/`asChild` seams on feature surfaces (don't speculatively abstract — wait for real divergence).
- 1.0 + strict SemVer (stay `0.y.z` while Farsight Phase 1 contracts are in flux).
- shadcn private registry (only if Farsight gets apps *outside* the monorepo).

### Architecture Approach

A strictly layered package where **dependencies point downward only**: feature surfaces -> adapter layer -> headless core. The headless core never imports the adapter; the adapter never imports a feature; features never import each other (enforced by ESLint `no-restricted-imports`). This is what lets the design-system layer ship and be validated independently of whether any Farsight contract is live. The per-user -> org/project tenancy remodel lives *entirely* at the provider seam plus the query keys — presentational components never see a tenant id. Detail, including the provider/client/queryOptions patterns and the canvas split, is in `ARCHITECTURE.md`.

**Major components:**
1. **Headless / Presentational Core** (`ui/`, `page/`, `data-grid/` + `use-data-grid.ts`, `data-table/`, `canvas-kit/` shared scaffolding) — pure props-in/JSX-out; ports nearly verbatim (only `@/` path rewrites). Forbidden: `next/*`, `@clerk/*`, `fetch`, any adapter import.
2. **Adapter Layer** (`client/` typed SDK over contracts, `hooks-data/` queryOptions factories, `providers/` Api+Tenant+Router context, `errors/` RFC-7807 -> typed) — the *new* code; the entire decoupling story; replaces every `apiFetch('/api/...')`.
3. **Feature Surfaces x4** (`pipelines/`, `agents/`, `datasets/`, `notifications+webhooks/`) — compose core + adapter into a working screen; node-type components live per-feature (canvases must not be merged — different shapes, validation, execution semantics).
4. **Theming** (`styles/theme.css` `@theme` tokens lifted from `app/globals.css`, `@source` export, `cn()`) — a leaf.

### Critical Pitfalls

The five hardest-to-reverse classes, each mapped to a phase below. Full set of 11 pitfalls plus the "Looks Done But Isn't" checklist is in `PITFALLS.md`.

1. **Per-org cache keys missing -> cross-tenant data leak.** Make `{ orgId, projectId }` a mandatory leading segment of every query key (`['pipelines', orgId, projectId]`); belt-and-suspenders, key the provider boundary on `orgId` to remount-on-switch. Frontend cache discipline is about *correct display*; the backend (`requireOrgMember()`) is the security authority.
2. **`'use client'` stripped during bundling -> consumer build breaks.** Decide the output model up front: per-module (`preserveModules` + `rollup-preserve-directives`) for this overwhelmingly-interactive library, or accept source-consumption in-repo (Vite ignores the directive for SPA). Grep `dist/` in CI for the directive where expected.
3. **Tailwind v4 tokens distributed but classes never generated -> unstyled components.** Do NOT `@import "tailwindcss"` inside the package; export tokens-only `theme.css`; the consumer adds `@source "../../packages/ui/src"` so utility classes are discovered. Validate from a *separate* minimal Vite app, not just inside Helm.
4. **Duplicate React 19 -> `Invalid hook call`.** Declare `react`/`react-dom`/`@xyflow/react`/`@clerk/clerk-react`/`@tanstack/react-query` as `peerDependencies`; add root `pnpm.overrides`; verify `pnpm list react -r` shows exactly one version.
5. **Coding against contracts whose endpoints aren't live -> types compile, runtime 404s.** Inventory live (notifications/webhooks) vs contract-only (pipelines/datasets/agents); build live-backed first; spec-generate mocks (typed MSW/Prism) for the rest; be a Tolerant Reader; gate each surface's completion on a real-endpoint call.

Also load-bearing: the org/project **tenancy remodel reshapes data identity** (project is a second scope axis with no Helm equivalent + a `role` dimension — model both up front, never "add projectId later"); Next coupling must be **replaced, not shimmed** (CI import-guard for zero `next/` and `@clerk/nextjs/server`); `use-data-grid.ts` is **decoupled-then-ported** with characterization tests, never rewritten "while we're in there"; and Helm's **UX debt must not be blessed as canon**.

## Implications for Roadmap

Granularity is COARSE (3-5 broad phases). All four dimensions independently produced a foundation-first order; the phases below collapse the architecture's finer-grained build order into coarse milestones, each carrying the cross-cutting gates it must satisfy.

### Phase 1: Package Foundation — Scaffold, Theming, Build-Tooling, Peer-Dep Hygiene
**Rationale:** Nothing can be imported until the package builds, tokens exist, and the packaging decisions (peer deps, `exports` map, `'use client'` output model, `sideEffects`) are locked. These are the cheap-early/expensive-late decisions — three of the five hard gates live here.
**Delivers:** pnpm `packages/ui` with subpath `exports` map; `tsdown`/`tsup` config externalizing peers + preserving `'use client'`; `styles/theme.css` lifted from `app/globals.css` `@theme`; `@source` consumer-setup documented; `cn()` leaf util; peer-dep declarations + root `pnpm.overrides`.
**Addresses:** Tree-shakeable ESM + subpath exports + `sideEffects`; CSS-var token contract + dark mode; peer-dep hygiene.
**Uses:** pnpm workspaces, tsdown/tsup, Tailwind v4 `@theme`, `publint`/`attw`.
**Avoids:** Pitfall 2 (`'use client'` stripped), Pitfall 3 (Tailwind `@source`), Pitfall 5 (duplicate React).

### Phase 2: Headless Core Port — Primitives, Page Primitives, DataGrid, Canvas-Kit
**Rationale:** The headless core has zero dependency on the adapter seam, so it moves first and in parallel with seam design — the lowest-risk, highest-leverage move. Gives `apps/web` a usable design system immediately even before any contract is live. This is also where UX debt gets fixed at source rather than blessed.
**Delivers:** 34 shadcn `ui/` primitives, `page/` (`PageHeader`/`EmptyState`/`ConfirmDialog`), `data-grid/` + `use-data-grid.ts` (decoupled-then-ported with characterization tests), `data-table/`, `canvas-kit/` shared scaffolding, micro-hooks. `@/` paths rewritten to relative/package-local.
**Addresses:** `cn()`/`asChild` passthrough; controlled/uncontrolled (inherited from Radix); a11y baseline; loading/empty primitives; replaces `alert()`/`confirm()` with toast/`ConfirmDialog`.
**Avoids:** Pitfall 8 (Next coupling — replace not shim; CI import-guard), Pitfall 9 (`use-data-grid.ts` wholesale port), Pitfall 10 (`@/*` alias resolves wrong / pulls out-of-scope), Pitfall 11 (UX debt as canon).

### Phase 3: Adapter Seam + Tenancy + Notifications Proving Ground
**Rationale:** The adapter seam is the hard prerequisite for every data-bound surface and *is* the entire decoupling story. It must be validated end-to-end against the one domain whose backend is live (notifications/webhooks) before the contract-gated ports — proving the SDK-adapter shape (provider, factories, error envelope, optimistic updates, org-scoped keys) against a real network round-trip. The org/project tenancy remodel (both scope axes + role) is established here so all later surfaces inherit it.
**Delivers:** `client/create-client.ts` (typed SDK over `@farsight/contracts`, Bearer + `X-Org-Id`), `errors/` (RFC-7807/9457 -> typed `FarsightError`), `<FarsightProvider>` (Api + Tenant `{orgId, orgSlug, role, userId, projectId}` + Router context), `hooks-data/` queryOptions + key factories with tenant-namespaced keys; **notifications + webhooks surface** built end-to-end as the proving ground.
**Addresses:** `<FarsightProvider>`; SDK-adapter factories; RFC-7807 handling; org/project tenancy; loading/error/empty wired through the hook shape; notifications surface (live endpoints).
**Avoids:** Pitfall 1 (per-org cache keys), Pitfall 6 (contracts-ahead-of-endpoints — inventory + mock strategy + live-domain validation), Pitfall 7 (tenancy under-modeled — project axis + role from the start).

### Phase 4: Contract-Gated Feature Surfaces — Datasets, Pipelines, Agents
**Rationale:** With the seam proven against a live domain, port the three Farsight-Phase-1-contract surfaces in ascending complexity: datasets (mostly DataGrid + forms, exercises org-scoped lists) -> pipelines (heaviest canvas, locks the xyflow CSS import-order contract) -> agents (reuses canvas-kit + DataGrid, composes everything prior). Each surface is contract-gated and completion-gated on a real-endpoint call.
**Delivers:** Datasets list/detail + RAG search UI (UI only, no ingestion backend); pipelines xyflow canvas + run views on `pipelines`/`pipeline_runs` contracts; agents definitions + canvas + run history on `agents` contracts. Per-feature node validators carried forward (DB configs are untyped).
**Addresses:** Pipelines/agents/datasets surfaces; end-to-end type flow; optimistic updates; skeletons per surface.
**Avoids:** Pitfall 4 (xyflow CSS import order — edges invisible; lock in pipelines, visual smoke test), Pitfall 6 (gate completion on live endpoint per surface), Pitfall 11 (per-surface acceptance criteria: no `alert()`/`confirm()`, loading+error states, chart tokens).

### Phase 5 (optional coarse split or fold into 4): Port Integration + Polish
**Rationale:** Final integration once surfaces exist. May be folded into Phase 4's tail if the team prefers 4 phases. Verifies the package is workspace-consumable from `apps/web` via `workspace:*`, `@source` paths discover utilities, side-effect CSS imports (xyflow) documented; adds Storybook stories and token JS/TS export.
**Delivers:** Verified `apps/web` integration, Storybook stories, token JS/TS export (chart colors), README consumer-setup hard requirements.
**Addresses:** Storybook; token JS/TS export.
**Avoids:** Pitfall 3/4 final verification from a real consumer (the "Looks Done But Isn't" checklist).

### Phase Ordering Rationale

- **Foundation-first, not vertical-slice-first** — all four dimensions converge: the headless core is shared by all surfaces and is the lowest-risk move (front-load it to remove the most uncertainty cheapest); the adapter seam is a hard prerequisite for every data-bound surface (must precede them); and the Farsight backend's contract availability (notifications live, pipelines/datasets/agents Phase-1 maybe-not) dictates validating the seam against the live domain first regardless of which UI surface feels "most important."
- **Packaging gates front-loaded into Phase 1** because `'use client'` output model, peer-dep declaration, and `sideEffects` are output-shaping, hard-to-reverse decisions that every later phase depends on.
- **Tenancy + seam fused in Phase 3** because the org/project remodel is implemented entirely at the seam + query keys; modeling only `orgId` and adding `projectId`/`role` later is a pervasive refactor (Pitfall 7).
- **Surfaces ordered easiest-and-live-first within Phase 4** (datasets -> pipelines -> agents) so the data layer is validated on a simpler surface before the heaviest canvas, and so the xyflow import-order contract is locked once and inherited.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 3 (Adapter Seam):** The typed-SDK-over-contracts shape is net-new design with no off-the-shelf pattern to copy wholesale — and it hinges on an unverified fact: *what does `@farsight/contracts` actually export* (a fluent SDK to thin-wrap? a `RouteSpec` manifest to index? an OpenAPI doc for `openapi-fetch`?). This determines the `client/` implementation. Also needs the live-vs-contract-only endpoint inventory and the spec-mock strategy. **Highest research priority.**
- **Phase 1 (Build-Tooling):** Lower priority — patterns are well-documented (HIGH-confidence stack research) — but the `'use client'` output-model choice (internal-source-consumption vs per-module bundled output) and whether to enable `isolatedDeclarations` warrant a focused decision during planning.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Headless Core Port):** Mechanical port of confirmed-Next-clean code; the patterns (path rewrites, characterization tests, shadcn-source-in-package) are well-established. The work is execution, not discovery.
- **Phase 4 (Feature Surfaces):** Once the Phase 3 seam shape is proven, each surface reuses it; the canvas/grid patterns already exist in Helm. Per-surface research only if a specific contract turns out to be unexpectedly complex.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against current npm registry (2026-05-29); internal-packages, Tailwind v4 distribution, exports/peer-deps, tsdown-vs-tsup all grounded in official docs + Context7. MEDIUM only on shadcn `registry:base` payload mechanics (single primary source) — deferred anyway. |
| Features | HIGH | Theming, exports, headless, a11y, SSR, TanStack data-fetching, SemVer verified against official docs / RFC-7807/9457. SDK-adapter specifics MEDIUM-HIGH (grounded in TanStack maintainer guidance, not a single canonical pattern — the differentiator is net-new). |
| Architecture | HIGH | Grounded in *direct inspection of the Helm source* (the decoupling-is-shallow finding is verified, not inferred) plus current ecosystem docs. The one explicit unknown is the `@farsight/contracts` export shape (flagged). |
| Pitfalls | HIGH | Every pitfall verified against official docs or named GitHub issues/plugins; tenancy + cache findings cross-referenced across multiple sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@farsight/contracts` export shape is unverified.** STACK/ARCHITECTURE assume a `RouteSpec` manifest but flag fluent-SDK and OpenAPI alternatives. This is the single most load-bearing unknown — it determines the `client/create-client.ts` implementation. *Handle:* verify before/at the start of Phase 3 planning; do not hand-roll a client if Farsight ships a fluent SDK (Anti-Pattern 5).
- **Live-vs-contract-only endpoint inventory not yet recorded.** Notifications/webhooks asserted live; pipelines/datasets/agents asserted contract-only-maybe. *Handle:* confirm deployment status per endpoint during Phase 3 planning; stand up spec-generated mocks for not-yet-live; gate each Phase 4 surface on a real-endpoint call.
- **Project-selection UX + URL shape undecided.** The `project` scope axis has no Helm equivalent; whether org/project sits in the route path is a Phase 3 decision (retrofitting routing is expensive). *Handle:* decide during Phase 3 tenant-context design.
- **`lucide-react` major bump (Helm `^0.576.0` -> 1.x).** Icon import surface may have changed. *Handle:* audit icon imports during the Phase 2 port.
- **`isolatedDeclarations` annotation cost.** Unlocks tsdown's fast `.d.ts` path but requires explicit return types on every export (non-trivial pass on inferred components). *Handle:* treat as optional optimization in Phase 1; tsdown falls back to `tsc`.

## Sources

### Primary (HIGH confidence)
- npm registry verification (2026-05-29) — current versions for tsup/tsdown/tailwindcss/typescript/vite/react/@clerk-react/@xyflow-react/publint/attw/tailwind-merge/cva/lucide-react/radix-ui.
- Direct inspection of the Helm source — `components/ui/` (0 `next/`), `hooks/use-data-grid.ts` (3273 lines, 0 `next/`), `lib/api.ts` (12-line fetch wrapper), `next/navigation` in 3 components, `next/headers` in 0, Tailwind v4 `@theme` in `app/globals.css`, `nuqs` already adapter-based.
- Official docs — TanStack Query (`queryOptions`/key factories, optimistic updates, invalidation), Clerk React SDK (`useAuth`/`useOrganization`/`getToken`, multi-tenancy), React `'use client'` reference, Tailwind v4 theme/`@theme`/`@source`, RFC-7807/9457 Problem Details, SemVer 2.0.0, Radix Primitives (controlled/uncontrolled, a11y), React Aria accessibility, Storybook/Chromatic visual+a11y testing.
- Context7 `/rolldown/tsdown` (React config, `deps.neverBundle`, `dts`); Vercel/Turborepo design-system template + "internal packages" / "you might not need project references."
- Named GitHub issues/plugins — TanStack #3595 (hooks-in-separate-package context dedupe), pnpm #2695/#2743 (duplicate React), `rollup-preserve-directives` / `rollup-plugin-preserve-use-client`, React Flow common-errors (CSS order, error 004), webpack tree-shaking / `sideEffects`.
- In-repo: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/UI-REVIEW.md`.

### Secondary (MEDIUM confidence)
- tsdown.dev guides + "Switching from tsup to tsdown" (Alan Norbauer) + PkgPulse "tsup vs tsdown vs unbuild 2026" — bundler comparison.
- Tailwind v4 monorepo sharing posts (Nx, Trentmann, Scott Spence) + tailwindcss discussion #18770 — `@theme` package + `@source` gotcha.
- Multi-tenant SPA cache-leakage articles (Clerk multi-tenancy guide, agnitestudio, marmelab) — cross-tenant leakage, fail-closed.
- TanStack queryOptions-factory patterns (Atomic Object), OpenAPI+TanStack adapter (Ruan Martinelli), `openapi-react-query` (official).
- Tree-shaking guides (Carl Rippon, codefeetime, Dor Shinar), headless-UI landscape (GreatFrontend, LogRocket), design-tokens-at-scale (Mavik Labs), a11y in design systems (A11Y Pros, UXPin).
- Contract-first / mock-drift / API-drift detection articles (SmartBear, openapi-ts).

### Tertiary (LOW confidence)
- shadcn `registry:base` payload mechanics — single primary source (shadcn docs + openstatus writeup); deferred out of scope regardless.
- React component library performance anti-patterns (ruixen) — corroborates barrel/icon-pack bloat already covered by HIGH sources.

---
*Research completed: 2026-05-29*
*Ready for roadmap: yes*
