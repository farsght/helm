# Phase 2: Headless Core Port - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Port Helm's design-system core into `packages/ui` framework-clean: the 34 `components/ui/*` primitives, the page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`, and a **new** `Toaster`), and the DataGrid/DataTable surfaces (`components/data-grid/*` ~17 files, `components/data-table/*` ~9 files, `hooks/use-data-grid.ts`, `hooks/use-data-table.ts`, `lib/data-grid*.ts`, `lib/data-table.ts`, `types/data-grid.ts`, `types/data-table.ts`). Delivers: a CI import-guard proving zero `next/*` and zero `@clerk/nextjs/server` across in-scope components, `@/` paths rewritten package-local (`../../lib/utils`), loading/error/empty conventions as first-class primitives, and an accessibility baseline (focus rings, keyboard operability, `aria-label` on icon-only buttons).

**Grounding fact that reshapes the work:** the in-scope dirs (`ui/`, `page/`, `data-grid/`, `data-table/`) already have **zero** `next/*`/`@clerk/*` imports and **zero** `alert()`/`confirm()`. CORE-01 and the "ported components are alert/confirm-free" half of CORE-04 are therefore largely a *CI-guard + alias-rewrite + ship-the-primitives* job, not a decoupling job. The only real framework coupling is the DataTable's URL-state path (`use-data-table.ts` + `lib/parsers.ts` via `nuqs`).

Requirements in scope: **CORE-01, CORE-02, CORE-03, CORE-04, CORE-05** (see `.planning/REQUIREMENTS.md`).

</domain>

<decisions>
## Implementation Decisions

### Loading / Error / Empty convention (CORE-04)
- **D-01:** Convention takes the form of a **presentational component trio + docs** — NOT a single status-driven wrapper, NOT docs-only. Phase 2 is pre-data; these are presentational primitives the Phase 3 adapter seam later wires to real query states.
- **D-02:** Keep the existing `<EmptyState>`; **add a new sibling `<ErrorState>`** that is **purely presentational** — props are `title?`, `description?`, `icon?` (Lucide), `onRetry?: () => void`, `action?: ReactNode`. It knows nothing about HTTP/RFC-7807. Phase 3's adapter maps the typed `ApiErrorEnvelope` into these props. Do NOT import or repeat any error-contract shape in Phase 2.
- **D-03:** Loading primitives shipped: the base `<Skeleton>` + the existing `data-grid-skeleton` / `data-table-skeleton` (travel with their components) **plus NEW prebuilt layout skeletons** as named primitives: `card-grid-skeleton`, `list-skeleton`, `detail-skeleton`. (User explicitly chose the richer set over a minimal "compose-your-own" recipe.)
- **D-04:** Document the call-site convention (`isLoading → skeleton`, `error → <ErrorState onRetry>`, `empty → <EmptyState>`, else render). Enforcement of "every data surface renders all three branches" lands naturally when surfaces are built (Phase 3/4) — Phase 2 ships the primitives + the documented convention.

### DataTable URL-state coupling (CORE-03)
- **D-05:** The ported **DataTable** uses an **injectable/optional** URL-state model: default to **internal React state** (works standalone with zero consumer wiring), and expose **controlled `state` / `onStateChange` props** for opt-in URL persistence. `nuqs` is removed from the library's surface and becomes an `apps/web` detail (parallel to the theme-toggle precedent: library owns behavior, not routing/shell state).
- **D-06:** This is a **wrapper seam, not a hook rewrite** — stays inside the CORE-03 "ported, not rewritten" bar. The heavy **DataGrid** (`use-data-grid.ts`) is already framework-clean (no `next`/`nuqs`/`clerk`) — **no change** to its state model.
- **D-07:** Phase 2 ships only the **controlled props + docs** for the opt-in URL-sync pattern. The **live URL-sync wiring** (nuqs/react-router round-trip) is **proven by the Phase 4 external Vite consumer (PORT-01)** — Phase 2 stays headless/pre-routing. `lib/parsers.ts` (nuqs parsers) does not need to travel into the package core; it can serve as the reference impl for the consumer-side adapter doc.

