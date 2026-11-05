# Feature Research

**Domain:** Portable React component library / design-system package (design system + 4 data-bound feature surfaces) consumed by Farsight `apps/web` over a typed `@farsight/contracts` SDK
**Researched:** 2026-05-29
**Confidence:** HIGH (theming, exports, headless patterns, a11y, SSR, data-fetching, semver all verified against Context7-class sources / official docs; SDK-adapter specifics MEDIUM-HIGH, grounded in TanStack maintainer guidance + RFC-7807/9457)

---

## Framing: This Library Has Two Consumer Audiences

A reusable component library has **two distinct "users,"** and its feature set must satisfy both:

1. **The integrating developer** (the `apps/web` author) — wants: install once, theme once, import a component, pass data, render. Cares about exports/tree-shaking, theming API, TypeScript types, docs, SSR-safety, stable API.
2. **The end user of `apps/web`** — never sees the package, but feels its loading/error/empty states, accessibility, keyboard support, and dark-mode fidelity.

"Features" here means *capabilities the package exposes to the integrating developer* — not the visual design of pipelines/agents/datasets (those exist in Helm and are not re-derived). The UI-REVIEW.md gaps (48 `alert()` calls, missing loading states, hardcoded chart hex, `confirm()` dialogs, `PageHeader` convention breaks) are **the to-fix list during extraction** — they map directly onto the loading/error/empty-state and theming-token table-stakes below. The library is the right place to *enforce* those conventions so they can't regress.

---

## Feature Landscape

