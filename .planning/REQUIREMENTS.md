# Requirements: Farsight UI Library (Helm Extraction)

**Defined:** 2026-05-29
**Core Value:** Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — decoupled from Helm's Next.js/Clerk-server/Drizzle stack and wired to the typed `@farsight/contracts`.

## v1 Requirements

Requirements for the initial portable library. Each maps to a roadmap phase.

### Package Foundation

- [x] **PKG-01**: Package builds with subpath `exports` + ESM and `sideEffects: ["**/*.css"]`, tree-shakeable so importing one primitive does not pull in the xyflow canvas or Recharts
- [x] **PKG-02**: `react`, `react-dom`, `@clerk/clerk-react`, `@xyflow/react`, `@tanstack/react-query` declared as `peerDependencies` with root `pnpm.overrides`; `pnpm list react -r` resolves exactly one version
- [x] **PKG-03**: `'use client'` directive is preserved in built output (per-module / `preserveModules`) and asserted in CI
- [x] **PKG-04**: A publish/port artifact build (tsdown or tsup) externalizes all peers and emits `.d.ts`

### Theming

- [x] **THEME-01**: CSS-variable semantic token contract lifted from `app/globals.css` `@theme` and shipped as a `./theme.css` subpath export
- [x] **THEME-02**: Consumer setup documented (`@source` directive + `@xyflow/react` CSS import order); dark mode via `.dark` token override — the library owns the token contract, not the theme toggle/persistence
- [x] **THEME-03**: JS/TS token export so charts read `tokens.chart[1]` instead of hardcoded hex (fixes the UI-REVIEW chart-color / light-mode-tooltip blocker)

### Design-System / Headless Core