### alert() / confirm() scope (CORE-04)
- **D-08:** Phase 2 covers **ship-primitives-+-convention only**. Concretely: port `ConfirmDialog`; create the **new `Toaster`** (Sonner wrapper — no sonner/toast primitive exists in `components/ui/` today); document the convention (destructive → `ConfirmDialog`, transient → toast, never `alert()`/`confirm()`); CI guard asserts the package stays `alert()`/`confirm()`-free.
- **D-09:** **Do NOT refactor Helm's in-repo `alert()`/`confirm()` call sites.** The UI-REVIEW's 48 `alert()` / 9 `confirm()` all live in out-of-scope Helm `*-client.tsx` surfaces (CRM/campaigns/settings) that are not traveling to Farsight. Per PROJECT.md: "Helm continues to run; we mine its components, we don't refactor Helm in place beyond what extraction requires."

### Toaster theming (CORE-04 / packaging)
- **D-10:** The new `Toaster` is **theme-hook integrated** via `next-themes` (`useTheme()` → Sonner `theme`), with `next-themes` declared as an **OPTIONAL `peerDependency`** (not a bundled dependency). The library **reads** the active theme; the consumer (`apps/web`) **owns** the `ThemeProvider` + toggle/persistence/FOUC. Degrades gracefully to `theme="system"` if the consumer doesn't use `next-themes`. `next-themes` is React-generic (not Next-coupled despite the name) so it does not violate the CORE-01 `next/*` import guard — **but the import-guard rule must allow `next-themes` while still blocking `next/*`.**
- **D-11:** **PROJECT.md reconciliation required at next transition:** the out-of-scope line "Library owning theme toggle + persistence" needs a clarifying note that the library now carries a **read-only** `next-themes` peer for the Toaster (reads theme; does not own toggle/persistence). Flag for `/gsd-transition`.

### Claude's Discretion
- Exact file/dir layout of the new skeleton primitives and `ErrorState` within `packages/ui/src/` (planner/PATTERNS to assign; follow the Phase 1 alias-rewrite + per-module export conventions).
- Mechanism of the CI import-guard (lint rule vs. grep script vs. dependency-cruiser) — pick what's cheapest and CI-friendly; it must encode three rules: (1) no `next/*`, (2) no `@clerk/nextjs/server`, (3) no `alert(`/`confirm(` in package source — while explicitly allowing `next-themes`.
- Whether the page-primitive barrel (`components/page/index.ts`) is preserved as a grouped subpath or exploded into per-component subpaths — default to per-component subpaths consistent with Phase 1's "no single barrel" decision, but a `./page` grouped subpath is acceptable if it keeps `'use client'`/tree-shaking intact.
- Characterization-test surface for the DataGrid/DataTable port — pin behavior against the internal-state default; the planner sets the bar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 2: Headless Core Port" — goal + 5 success criteria (the authoritative phase boundary)
- `.planning/REQUIREMENTS.md` § "Design-System / Headless Core" — CORE-01..CORE-05 definitions + traceability
- `.planning/PROJECT.md` — Constraints (framework-agnostic, no Next runtime deps), Out-of-Scope (theme toggle/persistence, single barrel, per-userId tenancy), Key Decisions table

### Phase 1 inheritance (LOCKED — must read before porting)
- `.planning/phases/01-package-foundation-theming/01-PATTERNS.md` — **the alias-rewrite rule (`@/lib/utils` → `../../lib/utils`, two levels, verified empirically), the 26/34 `'use client'` inventory, `data-slot`/named-export/no-default conventions, and the per-component port pattern.** This is the single most load-bearing reference for the port mechanics.
- `.planning/phases/01-package-foundation-theming/01-RESEARCH.md` — packaging patterns (exports map, tsdown `unbundle`, peer-dep shape) that constrain how new primitives are exported
- `.planning/phases/01-package-foundation-theming/01-SUMMARY.md` (× 01-01/02/03) — what shipped in Phase 1 (`theme.css`, `tokens.ts`, Button/Label walking skeleton, CI grep ≥ 26)