### Table Stakes (Integrating Devs Expect These — Won't Adopt Without Them)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Tree-shakeable ESM + per-component subpath exports** (`@farsight/ui/button`, `@farsight/ui/data-grid`) via a `package.json` `exports` map | Without it, importing one Button pulls the xyflow canvas + Recharts into `apps/web`'s bundle. 100kB+ libraries are common when this is missed. | MEDIUM | Ship ESM. Preserve module structure (don't bundle to one file) so `sideEffects` can drop unused modules. Set `"sideEffects": ["*.css"]`. Mark `react`/`react-dom` as peers + external. **A workspace (`packages/ui`) consumed by `apps/web` makes this easier** — the consumer brings its own bundler (Vite), so unbundled/`tsc`-compiled output is ideal. |
| **CSS-variable semantic token contract** (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--chart-1..5`) + a **shareable Tailwind preset** | `apps/web` is greenfield-styled; the package is declared the design-system source of truth. Devs expect `bg-background`/`text-foreground` to "just work" in both modes without `dark:` churn. | MEDIUM | Helm already has this in `app/globals.css` — extract it to a token CSS file + Tailwind preset export. Three-tier discipline (primitive → semantic → component) keeps it themeable. **This directly fixes UI-REVIEW Pillar 3**: the 30+ hardcoded chart hex values (`#266DF0`, `#1B1B1F` tooltips) must be re-expressed against `--chart-*` tokens or they break in light mode. |
| **Dark mode driven by the token layer** (`.dark` class override, not scattered `dark:` utilities) | Helm runs `defaultTheme="system"`; the library must render correctly in light AND dark. UI-REVIEW found dark-only tooltip backgrounds that go invisible in light mode. | LOW-MEDIUM | The token contract makes this near-free: redefine semantic vars under `.dark`. The package should NOT own the theme *toggle/persistence* (that's the consumer's app shell) — only the token definitions. Expose theme via a `next-themes`-style class on `<html>`; document the contract. |
| **`cn()` / className passthrough + `asChild` (Slot) composition** | Devs need to extend styling and merge into their own layouts. shadcn/Radix set this expectation. | LOW | Helm already ships `cn()`. Keep `className` merge on every primitive; preserve Radix `asChild` where present. |
| **Controlled + uncontrolled support on stateful primitives** (`value`/`onValueChange`, `open`/`onOpenChange`, with `defaultValue`/`defaultOpen`) | The universal Radix-era contract. Devs expect to either let the component self-manage or drive it from app state. | LOW (inherited) | Mostly free — Helm's shadcn primitives are Radix-based and already do this. Verify when decoupling that no Next-specific state leaks in. |
| **Loading / error / empty states as first-class, consistent conventions** | A data-bound feature library that flashes a blank screen or an empty-state during fetch is broken (exactly UI-REVIEW's BLOCKER on campaigns/agents). | MEDIUM | Standardize: skeleton on load, `EmptyState` on empty, an error render path on failure. The SDK-adapter hooks should return `{ data, isLoading, isError, error }` and the feature components should consume them uniformly. **This is the single highest-leverage fix** — the library encodes the convention once so 10 surfaces can't diverge again. |
| **Toast/notification feedback primitive** (Sonner) wired into mutation flows | UI-REVIEW found 48 blocking `alert()` calls. A library can't ship feedback via `window.alert()`. | LOW | Sonner already installed. Export a `<Toaster/>` mount point + re-export `toast`. Mutation hooks should surface errors that the consumer toasts; **anti-feature alert: the library should NOT auto-toast** (see anti-features) — it should expose the error and let the app decide. |
| **Confirmation dialog primitive** (`ConfirmDialog`, `destructive` variant) replacing native `confirm()` | UI-REVIEW found 9 `confirm()` calls. Native dialogs can't be styled, block the tab, and have no loading state. | LOW | `ConfirmDialog` exists in `components/page/`. Export it; destructive flows route through it. |
| **Accessibility baseline** — visible focus rings (WCAG 2.4.7), full keyboard operability (Tab/Enter/Esc/arrows), focus trap + restore on modals, ARIA roles/labels, `aria-label` on icon-only buttons | A design system is *the* place to enforce a11y once. UI-REVIEW found icon-only destructive buttons with no `aria-label`. | MEDIUM | Radix primitives give most of this for free (focus management, ARIA, `inert`). Gap is the bespoke surfaces (canvas inspectors, icon buttons). Axe catches ~57% automatically; the rest needs the per-component contract documented. |
| **SSR-safety / RSC-compatibility** — no `window`/`document` at module scope; `"use client"` only on interactive entry points; works under Vite SSR and (incidentally) Next RSC | `apps/web` is Vite/React, but SSR-safety prevents hydration mismatches and is table stakes for any modern lib. Helm's components carry Next-coupling that must be stripped. | MEDIUM-HIGH | **Central decoupling work.** Remove `next/navigation`, `next/headers`, RSC `page.tsx`/`*-client.tsx` split. `"use client"` is a bundler boundary, not a browser flag — survives only with `preserveModules`/unbundled output. Providers (theme/auth/query) must be client components. |
| **First-class TypeScript types** — every component prop typed, every hook generic over `@farsight/contracts` types, `.d.ts` shipped | A typed-SDK-backed library that isn't end-to-end typed defeats its own value prop. | LOW-MEDIUM | The contracts give types for free; the win is *plumbing them through* hooks/props so autocompletion flows from API → hook → component. |
| **Documented, stable public API + SemVer discipline** | Workspace consumer still needs to know what's public vs internal and what a version bump means. | LOW (process) | Declare the public API = exported components, hooks, providers, props, token names, Tailwind preset. Internals (engines, validators) stay unexported. Pre-1.0 (`0.y.z`) signals "anything may change" — appropriate while Farsight Phase 1 contracts are still landing. |
| **Peer-dependency hygiene** — `react`, `react-dom`, `@tanstack/react-query`, `@clerk/clerk-react`, Tailwind declared as peers, deduped | A second copy of TanStack Query in the tree breaks `QueryClient` context (documented failure mode for hooks-in-a-separate-package). | MEDIUM | **Critical for the SDK adapter.** The QueryClient context resolution bug is the #1 packaging trap. pnpm workspace + single version policy mitigates; document required peer versions. |

### Table Stakes Specific to the Typed-SDK Adapter Layer (hooks/providers over `@farsight/contracts`)

These are the contract the data-bound feature components sit on. The quality gate calls this out specifically.

| Capability | Why Expected | Complexity | Notes |
|------------|--------------|------------|-------|
| **`<FarsightProvider>` (or composed providers) injecting: SDK client + QueryClient + auth/tenant context** | Consumer should wrap once and have every feature component work. Provider ordering (auth above query above components) is the established pattern. | MEDIUM | Single mount point: `<QueryClientProvider>` + Clerk React client + a tenant context (`{ orgId, orgSlug, role, userId }`). The library should create the QueryClient if the consumer doesn't pass one, but **accept an injected one** (consumer may already have queries). |
| **Auth/tenant context injection into the data layer** — every request carries the Clerk token; every query key is namespaced by `orgId`/`projectId` | Tenancy remodel is the central project risk: Helm is per-`userId`, Farsight is org/project. Cache must not bleed across tenants. | HIGH | This is the biggest data-layer change. Query keys become `['pipelines', orgId, projectId, ...]`. A connector/interceptor adds the auth header and centralizes 401/403. Tenant mismatch should fail closed, not silently. |
| **Query caching with sensible defaults** (staleTime, retry, refetch policy) via `queryOptions` factories | Devs expect cache hits to avoid duplicate requests; TanStack maintainer-recommended pattern is `queryOptions` factories, not bespoke hooks per call. | MEDIUM | Factories return plain TanStack options → composable into `useQuery`/`useSuspenseQuery`/`prefetchQuery`. Don't hide TanStack; reduce boilerplate over it. Access `QueryClient` via `useQueryClient()` inside hooks, never a module import (testability). |
| **RFC-7807 / 9457 `ApiErrorEnvelope` handling** — parse `application/problem+json` into a typed, discriminated error keyed on the `type` URI; surface `status`, `detail`, and extension members (e.g. validation arrays) | PROJECT.md mandates honoring the RFC-7807 error shape. Components need to branch on error *kind* (403 vs validation vs not-found), not parse human-readable strings. | MEDIUM | Discriminate on the stable `type` URI (machine-readable key), NOT on `detail` (spec says don't parse it). Surface structured extension members as typed payloads. Centralize in `MutationCache`/`QueryCache` `onError` for cross-cutting handling (e.g. 401 → re-auth) + per-hook for field-level validation. RFC-9457 supersedes 7807 with identical structure — forward-compatible. |
| **Optimistic updates on mutation hooks** | Table stakes for a "pleasant" data layer — toggling a pipeline, renaming an agent should feel instant. | MEDIUM | Standard cancel → snapshot → optimistic `setQueryData` → rollback `onError` → invalidate `onSettled`. Encode once in mutation-hook factories so feature surfaces inherit it. `cancelQueries` before mutating is mandatory to avoid races. |
| **Contract-spec-ahead-of-live tolerance** | PROJECT.md: pipelines/datasets/agents depend on Farsight Phase 1 contracts that may not be live. | MEDIUM | Adapters target the contract *types* (`apiRoutes` manifest / `RouteSpec`); endpoints can be stubbed/mocked. Build against the typed manifest so the day the endpoint ships, only the base URL changes. Notifications/webhooks endpoints are live today — build those first to validate the adapter shape end-to-end. |

### Differentiators (What Makes This Library Pleasant)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **End-to-end type flow from contract → hook → component prop** | Rename a field in `@farsight/contracts`, get a compile error in `apps/web`. This is the headline value of a typed-SDK-backed library (the tRPC-style DX). | MEDIUM | Generics carry `RouteSpec` response types into hook return types into component props. The conformance test (FAR-71) guarantees the contract matches the API; the adapter extends that guarantee to the UI. |
| **Storybook as living docs + dev surface, with stories per component** | Devs evaluate and integrate against Storybook without spinning up `apps/web`. Doubles as the testing substrate. | MEDIUM-HIGH | Storybook 10.x is a full testing platform (interaction + a11y + visual). Stories make the package self-documenting and give the extraction a place to verify decoupled-from-Helm rendering. |
| **Visual + accessibility regression testing (Chromatic)** | Catches token/theme regressions and a11y debt on every PR; lets the team migrate UI-REVIEW debt incrementally against a baseline without blocking. | MEDIUM-HIGH | Chromatic builds on Storybook stories. Two-gate model: a11y/interaction = hard gate, visual diffs = review gate. High value for a design system where one token change ripples everywhere. Defer to v1.x if timeline-pressured. |
| **Headless / `asChild` escape hatches on feature components** | Lets `apps/web` reuse the data-binding + a11y while substituting layout where Farsight diverges from Helm's visuals. | MEDIUM | Render-prop or slot seams on the heavy surfaces (DataGrid cells, empty/loading slots) so consumers customize without forking. Don't over-do — only where divergence is likely. |
| **Suspense-ready hooks** (`useSuspenseQuery` variants) | Cleaner loading orchestration in `apps/web` if it adopts Suspense boundaries. | LOW (additive) | `queryOptions` factories make this free — same options feed `useQuery` or `useSuspenseQuery`. |
| **Skeleton components matched to each feature surface's layout** | Polished perceived performance; the opposite of the UI-REVIEW blank-screen blocker. | LOW-MEDIUM | Ship skeleton variants (card-grid, table, canvas) co-located with each surface so loading state always matches final layout. |
| **Token export in multiple formats** (CSS vars + Tailwind preset + optionally a JS/TS token object) | Lets `apps/web` consume tokens in chart libs / inline styles where Tailwind utilities don't reach (the Recharts case). | LOW-MEDIUM | A small TS token export solves the chart-color problem cleanly: charts read `tokens.chart[1]` instead of hardcoded hex. |

### Anti-Features (Seem Good, Create Problems)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Library owns the theme toggle + persistence** (mount a theme switcher, write `localStorage`) | "Make dark mode work out of the box" | App shell concerns (persistence, FOUC-prevention inline script, system-pref listener) belong to `apps/web`. Owning them couples the lib to a storage/runtime model and fights the consumer's own theming. | Own the **token contract** (`.dark` overrides) only. Document that the consumer sets the class on `<html>`. Optionally export a headless `useTheme` helper, not a mounted switcher. |
| **Auto-toast on every mutation error inside the library** | "Errors should always surface" | The library can't know the app's UX (some errors are field-level, some are silent retries, some need custom copy). Auto-toasting double-fires with the consumer's own handling and can leak RFC-7807 `detail` strings not meant for end users. | Surface typed errors via hook return + a global `onError` *hook the consumer registers*. Let the app decide what toasts. |
| **A single barrel `index.ts` re-exporting everything** | "One import path is simpler" | Defeats tree-shaking — pulls the xyflow canvas + Recharts into a bundle that only wanted a Button. The #1 bundle-bloat cause. | Per-component subpath exports. A root barrel may exist for convenience but must be backed by separate files + correct `sideEffects` so bundlers can still drop unused modules. |
| **Bundling the library to a single optimized file** | "Faster install / fewer files" | Single-file output strips `"use client"` directives and kills `sideEffects`-based shaking. Breaks RSC and tree-shaking simultaneously. | Ship unbundled / `preserveModules` output. The Vite consumer bundles. This is the correct model for a workspace `packages/ui`. |
| **Embedding the QueryClient creation and never accepting an injected one** | "Zero-config data layer" | If the lib hard-creates its own client and `apps/web` also has one, you get two caches, broken context, and the documented hooks-can't-find-QueryClient failure. | Accept an injected `QueryClient`/SDK client via provider; create a default only as fallback. Always read via `useQueryClient()`. |
| **Re-exporting/wrapping Clerk-server (`@clerk/nextjs/server`) helpers** | "Auth should be handled" | Server-only Next coupling — exactly what the project must strip. Breaks in Vite/React. | Depend on Clerk's framework-agnostic React client as a peer; consume `{ orgId, role, userId }` from a tenant context the provider exposes. |
| **Porting Helm's per-`userId` tenancy assumptions into the adapter** | "It already works in Helm" | Farsight is org/project scoped; per-user query keys and filters silently return wrong/empty data and risk cross-tenant cache bleed. | Reshape every data-bound hook to org/project context up front. Tenancy is the central remodel, not a later patch. |
| **Owning the app shell / routing / navigation** (sidebar wired to `next/navigation`, route guards) | "It's all UI" | Out of scope per PROJECT.md (`apps/web` shell is the consumer's). Routing coupling re-introduces Next deps. | Export presentational nav primitives that take `href`/`onClick`; let the consumer wire its router. |
| **Shipping the knowledge ingestion / chunking / pgvector backend** | "Datasets need ingestion" | Explicitly out of scope — Farsight owns its backend. Only the dataset *UI* travels. | Port the dataset UI bound to Farsight datasets contracts; no embedding/chunking code. |
| **Premature 1.0 + rigid SemVer while contracts are in flux** | "Looks production-ready" | Farsight Phase 1 contracts (pipelines/datasets/agents) aren't all live; locking a 1.0 public API invites breaking-change churn under a major-version obligation. | Stay `0.y.z` through extraction + first integration; declare 1.0 when contracts stabilize and `apps/web` ships against it. |

---

## Feature Dependencies

```
[CSS-variable token contract]
    └──enables──> [Tailwind preset export]
    └──enables──> [Dark mode via .dark override]
    └──enables──> [Token JS/TS export] ──fixes──> [hardcoded chart hex / Recharts colors]

[Tree-shakeable ESM + subpath exports]
    └──requires──> [Unbundled / preserveModules build] ──also-required-by──> ["use client" survival / SSR-safety]
    └──requires──> [correct sideEffects flag]

[SSR-safe / Next-decoupled components]
    └──requires──> [remove next/navigation, next/headers, RSC split]
    └──blocks-until-done──> [everything else portable]   (decoupling is the gate)

[<FarsightProvider> (SDK + QueryClient + tenant context)]
    └──requires──> [Clerk React client (peer), not Clerk-server]
    └──requires──> [org/project tenancy remodel]
    └──enables──> [data-bound feature surfaces: pipelines, agents, datasets, notifications]

[queryOptions factories over @farsight/contracts]
    └──requires──> [<FarsightProvider>]
    └──enables──> [optimistic mutation hooks]
    └──enables──> [Suspense-ready hooks]
    └──enables──> [end-to-end type flow]

[RFC-7807/9457 error envelope handling]
    └──enables──> [consistent error states in feature components]
    └──enables──> [consumer-registered global onError]

[Loading/error/empty conventions] ──consume──> [SDK-adapter hook return shape] + [skeleton/EmptyState/Toast/ConfirmDialog primitives]

[Storybook stories]
    └──required-by──> [Chromatic visual + a11y regression]
    └──enables──> [decoupled-from-Helm render verification during extraction]
```

### Dependency Notes

- **Token contract is the root of theming.** Tailwind preset, dark mode, and the chart-color fix all hang off it. Extract it first; it's also the lowest-risk extraction (it already exists in `app/globals.css`).
- **The unbundled/`preserveModules` build decision is doubly load-bearing** — it's required by *both* tree-shaking AND `"use client"` survival. Get the build tooling right early or both capabilities silently fail.
- **Next-decoupling is the gate.** Until `next/navigation`/`next/headers`/RSC-split are removed, nothing ports cleanly. It blocks the whole pipeline.
- **`<FarsightProvider>` + tenancy remodel precede every data-bound surface.** You cannot port pipelines/agents/datasets onto org/project scoping until the provider + query-key namespacing exist.
- **Notifications/webhooks unblock the adapter first** — their endpoints are live, so build the SDK-adapter shape (provider, factories, error envelope, optimistic updates) against them, then reuse the proven shape for the contract-spec-ahead surfaces.
- **Storybook precedes Chromatic** (Chromatic consumes stories) — and Storybook independently de-risks extraction by proving components render outside Helm/Next.

---

## MVP Definition

### Launch With (v0.1 — "renders and functions decoupled," the Core Value floor)

- [ ] **CSS-variable token contract + Tailwind preset export** — design-system source of truth; everything visual depends on it
- [ ] **Tree-shakeable ESM build with subpath exports + correct `sideEffects` + peer deps** — or the package is unusable at scale
- [ ] **Next-decoupled, SSR-safe primitives + page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`) + DataGrid/DataTable** — the portable design-system layer
- [ ] **`<FarsightProvider>`: QueryClient + Clerk React client + org/project tenant context** — the data-layer foundation
- [ ] **`queryOptions`-factory SDK adapter over `@farsight/contracts` with RFC-7807/9457 error parsing + tenant-namespaced query keys** — the typed data contract
- [ ] **Loading/error/empty conventions wired through the adapter hook shape + Sonner toast + ConfirmDialog** — kills the UI-REVIEW blockers at the source
- [ ] **Notifications + webhooks surface** (live endpoints) — proves the adapter shape end-to-end and ships real UI
- [ ] **TypeScript types shipped; public API documented; `0.y.z` versioning**

### Add After Validation (v0.x — once the adapter shape is proven)

- [ ] **Pipelines surface** (xyflow canvas + run views) on Farsight contracts — trigger: pipelines/pipeline_runs contracts stabilized
- [ ] **Agents surface** (definitions + canvas + runs) — trigger: agents contracts stabilized
- [ ] **Datasets/knowledge UI** (no ingestion backend) — trigger: datasets contracts stabilized
- [ ] **Optimistic updates on mutation hooks** — trigger: first surface where instant feedback matters
- [ ] **Storybook stories per component** — trigger: integration friction or onboarding need
- [ ] **Skeleton components matched per surface** — trigger: perceived-perf polish pass
- [ ] **Token JS/TS export** — trigger: charts need token-driven colors

### Future Consideration (v1+ — once contracts stable & `apps/web` shipped against it)

- [ ] **Chromatic visual + a11y regression in CI** — defer until component set + stories stabilize
- [ ] **Suspense-ready hook variants** — defer until `apps/web` adopts Suspense boundaries
- [ ] **Headless/`asChild` seams on feature surfaces** — defer until a real divergence between Helm visuals and Farsight need appears (don't speculatively abstract)
- [ ] **1.0 + strict SemVer** — defer until contracts stop moving

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CSS-var token contract + Tailwind preset | HIGH | MEDIUM | P1 |
| Tree-shakeable ESM + subpath exports + sideEffects | HIGH | MEDIUM | P1 |
| Next-decoupling / SSR-safety | HIGH | HIGH | P1 |
| `<FarsightProvider>` (QueryClient + Clerk React + tenant ctx) | HIGH | MEDIUM | P1 |
| Org/project tenancy remodel of data hooks | HIGH | HIGH | P1 |
| SDK-adapter `queryOptions` factories over contracts | HIGH | MEDIUM | P1 |
| RFC-7807/9457 error envelope handling | HIGH | MEDIUM | P1 |
| Loading/error/empty conventions + toast + ConfirmDialog | HIGH | MEDIUM | P1 |
| Dark mode via token override | HIGH | LOW | P1 |
| Controlled/uncontrolled (inherited from Radix) | MEDIUM | LOW | P1 |
| Notifications + webhooks surface (live endpoints) | HIGH | MEDIUM | P1 |
| Peer-dep hygiene / QueryClient dedupe | HIGH | MEDIUM | P1 |
| End-to-end type flow contract→hook→prop | HIGH | MEDIUM | P2 |
| Pipelines / agents / datasets surfaces | HIGH | HIGH | P2 (contract-gated) |
| Optimistic updates | MEDIUM | MEDIUM | P2 |
| Storybook stories | MEDIUM | MEDIUM-HIGH | P2 |
| Token JS/TS export (chart colors) | MEDIUM | LOW | P2 |
| Skeleton components per surface | MEDIUM | LOW-MEDIUM | P2 |
| Chromatic visual/a11y regression | MEDIUM | MEDIUM-HIGH | P3 |
| Suspense-ready hooks | LOW-MEDIUM | LOW | P3 |
| Headless/asChild feature seams | LOW-MEDIUM | MEDIUM | P3 |

**Priority key:** P1 = must have for launch · P2 = should have, add when possible · P3 = nice to have / future

---

## Competitor Feature Analysis

How well-regarded libraries expose these capabilities — the bar to clear.

| Capability | shadcn/ui | Radix Primitives | MUI / Mantine / Chakra | Our Approach |
|------------|-----------|------------------|------------------------|--------------|
| **Distribution model** | Copy-in source (no runtime dep) | npm, per-primitive packages | npm, subpath exports | npm/workspace `packages/ui`, subpath exports — closer to MUI/Mantine than shadcn's copy-in, since we ship a versioned package |
| **Theming** | CSS-var tokens + Tailwind | unstyled (consumer themes) | theme object / CSS vars (v4+ all moving to CSS vars) | CSS-var token contract + Tailwind preset (extract Helm's existing) |
| **Tree-shaking** | per-file copy | per-package | subpath exports + sideEffects | subpath exports + sideEffects + unbundled build |
| **Controlled/uncontrolled** | inherited from Radix | native, universal | yes | inherited from Helm's Radix base |
| **A11y baseline** | inherits Radix | strong (focus mgmt, ARIA, inert) | strong | inherit Radix; enforce on bespoke surfaces |
| **Data-fetching** | none (UI only) | none | none (UI only) | **our differentiator** — typed SDK adapter is what these libraries deliberately omit |
| **Docs/visual regression** | docs site | docs site | Storybook + Chromatic (MUI) | Storybook + Chromatic (P2/P3) |
| **SemVer** | unversioned (copy-in) | strict | strict | `0.y.z` → 1.0 when contracts stabilize |

**Key insight:** Pure component libraries (shadcn/Radix/MUI/Mantine) deliberately **do not** ship a data-fetching layer — they leave it to the consumer. Our **data-bound feature surfaces + typed SDK adapter are the differentiator and the risk**: no off-the-shelf library does this, so the adapter contract (provider + factories + tenant context + RFC-7807 handling + optimistic updates) is net-new design work, not a pattern to copy wholesale. The design-system *layer*, by contrast, is a well-trodden path — mirror shadcn/MUI conventions closely.

---

## Sources

- [How to Make Your React Component Library Tree Shakeable — Carl Rippon](https://carlrippon.com/how-to-make-your-react-component-library-tree-shakeable/) (ESM, sideEffects, peers) — MEDIUM
- [Tree-Shaking a React Component Library in Rollup — codefeetime](https://www.codefeetime.com/post/tree-shaking-a-react-component-library-in-rollup/) (preserveModules) — MEDIUM
- [Creating a tree-shakable library with tsup — Dor Shinar](https://dorshinar.me/posts/treeshaking-with-tsup) (subpath entries) — MEDIUM
- [React Component Library Performance — ruixen](https://www.ruixen.com/blog/react-lib-performance) (anti-patterns: barrels, icon packs) — LOW
- [Top Headless UI libraries for React in 2026 — GreatFrontend](https://www.greatfrontend.com/blog/top-headless-ui-libraries-for-react-in-2026) (headless landscape, Radix/Base UI) — MEDIUM
- [A Practical Guide to Radix UI — Aidxn](https://aidxn.com/blog/radix-ui-guide/) (controlled/uncontrolled, compound components) — MEDIUM
- [Radix Primitives — official](https://www.radix-ui.com/primitives) (controlled/uncontrolled, a11y) — HIGH
- [Headless UI alternatives: Radix vs React Aria vs Ark vs Base UI — LogRocket](https://blog.logrocket.com/headless-ui-alternatives-radix-primitives-react-aria-ark-ui/) — MEDIUM
- [TanStack Query Custom Hooks — official docs](https://tanstack.com/query/v3/docs/framework/react/examples/custom-hooks) (custom-hooks pattern) — HIGH
- [Optimistic Updates — TanStack Query official docs](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) (cancel→snapshot→rollback→invalidate) — HIGH
- [TanStack Query Reusable Patterns & Optimistic UI — Atomic Object](https://spin.atomicobject.com/tanstack-query-reusable-patterns/) (queryOptions factories) — MEDIUM
- [Unable to use react-query when hooks are in a separate library — TanStack issue #3595](https://github.com/TanStack/query/issues/3595) (peer-dep / context dedupe trap) — HIGH
- [Dark Mode with Design Tokens in Tailwind CSS — Rich Infante](https://www.richinfante.com/2024/10/21/tailwind-dark-mode-design-tokens-themes-css) (hybrid CSS-var + Tailwind) — MEDIUM
- [Theme variables — Tailwind CSS official docs](https://tailwindcss.com/docs/theme) (`@theme`, tokens-as-API, v4 CSS-first) — HIGH
- [Design Tokens That Scale (Tailwind v4 + CSS Variables) — Mavik Labs](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/) (three-tier tokens) — MEDIUM
- [Accessibility in Design Systems — A11Y Pros](https://a11ypros.com/blog/accessibility-in-design-systems) (WCAG baseline, focus, ARIA) — MEDIUM
- [How to Build Accessible Modals with Focus Traps — UXPin](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) (focus trap/restore, inert) — MEDIUM
- [Quality / Accessibility — React Aria official](https://react-spectrum.adobe.com/react-aria/accessibility.html) (focus mgmt, data-attrs) — HIGH
- [Visual tests — Storybook official docs](https://storybook.js.org/docs/writing-tests/visual-testing) — HIGH
- [Accessibility Tests — Chromatic docs](https://www.chromatic.com/docs/accessibility/) (a11y regression baselines, two-gate CI) — HIGH
- ['use client' directive — React official docs](https://react.dev/reference/rsc/use-client) (bundler boundary, SSR still runs) — HIGH
- [Directives: use client — Next.js official docs](https://nextjs.org/docs/app/api-reference/directives/use-client) (library-author guidance: mark entry points only) — HIGH
- [Component Library Authors: bundling server+client components — Next.js discussion #62231](https://github.com/vercel/next.js/discussions/62231) (preserveModules to keep directives) — MEDIUM
- [Semantic Versioning 2.0.0 — official](https://semver.org/) (declare public API, 0.y.z semantics) — HIGH
- [Best Practices for Component Versioning in React — Antler Digital](https://antler.digital/blog/best-practices-for-component-versioning-in-react) (props/events as public API) — MEDIUM
- [RFC 7807: Problem Details for HTTP APIs — RFC Editor](https://www.rfc-editor.org/rfc/rfc7807.html) (type/title/status/detail, don't-parse-detail, security) — HIGH
- [How to Build API Problem Details — OneUptime](https://oneuptime.com/blog/post/2026-01-30-api-problem-details/view) (RFC-9457 supersedes 7807, discriminate on type URI) — MEDIUM
- [Multi-Tenancy in React Applications — Clerk](https://clerk.com/articles/multi-tenancy-in-react-applications-guide) (org-aware query caching, tenant context, fail-closed) — MEDIUM
- [Building a multi-tenant B2B SaaS with Vite + TanStack — Saas UI](https://saas-ui.dev/blog/building-a-multi-tenant-b2b-saas-with-vite-tanstack-router) (provider ordering, QueryClient in context) — MEDIUM
- `.planning/PROJECT.md` (scope, tenancy mismatch, error-envelope mandate, contract-ahead constraint) — internal, HIGH
- `.planning/codebase/UI-REVIEW.md` (alert/confirm overuse, missing loading states, hardcoded chart hex, PageHeader breaks) — internal, HIGH

---
*Feature research for: portable React component library / design-system package with typed-SDK-backed feature surfaces*
*Researched: 2026-05-29*