- [x] **CORE-01**: Zero `next/*` and `@clerk/nextjs/server` imports across in-scope components, enforced by a CI import-guard
- [x] **CORE-02**: 34 shadcn `ui/` primitives + page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`, `Toaster`) ported with `@/` paths rewritten to package-local
- [x] **CORE-03**: DataGrid/DataTable + `use-data-grid.ts` decoupled-then-ported with characterization tests (ported, not rewritten)
- [x] **CORE-04**: Loading / error / empty states standardized as first-class conventions; `alert()` replaced by Sonner toast and `confirm()` by `ConfirmDialog`
- [x] **CORE-05**: Accessibility baseline — visible focus rings, full keyboard operability, `aria-label` on icon-only buttons

### Adapter Seam + Tenancy

- [ ] **DATA-01**: `<FarsightProvider>` mounts an (injectable) `QueryClient` + Clerk React client + tenant context `{ orgId, orgSlug, role, userId, projectId }`
- [ ] **DATA-02**: Typed SDK client over `@farsight/contracts` attaching the Clerk Bearer token + org header
- [ ] **DATA-03**: `queryOptions`-factory data hooks with tenant-namespaced query keys (`['<resource>', orgId, projectId, …]`) — no cross-tenant cache bleed on org switch
- [ ] **DATA-04**: RFC-7807/9457 `ApiErrorEnvelope` parsed into a typed error discriminated on the `type` URI (status / detail / extension members surfaced; `detail` never parsed for control flow)
- [ ] **DATA-05**: Org/project tenancy remodel — both scope axes plus `role` modeled from the start; no per-`userId` assumptions carried over from Helm
- [ ] **DATA-06**: Optimistic mutation updates encoded in mutation-hook factories; end-to-end type flow (rename a `@farsight/contracts` field → compile error at the call site)

### Notifications + Webhooks Surface (adapter proving ground — live endpoints)

- [ ] **NOTIF-01**: Notifications inbox + notification-preferences UI bound to the live `/me/notifications` + `/me/notification-preferences` endpoints
- [ ] **NOTIF-02**: Outbound-webhooks management UI (register, list, toggle/eventTypes, rotate signing secret, delete) on the live webhooks endpoints

### Datasets Surface

- [ ] **DSET-01**: Datasets list/detail + RAG search UI bound to Farsight `datasets` contracts (UI only — no ingestion/chunking/pgvector backend)

### Pipelines Surface

- [ ] **PIPE-01**: Pipelines `@xyflow/react` canvas + run views bound to `pipelines` / `pipeline_runs` contracts; locks the xyflow CSS import-order contract with a visual smoke test

### Agents Surface

- [ ] **AGNT-01**: Agents definitions + canvas + run-history UI bound to Farsight `agents` contracts

### Monorepo Integration

- [ ] **PORT-01**: Verified `workspace:*` consumption from a minimal external Vite consumer — utility classes resolve via `@source`, tokens apply, canvases render (not validated only inside Helm)
- [ ] **PORT-02**: Consumer-setup README — required peer versions, `@source` config, xyflow CSS import order, and `<FarsightProvider>` mount

## v2 Requirements

Acknowledged, deferred — not in the current roadmap.

### Tooling & Polish

- **TOOL-01**: Storybook stories per component (living docs + decoupled-render verification)
- **TOOL-02**: Chromatic visual + accessibility regression in CI
- **TOOL-03**: Suspense-ready hook variants (`useSuspenseQuery`)
- **TOOL-04**: Headless / `asChild` escape-hatch seams on feature surfaces (only once real Helm↔Farsight divergence appears)
- **TOOL-05**: 1.0 release + strict SemVer (once Farsight Phase 1 contracts stabilize)
- **TOOL-06**: shadcn private registry (only if Farsight gains apps outside the monorepo)

## Out of Scope

Explicitly excluded — documented to prevent scope creep. Most are anti-features surfaced in research.

| Feature | Reason |
|---------|--------|
| Library owning theme toggle + persistence | App-shell concern (storage, FOUC script, system-pref listener) belongs to `apps/web`; library owns only the token contract |
| Auto-toast on every mutation error | Library can't know the app's UX; surfaces typed errors + a consumer-registered `onError` instead |
| Single barrel `index.ts` / single-file bundle | Defeats tree-shaking and strips `'use client'`; per-component subpath exports + unbundled output instead |
| Re-exporting `@clerk/nextjs/server` helpers | Server-only Next coupling — exactly what's being stripped; use Clerk React client (peer) |
| Per-`userId` tenancy assumptions in the adapter | Farsight is org/project scoped; per-user keys silently return wrong data / risk cache bleed |
| App shell / routing / navigation ownership | `apps/web` shell is the consumer's; export presentational nav primitives that take `href`/`onClick` |
| Knowledge ingestion / chunking / pgvector backend | Farsight owns its backend; only the dataset UI travels |
| CRM (prospects/contacts/companies/deals/segments), campaigns, email/workflow canvas | Not part of Farsight's domain |
| Building / modifying the Farsight backend (`@farsight/api`) | Already mature, deployed, and tested |
| The Farsight `apps/web` app shell itself | This project produces a library, not the consuming app |

## Traceability

Each requirement maps to exactly one phase. See `.planning/ROADMAP.md` for phase detail.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PKG-01 | Phase 1 | Complete |
| PKG-02 | Phase 1 | Complete |
| PKG-03 | Phase 1 | Complete |
| PKG-04 | Phase 1 | Complete |
| THEME-01 | Phase 1 | Complete |
| THEME-02 | Phase 1 | Complete |
| THEME-03 | Phase 1 | Complete |
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Complete |
| CORE-03 | Phase 2 | Complete |
| CORE-04 | Phase 2 | Complete |
| CORE-05 | Phase 2 | Complete |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| DATA-05 | Phase 3 | Pending |
| DATA-06 | Phase 3 | Pending |
| NOTIF-01 | Phase 3 | Pending |
| NOTIF-02 | Phase 3 | Pending |
| DSET-01 | Phase 4 | Pending |
| PIPE-01 | Phase 4 | Pending |
| AGNT-01 | Phase 4 | Pending |
| PORT-01 | Phase 4 | Pending |
| PORT-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after roadmap creation (traceability populated)*