### Conventions & quality bar
- `.planning/codebase/CONVENTIONS.md` — DataGrid conventions (`DataGrid` takes only `tableMeta`/`columns`/`contextMenu`; cell variants use effect-based syncing for React Compiler compat), PageHeader `actions`-prop rule, named-export discipline
- `.planning/codebase/UI-REVIEW.md` — origin of CORE-04/CORE-05; documents the `alert()`/`confirm()` call-site inventory (all in OUT-OF-SCOPE surfaces — do not "fix" them), the loading-skeleton pattern to standardize on, and the icon-only-button `aria-label` gaps
- `.planning/codebase/STRUCTURE.md` — source layout of the dirs being ported

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/page/{page-header,empty-state,confirm-dialog}.tsx` + `index.ts` barrel — port targets; `EmptyState` is the template for the new `ErrorState`.
- `components/data-grid/data-grid-skeleton.tsx`, `components/data-table/data-table-skeleton.tsx` — existing skeletons; the base for the new `card-grid`/`list`/`detail` skeletons. Base `<Skeleton>` lives in `components/ui/skeleton.tsx` (one of the 34, server-safe — no `'use client'`).
- `lib/utils.ts` `cn()` — already lifted to `packages/ui/src/lib/utils` in Phase 1; all ports import via `../../lib/utils`.
- `hooks/use-data-grid.ts` (3273 lines, framework-clean) and `hooks/use-data-table.ts` (nuqs-coupled) — the two large hooks to port.

### Established Patterns
- **Per-component subpath exports + per-module `'use client'` preservation** (Phase 1). 26/34 `ui/` primitives carry `'use client'` on line 1; CI asserts ≥ 26 survive the build.
- **Alias rewrite is the only required transform** for the 34 `ui/` files: `@/lib/utils` → `../../lib/utils`; cross-component imports → same-dir relative.
- **Sonner is already a dep** (`sonner ^2.0.7`) and used correctly in Helm surfaces; the package just needs the themed `Toaster` wrapper (which doesn't exist as a primitive yet).
- `nuqs ^2.8.9` URL-state lives in `hooks/use-data-table.ts` + `lib/parsers.ts` — the seam to make injectable.

### Integration Points
- `packages/ui/src/components/{ui,page,data-grid,data-table}/` — destination dirs.
- `packages/ui/package.json` — add `next-themes` as optional peer (D-10); confirm `sonner` placement (dependency vs peer) during planning, consistent with the Phase 1 peer-dep hygiene gate.
- CI import-guard wires into the existing Phase 1 CI (which already runs the `'use client'` grep assertion).
- `lucide-react` — Helm is on `^0.576.0`; STATE flags a major bump to 1.x. Audit icon imports across page primitives during the port (deferred decision below).

</code_context>

<specifics>
## Specific Ideas

- User explicitly wanted the **richer skeleton set** (prebuilt `card-grid`/`list`/`detail` layout skeletons), accepting slightly more surface area now in exchange for consumers not hand-rolling them.
- User explicitly chose to **integrate the Toaster with `next-themes`** for real light/dark sync (over a thin token-only pass-through), then accepted the **optional-peer** modeling so it stays consistent with the "library doesn't own theme state" boundary.
- `<ErrorState>` API shape was previewed and accepted: `{ title?, description?, icon?, onRetry?, action? }`.
- DataTable controlled-seam shape was previewed and accepted: `<DataTable state={…} onStateChange={…} />` with internal-state default.

</specifics>

<deferred>
## Deferred Ideas

- **Nav & sidebar primitives** (offered as a gray area, not selected for discussion): Phase 2 ships only the roadmap inventory. `components/app-sidebar.tsx` (uses `next/link`, `usePathname`, `@clerk/nextjs` `UserButton`) does **not** travel in Phase 2 — it needs real decoupling (href/onClick injection + Clerk-React/slot for the user button). PROJECT.md's "export presentational nav primitives that take href/onClick" is a **later-phase** concern. (`components/sidebar.tsx`, the shadcn primitive at `components/` root, is not among the 34 `ui/` files; whether it travels is also deferred.)
- **`lucide-react` major bump** (Helm `^0.576.0` → 1.x, flagged in STATE): audit icon imports during the port. Default leaning: pin to a version Farsight (greenfield) can adopt; decide concrete version during planning/research. Not a discussion-level decision.
- **a11y verification mechanism** (axe / `eslint-plugin-jsx-a11y` / manual checklist for CORE-05): planner's choice; not discussed.
- **Live URL-sync proof** for DataTable: explicitly pushed to Phase 4 / PORT-01 (the external Vite consumer with real routing).

</deferred>

---

*Phase: 2-Headless Core Port*
*Context gathered: 2026-05-29*
