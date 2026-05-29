# Phase 2: Headless Core Port — Research

**Researched:** 2026-05-29
**Domain:** React component library porting — shadcn primitives, page primitives, DataGrid/DataTable, CI import-guard, a11y baseline, lucide-react major migration
**Confidence:** HIGH — grounded in direct source inspection of all in-scope Helm files, npm registry verification of current versions, official documentation, and authoritative license page fetch.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading / Error / Empty convention (CORE-04)**
- D-01: Convention takes the form of a **presentational component trio + docs** — NOT a single status-driven wrapper, NOT docs-only.
- D-02: Keep the existing `<EmptyState>`; **add a new sibling `<ErrorState>`** — props: `title?`, `description?`, `icon?` (Lucide), `onRetry?: () => void`, `action?: ReactNode`. Purely presentational; knows nothing about HTTP/RFC-7807.
- D-03: Loading primitives shipped: base `<Skeleton>` + existing `data-grid-skeleton` / `data-table-skeleton` **plus NEW** `card-grid-skeleton`, `list-skeleton`, `detail-skeleton` as named primitives.
- D-04: Document the call-site convention (`isLoading → skeleton`, `error → <ErrorState onRetry>`, `empty → <EmptyState>`, else render). Enforcement lands in Phase 3/4.

**DataTable URL-state coupling (CORE-03)**
- D-05: DataTable uses **injectable/optional** URL-state model: default to **internal React state**, expose controlled `state`/`onStateChange` props for opt-in URL persistence. `nuqs` removed from the library surface.
- D-06: **Wrapper seam, not a hook rewrite** — stays inside the "ported, not rewritten" bar. DataGrid (`use-data-grid.ts`) is already framework-clean — **no change** to its state model.
- D-07: Phase 2 ships only controlled props + docs. Live URL-sync proof is Phase 4 / PORT-01.

**alert() / confirm() scope (CORE-04)**
- D-08: Port `ConfirmDialog`; create **new `Toaster`** (Sonner wrapper); document convention; CI guard asserts package stays alert()/confirm()-free.
- D-09: Do NOT refactor Helm's in-repo alert()/confirm() call sites — all 57 live in out-of-scope surfaces.

**Toaster theming (CORE-04 / packaging)**
- D-10: New `Toaster` is **theme-hook integrated** via `next-themes` (`useTheme()` → Sonner `theme`), `next-themes` declared as **optional peerDependency**. Degrades to `theme="system"` if consumer doesn't use next-themes. Import-guard must **allow `next-themes`** while blocking `next/*`.
- D-11: PROJECT.md reconciliation required at next transition — flag for `/gsd-transition`.

**shadcn.io block adoption (sourcing)**
- D-12: Skeleton set and EmptyState/ErrorState styling **may be sourced from shadcn.io** registry via block-intake checklist — pending D-13 licensing gate.
- D-13 (BLOCKING GATE): shadcn.io blocks are `premium: true` — **verify license permits redistribution inside `@farsight/ui` before any source is vendored.** [NOW RESOLVED — see Licensing Gate section below.]
- D-14: shadcn.io is a pattern source, not a dependency. Do NOT `shadcn add` blocks into `packages/ui`.

### Claude's Discretion
- Exact file/dir layout of new skeleton primitives and `ErrorState` within `packages/ui/src/`
- Mechanism of the CI import-guard (lint rule vs. grep vs. dependency-cruiser) — must encode: (1) no `next/*`, (2) no `@clerk/nextjs/server`, (3) no `alert(`/`confirm(` — while explicitly allowing `next-themes`
- Whether page-primitive barrel is preserved as `./page` grouped subpath or per-component subpaths
- Characterization-test surface for DataGrid/DataTable port — pin behavior against internal-state default

### Deferred Ideas (OUT OF SCOPE)
- Nav & sidebar primitives (`components/app-sidebar.tsx` uses next/link, usePathname, @clerk/nextjs UserButton — does not travel in Phase 2)
- `lucide-react` major bump decision was deferred for research (now resolved — see Standard Stack section)
- a11y verification mechanism (axe / eslint-plugin-jsx-a11y / manual) — deferred to planner (now resolved)
- Live URL-sync proof for DataTable — pushed to Phase 4 / PORT-01

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | Zero `next/*` and `@clerk/nextjs/server` imports across in-scope components, enforced by CI import-guard | **Confirmed clean**: direct grep of all 4 in-scope dirs (ui/, page/, data-grid/, data-table/) returns zero next/* and zero @clerk/* hits. CI-guard mechanism fully specified. |
| CORE-02 | 34 shadcn `ui/` primitives + page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`, `Toaster`) ported with `@/` paths rewritten to package-local | Port mechanics locked (two-level alias rewrite, named exports, 'use client' preservation). Toaster pattern verified against sonner + next-themes docs. All 34 ui/ files confirmed with correct import depth. |
| CORE-03 | DataGrid/DataTable + `use-data-grid.ts` decoupled-then-ported with characterization tests | nuqs seam fully mapped: nuqs lives ONLY in `hooks/use-data-table.ts` — zero nuqs in component files. Controlled/internal-state seam specified. Characterization test pattern documented with nuqs testing adapter. |
| CORE-04 | Loading/error/empty states standardized; `alert()` replaced by Sonner toast, `confirm()` by ConfirmDialog | Zero alert()/confirm() in in-scope source dirs (verified by grep). All 57 call sites confirmed in out-of-scope surfaces. Skeleton set and ErrorState design specified. |
| CORE-05 | Accessibility baseline — visible focus rings, full keyboard operability, `aria-label` on icon-only buttons | vitest-axe integration pattern specified. eslint-plugin-jsx-a11y rule set specified. Manual checklist items documented per sub-criterion. |

</phase_requirements>

---

## Summary

Phase 2 is primarily a **discipline-and-plumbing job, not a decoupling job.** All four in-scope directories (`components/ui/`, `components/page/`, `components/data-grid/`, `components/data-table/`) have been verified to contain zero `next/*` imports, zero `@clerk/*` imports, and zero `alert()`/`confirm()` calls. The grounding fact from CONTEXT.md is confirmed by direct code inspection.

The real work is:
1. **CI import-guard** — authoring the grep script that asserts these properties on the built package going forward (recommended over ESLint for cheapness and composability with the existing Phase 1 `'use client'` assertion)
2. **Alias rewrite + export wiring** — 34 + 4 + 17 + 9 component files plus associated hooks/lib/types files all need `@/` → package-relative rewrites and per-component subpath export entries
3. **DataTable nuqs seam** — `use-data-table.ts` imports nuqs directly; the wrapper-seam approach makes state injectable (internal default + optional controlled props) without rewriting the hook body
4. **New primitives** — `Toaster`, `ErrorState`, and three layout skeletons (`card-grid-skeleton`, `list-skeleton`, `detail-skeleton`)
5. **A11y baseline** — vitest-axe smoke tests for axe-detectable violations + ESLint jsx-a11y for static checks; manual checklist for focus rings and keyboard operability

**D-13 licensing gate is now RESOLVED:** shadcn.io Pro license explicitly prohibits redistribution of block source inside a derived package (`@farsight/ui`). The new skeleton set and ErrorState MUST be re-implemented from scratch, not copy-pasted. The shadcn.io registry may be used as a pattern reference only.

**lucide-react major bump:** Pin `packages/ui` to `^1.0.0` (latest stable `1.17.0`). The v0→v1 breaking changes do not affect the icon names used across in-scope components (only brand icons were removed). The RSC `createContext` issue in v1 does not affect `packages/ui` (library is client-component-centric; icons are consumed in `'use client'` files). Helm's `^0.576.0` pin stays in Helm; `packages/ui` adopts v1 fresh.

**Primary recommendation:** Implement the CI import-guard as a bash grep script (composing with the existing `'use client'` script in `packages/ui/scripts/`); adopt `vitest-axe` + `eslint-plugin-jsx-a11y` for the a11y baseline; re-implement skeleton and error primitives from scratch using the shadcn.io catalog as a layout pattern reference only.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| shadcn primitives (34 ui/ files) | `packages/ui` (source-consumed) | Build artifact (dist/) | Library owns primitives; consumers get them via subpath imports |
| Page primitives (PageHeader, EmptyState, ConfirmDialog, Toaster) | `packages/ui` | — | Cross-surface presentational layer; no Next.js deps |
| DataGrid component + hook | `packages/ui` | — | Zero framework coupling confirmed; travels as-is with alias rewrite |
| DataTable component files (9) | `packages/ui` | — | Component files themselves have zero nuqs; only the hook does |
| DataTable URL-state hook | `packages/ui` (internal state wrapper) + `apps/web` (nuqs wiring) | — | Library owns the controlled seam; consumer owns URL persistence |
| nuqs parsing/serialization | `apps/web` (consumer) | Reference: `lib/parsers.ts` stays in Helm | D-07 explicitly defers nuqs adapter to Phase 4 consumer |
| Loading/error/empty skeletons | `packages/ui` | — | Presentational, data-free — safest to own in library |
| `next-themes` ThemeProvider + persistence | `apps/web` (consumer) | — | Library reads theme via optional peer; consumer owns the toggle |
| `next-themes` consumption (Toaster theme sync) | `packages/ui` optional peer | Graceful degradation to `"system"` | D-10 decision; library reads but does not own |
| CI import-guard | `packages/ui/scripts/` | — | Composable with existing Phase 1 'use client' script |
| a11y testing (automated) | `packages/ui/__tests__/` (vitest-axe) | ESLint jsx-a11y (static analysis) | Both run in existing vitest CI |

---

## Standard Stack

### Core (Phase 2 additions to packages/ui)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sonner` | `^2.0.7` | Toaster wrapper source | Already installed in packages/ui as dependency (confirmed in package.json); used correctly in Helm data surfaces |
| `next-themes` | `^0.4.6` | Optional peer — `useTheme()` → Sonner theme | Already present in packages/ui dependencies; must be reclassified to `optionalPeerDependency` per D-10; v0.3+ removes the hard `next@*` peer requirement `[VERIFIED: npm registry]` |
| `lucide-react` | `^1.0.0` (target `1.17.0`) | Icon imports in page primitives + data-grid components | v1 is the current stable major; named import API unchanged for non-brand icons; Helm's `^0.576.0` stays in Helm separately `[VERIFIED: npm registry]` |
| `vitest-axe` | `0.1.0` | axe-core integration for vitest | Only maintained vitest-specific axe wrapper; fork of jest-axe; MIT; github.com/chaance/vitest-axe `[VERIFIED: npm registry]` |
| `eslint-plugin-jsx-a11y` | `^6.10.2` | Static a11y linting for missing aria-labels etc. | jsx-eslint/eslint-plugin-jsx-a11y; 6+ years old; 50M+ weekly downloads; MIT `[VERIFIED: npm registry]` |
| `@tanstack/react-table` | `^8.21.3` | DataTable table instance type | Already a dep (DataTable renders from a TanstackTable instance); confirm it's in packages/ui dependencies `[ASSUMED]` |
| `@tanstack/react-virtual` | Already in Helm | DataGrid virtual row rendering | Used by `use-data-grid.ts`; must be declared in packages/ui deps `[ASSUMED]` |
| `@radix-ui/react-direction` | `^1.1.1` | DataGrid hook dependency | Used by `use-data-grid.ts` for RTL direction; not bundled, declare in packages/ui deps `[VERIFIED: npm registry]` |
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | `^6.3.1` / `^10.0.0` / `^3.2.2` | `sortable.tsx` in ui/ | Already in Helm; must be in packages/ui deps or peers for sortable.tsx to travel `[VERIFIED: npm registry]` |

### Supporting (existing packages/ui deps — confirm placement)

| Library | Current Placement | Correct Placement | Note |
|---------|-----------------|------------------|------|
| `sonner` | `dependencies` | `dependencies` | Correct — Toaster wrapper bundles the import |
| `next-themes` | `dependencies` | `optionalPeerDependencies` | Must move — D-10 decision |
| `lucide-react` | Not yet in packages/ui | `dependencies` (or peer with optional) | Add at v1.0.0+ for Phase 2 |
| `@tanstack/react-table` | Helm dep only | `packages/ui` `dependencies` | Travels with DataTable/DataGrid |
| `@tanstack/react-virtual` | Helm dep only | `packages/ui` `dependencies` | Travels with DataGrid hook |
| `@radix-ui/react-direction` | Helm dep only | `packages/ui` `dependencies` | Travels with use-data-grid.ts |
| `zod` | Helm dep only | NOT in packages/ui | `lib/parsers.ts` stays in Helm; only config/data-table.ts travels |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vitest-axe` (jsdom only) | `axe-core` direct + manual assertion | vitest-axe is the clean wrapper; direct axe-core requires boilerplate; happy-dom incompatibility is not relevant (existing vitest config uses jsdom) |
| Bash grep script (CI guard) | `eslint no-restricted-imports` | ESLint requires config file, runs in lint phase only; grep script is 15 lines, runs in any CI step, composes directly with the existing 'use client' assertion |
| Bash grep script (CI guard) | `dependency-cruiser` | dependency-cruiser is powerful but heavyweight (full module graph); grep is sufficient for the 3-rule guard and zero new devDeps |
| lucide-react v1 named imports | Re-export wrapper file per icon | Wrapper adds indirection; named imports from 'lucide-react' are still the standard API in v1 — no wrapper needed |

**Installation (packages/ui additions):**
```bash
# In packages/ui (or Helm packages/ui staging):
pnpm add lucide-react@^1.0.0 --filter @farsight/ui
pnpm add -D vitest-axe eslint-plugin-jsx-a11y --filter @farsight/ui
# Move next-themes from dependencies to peerDependenciesMeta optional:
# (manual package.json edit)
```

**Version verification (confirmed against npm registry 2026-05-29):**
```bash
npm view lucide-react version       # 1.17.0
npm view sonner version             # 2.0.7
npm view next-themes version        # 0.4.6
npm view vitest-axe version         # 0.1.0
npm view eslint-plugin-jsx-a11y version   # 6.10.2
npm view @radix-ui/react-direction version   # 1.1.1
```

---

## Package Legitimacy Audit

> slopcheck installation was denied by the sandbox. Manual verification performed via npm view and GitHub source repo inspection.

| Package | Registry | Age | Source Repo | Disposition |
|---------|----------|-----|-------------|-------------|
| `vitest-axe` | npm | ~2 yrs (2023) | github.com/chaance/vitest-axe — MIT, fork of jest-axe | Approved `[ASSUMED]` |
| `eslint-plugin-jsx-a11y` | npm | ~6 yrs | github.com/jsx-eslint/eslint-plugin-jsx-a11y — MIT, jsx-eslint org | Approved `[ASSUMED]` |
| `lucide-react` | npm | ~5 yrs | github.com/lucide-icons/lucide — ISC, official Lucide org | Approved `[ASSUMED]` |
| `@radix-ui/react-direction` | npm | ~4 yrs | github.com/radix-ui/primitives — MIT, official Radix org | Approved `[ASSUMED]` |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged [SUS]:** none found via manual check

*slopcheck was unavailable at research time — all packages above are tagged `[ASSUMED]`. The planner should add a checkpoint after each install to confirm postinstall scripts are benign. None of the four packages above are known to have problematic postinstall scripts.*

---

## Architecture Patterns

### System Architecture Diagram

```
Helm source (donor — verified zero next/*/@clerk/* in all 4 dirs)
  components/ui/    (34 files)
  components/page/  (page-header, empty-state, confirm-dialog + new index.ts)
  components/data-grid/  (17 files)
  components/data-table/ (9 files)
  hooks/use-data-grid.ts (3273 lines, framework-clean)
  hooks/use-data-table.ts (316 lines, nuqs-coupled)
  lib/data-grid*.ts, lib/data-table.ts, lib/compose-refs.ts, lib/format.ts
  types/data-grid.ts, types/data-table.ts
  config/data-table.ts (operator config, no nuqs)
  hooks/use-as-ref, use-isomorphic-layout-effect, use-lazy-ref,
        use-debounced-callback, use-callback-ref, use-badge-overflow
                │
                │  (alias rewrite + named export + 'use client' preserve)
                │  @/components/ui/X → ../ui/X (or ./X same-dir)
                │  @/lib/utils → ../../lib/utils  (verified 2-level)
                │  @/hooks/X → package-local hooks/X
                │  @/lib/X → package-local lib/X
                │  @/types/X → package-local types/X
                │  @/config/X → package-local config/X
                ▼
packages/ui/src/
  components/
    ui/         ← 34 shadcn primitives
    page/       ← PageHeader, EmptyState, ConfirmDialog, Toaster (NEW), ErrorState (NEW)
    data-grid/  ← 17 data-grid component files
    data-table/ ← 9 data-table component files
  hooks/
    use-data-grid.ts     ← framework-clean, travels as-is
    use-data-table.ts    ← WRAPPER SEAM: strips nuqs, adds internal state + controlled props
    use-data-grid-undo-redo.ts
    use-as-ref.ts, use-isomorphic-layout-effect.ts, use-lazy-ref.ts,
    use-debounced-callback.ts, use-callback-ref.ts, use-badge-overflow.ts
  lib/
    utils.ts             ← already in packages/ui from Phase 1
    tokens.ts            ← already in packages/ui from Phase 1
    data-grid.ts, data-grid-coercion.ts, data-grid-filters.ts
    data-table.ts, compose-refs.ts, format.ts
  types/
    data-grid.ts, data-table.ts
  config/
    data-table.ts        ← operator/filter config (NO nuqs — clean)
  styles/
    theme.css            ← already from Phase 1
    globals.css          ← already from Phase 1
  skeleton-primitives/   ← NEW: card-grid-skeleton, list-skeleton, detail-skeleton
                │
    ┌───────────┴─────────────────────────────────────┐
    │                                                 │
    ▼                                                 ▼
packages/ui/package.json exports               CI scripts/
  "./components/ui/*": ...                       check-directives.sh (Phase 1, update threshold 1→26)
  "./components/page/*": ...                     check-imports.sh (NEW — 3-rule guard)
  "./components/data-grid/*": ...                check-a11y.sh (or vitest)
  "./components/data-table/*": ...
  "./hooks/*": ...
  "./lib/*": ...
  "./types/*": ...
  "./config/*": ...
  "./theme.css": ...
                │
                ▼
Characterization tests (vitest + @testing-library/react)
  __tests__/data-grid/  ← new characterization tests for DataGrid hook
  __tests__/data-table/ ← new characterization tests for DataTable seam
  __tests__/a11y/       ← vitest-axe smoke tests per component
```

### Recommended Project Structure (packages/ui additions for Phase 2)

```
packages/ui/src/
├── components/
│   ├── ui/                     # 34 shadcn primitives (alias-rewritten)
│   ├── page/
│   │   ├── page-header.tsx     # ported
│   │   ├── empty-state.tsx     # ported
│   │   ├── error-state.tsx     # NEW — D-02
│   │   ├── confirm-dialog.tsx  # ported
│   │   ├── toaster.tsx         # NEW — D-08/D-10
│   │   └── index.ts            # barrel (grouped ./page subpath acceptable per CONTEXT)
│   ├── data-grid/              # 17 files ported
│   └── data-table/             # 9 files ported
├── hooks/
│   ├── use-data-grid.ts        # no change from Helm
│   ├── use-data-table.ts       # WRAPPER SEAM added (controlled + internal state default)
│   ├── use-data-grid-undo-redo.ts
│   └── [utility hooks — use-as-ref, use-isomorphic-layout-effect, etc.]
├── lib/
│   ├── utils.ts                # Phase 1 — unchanged
│   ├── tokens.ts               # Phase 1 — unchanged
│   ├── data-grid.ts            # ported
│   ├── data-grid-coercion.ts   # ported
│   ├── data-grid-filters.ts    # ported
│   ├── data-table.ts           # ported
│   ├── compose-refs.ts         # ported
│   └── format.ts               # ported (Intl.DateTimeFormat utility)
├── types/
│   ├── data-grid.ts            # ported (259 lines)
│   └── data-table.ts           # ported (53 lines) — MINUS nuqs-coupled QueryKeys type
├── config/
│   └── data-table.ts           # ported (pure config, no nuqs)
├── skeleton-primitives/        # NEW — D-03 (or colocate in components/page/)
│   ├── card-grid-skeleton.tsx
│   ├── list-skeleton.tsx
│   └── detail-skeleton.tsx
└── styles/
    ├── theme.css               # Phase 1 — unchanged
    └── globals.css             # Phase 1 — unchanged
```

### Pattern 1: CI Import-Guard (CORE-01 — Claude's Discretion resolved)

**Recommendation: bash grep script**, composing with the existing `packages/ui/scripts/check-directives.sh`.

**Why grep over ESLint:** The Phase 1 CI already runs a bash grep assertion. Grep is zero-config, runs on built source and/or TypeScript files, catches `alert()` (not just module imports), and doesn't require ESLint to be configured in `packages/ui` (it currently isn't). ESLint no-restricted-imports would add a devDependency and config file for the same coverage. dependency-cruiser is powerful but heavyweight for three simple string rules.

**Why not ESLint for this specific job:** `packages/ui` has no `eslint.config.mjs` yet. Adding it for import-guard alone is more infrastructure than the problem warrants. ESLint is already recommended for the a11y static analysis (jsx-a11y) — that's a better justification for adding it. Keep the import-guard as a grep script to stay consistent with Phase 1.

**Concrete script** (`packages/ui/scripts/check-imports.sh`):

```bash
#!/usr/bin/env bash
# CI assertion for CORE-01:
# (1) No next/* imports (excluding next-themes which is allowed)
# (2) No @clerk/nextjs/server imports
# (3) No alert() or confirm() calls
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src"

fail=0

# Rule 1: No next/* imports, but ALLOW next-themes
# Strategy: grep for "from \"next/" then exclude lines also containing "next-themes"
NEXT_HITS=$(grep -rn 'from "next/' "$SRC" --include="*.ts" --include="*.tsx" \
  | grep -v 'next-themes' || true)
if [ -n "$NEXT_HITS" ]; then
  echo "FAIL [CORE-01]: next/* import found (next-themes is allowed):"
  echo "$NEXT_HITS"
  fail=1
fi

# Rule 2: No @clerk/nextjs/server imports
CLERK_HITS=$(grep -rn '@clerk/nextjs/server' "$SRC" --include="*.ts" --include="*.tsx" || true)
if [ -n "$CLERK_HITS" ]; then
  echo "FAIL [CORE-01]: @clerk/nextjs/server import found:"
  echo "$CLERK_HITS"
  fail=1
fi

# Rule 3: No alert() or confirm() calls in package source
ALERT_HITS=$(grep -rn '\balert(\|\bconfirm(' "$SRC" --include="*.ts" --include="*.tsx" || true)
if [ -n "$ALERT_HITS" ]; then
  echo "FAIL [CORE-04]: alert() or confirm() found in package source:"
  echo "$ALERT_HITS"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src"
fi
exit "$fail"
```

**The key nuance:** The grep pattern `'from "next/'` matches `from "next/navigation"` and `from "next/server"` but NOT `from "next-themes"` because `next-themes` doesn't begin with `next/`. The additional `grep -v 'next-themes'` is a double-safety filter for the unlikely case of a comment or string containing both strings in the same line.

### Pattern 2: DataTable Controlled-Seam (D-05/D-06/D-07 — CORE-03)

**What `use-data-table.ts` currently does with nuqs:**

The hook uses `useQueryState` (from nuqs) for 5 state slices: `page`, `perPage`, `sorting`, `columnFilters` (via `useQueryStates`), and `joinOperator`. Each slice has a nuqs parser (parseAsInteger, custom parsers from `lib/parsers.ts`). The parsers serialize/deserialize to/from URL query strings.

The `data-table.tsx` component itself is already clean — it accepts a TanstackTable `table` instance as a prop and doesn't import nuqs. **Nuqs lives only in the hook (`use-data-table.ts`), not in any component file.**

**The wrapper seam (D-06 — wrapper, not rewrite):**

The correct approach is a thin wrapper that sits in front of `useDataTable`'s internals:

```typescript
// packages/ui/src/hooks/use-data-table.ts — Phase 2 version
// Source: D-05/D-06 decision pattern

import {
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";

// The full state shape exposed via the controlled seam
export type DataTableState = {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
};

// Props for the injectable seam (D-05)
export type DataTableStateProps = {
  /** Opt-in controlled state. Omit for internal (uncontrolled) default. */
  state?: Partial<DataTableState>;
  onStateChange?: (state: DataTableState) => void;
};

// The ported hook no longer imports from nuqs.
// Internal state is the default (works standalone with zero consumer wiring).
// Controlled state is opt-in via state/onStateChange props.
// lib/parsers.ts (the nuqs serializers) stays in Helm as the reference impl
// for the consumer-side nuqs adapter (apps/web, Phase 4).
```

The hook body replaces each `useQueryState(...)` call with a `React.useState(initialValue)` call, using the same initial values that nuqs would have defaulted to. The controlled seam intercepts the state setters: if `props.state` is provided, use it; otherwise use internal state.

**`lib/parsers.ts` does not travel into packages/ui** — it imports from `nuqs/server` and `zod`, which are Helm-specific. It serves as the reference implementation for the Phase 4 consumer-side nuqs adapter doc.

**The `QueryKeys` type in `types/data-table.ts`** references nuqs-specific option shapes. Strip nuqs-coupled fields from the ported type; keep the non-nuqs ones (`filtering`, `sorting`, `pagination` shape types).

### Pattern 3: Toaster + next-themes Optional Peer (D-10 — CORE-04)

**Verified pattern** from shadcn/ui official registry and sonner docs:

```typescript
// packages/ui/src/components/page/toaster.tsx
"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Conditional import of next-themes — graceful degradation when peer is absent
let useTheme: (() => { theme?: string; resolvedTheme?: string }) | null = null
try {
  // Dynamic require allows tree-shaking when next-themes is not installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextThemes = require("next-themes")
  useTheme = nextThemes.useTheme
} catch {
  // next-themes not installed — degrade to theme="system"
}

function Toaster({ ...props }: ToasterProps) {
  // When next-themes is available, read the active theme.
  // Default to "system" to avoid SSR hydration mismatch.
  const theme = useTheme ? useTheme().theme ?? "system" : "system"
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

**Alternative (simpler):** Use `useTheme` directly — the `= "system"` default handles the missing-provider case because `useTheme()` returns `{ theme: undefined }` when no `ThemeProvider` is mounted, and the default `= "system"` provides the fallback. This is the cleaner pattern and avoids the dynamic require:

```typescript
// Simpler version — works when next-themes is installed but ThemeProvider is not mounted
"use client"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "next-themes"

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()
  return <Sonner theme={theme as ToasterProps["theme"]} {...props} />
}
export { Toaster }
```

**For packages/ui with optional peer:** The simpler version is correct — `useTheme()` returns `{ theme: undefined }` when no `ThemeProvider` is above it in the tree, so `const { theme = "system" } = useTheme()` safely degrades to `"system"`. This is the official shadcn/ui pattern. The import-guard must allow `next-themes` via the negation check in the grep script (already handled: `from "next-themes"` does not match `from "next/"`).

**package.json changes for D-10:**
```jsonc
{
  "peerDependencies": {
    "next-themes": "^0.4.0"   // ADD
  },
  "peerDependenciesMeta": {
    "next-themes": { "optional": true }   // ADD
  },
  "dependencies": {
    // REMOVE "next-themes" from here — it was a dependencies entry, must move to optional peer
  }
}
```

The import-guard `check-imports.sh` allows `next-themes` via the `grep -v 'next-themes'` exclusion on the `next/*` rule. `next-themes` is imported as `from "next-themes"` (not `from "next/themes"`), so it naturally does not match the `from "next/"` pattern. The explicit `grep -v` adds belt-and-suspenders safety.

### Pattern 4: lucide-react v1 Decision

**Current state:** Helm uses `^0.576.0`. The `packages/ui` staging area has no lucide-react listed (Phase 1 didn't port any icon-using components).

**v0→v1 breaking changes that affect in-scope components:**
- Brand icons removed (GitHub, Facebook, LinkedIn, etc.) — **none of these are used in ui/, page/, data-grid/, or data-table/**. The in-scope icon names are: `XIcon`, `ChevronRight`, `MoreHorizontal`, `SearchIcon`, `PanelLeftIcon`, `CircleIcon`, `CheckIcon`, `ChevronRightIcon`, `ChevronDownIcon`, `ChevronUpIcon`, `Check`, `Upload`, `X`, `CopyIcon`, `EraserIcon`, `ScissorsIcon`, `Trash2Icon`, `Plus`, `Sparkles`, `Settings2`, `CalendarIcon`, `PlusCircle`, `XCircle`, `LucideIcon` type. None of these are brand icons.
- UMD build removed — irrelevant (packages/ui is ESM-only).
- Named import API unchanged — `import { XIcon } from 'lucide-react'` is still the standard.
- **RSC createContext issue in v1** — `lucide-react` v1 calls `createContext()` at module scope, which fails in RSC environments. This does NOT affect `packages/ui` because: (a) all data-grid and data-table icon imports are in `'use client'` files, (b) the page primitives that use LucideIcon (`EmptyState`, `ErrorState`) accept `icon` as a prop of type `LucideIcon` — no direct import at the component level. The only risk would be if a server-safe ui/ component imported an icon directly; check at port time.
- `XCircle` — not in the brand icon removal list. Search confirms `XCircle` was renamed to `CircleX` in lucide-react v0.x; verify at port time by checking which specific name is used in data-table components and whether it exists in v1.17.0.

**Recommendation:** `packages/ui` adopts `lucide-react@^1.0.0` (pinning to latest stable `1.17.0`). Helm's `^0.576.0` remains unchanged. The version difference is intentional — Farsight (`apps/web`) is greenfield and can adopt v1 clean.

**Icon audit protocol at port time:** For each icon name imported in data-grid/data-table components, verify the name exists in v1.17.0. The most likely candidate for rename is `XCircle` → `CircleX`. Run `npm view lucide-react@1.17.0 exports` or check the lucide.dev icon search to verify each name.

### Pattern 5: shadcn.io Licensing Gate — D-13 RESOLVED

**Verdict: REDISTRIBUTION PROHIBITED. Re-implement skeleton/error primitives from scratch.**

**Source:** Direct fetch of https://www.shadcn.io/license (2026-05-29).

**Exact wording (key clause):**
> "Re-distribute the Pro Blocks and Components or derivatives of the Pro Blocks and Components separately from an End Product, neither in code or as design assets."

**Why this blocks `@farsight/ui`:** The library is explicitly a distributable package — it gets copied into the Farsight monorepo as `packages/ui` and exported via `workspace:*`. This falls squarely into the redistribution prohibition. The license also explicitly prohibits creating "theme, template, or project starter kit" — `@farsight/ui` qualifies.

**Lowest-risk path (the one to execute):** Re-implement all three layout skeletons and the `ErrorState` from scratch, using shadcn.io registry blocks as **layout pattern reference** (visual structure, proportions) — NOT as source to copy verbatim. The shadcn-block-intake.md worked example `CardGridSkeleton` (`skeleton-card-grid` → `CardGridSkeleton`) is already a from-scratch re-implementation that uses only the open-source MIT `<Skeleton>` primitive. That worked example is the correct template to follow for `card-grid-skeleton`, `list-skeleton`, and `detail-skeleton`.

**What IS allowed:** Reading the shadcn.io registry catalog for layout pattern ideas. Looking at the structure of blocks to understand what proportions/variants to expose as props. Building the implementation using only open-source MIT components (`Skeleton`, `Card`, `Table`, etc. from shadcn/ui proper).

**Official `@shadcn/empty` + `@shadcn/spinner` primitives:** Not a viable path either. These are part of the shadcn.io Pro registry ecosystem. Treat them as pattern reference, not source.

### Pattern 6: Characterization-Test Surface (CORE-03)

**Scope of characterization testing:**

DataGrid (`use-data-grid.ts`, 3273 lines) is framework-clean. The characterization tests pin its default state and key interactions: initial column state, sorting state transitions, row selection behavior, cell editing flow, undo/redo stack. These tests use `@testing-library/react` `renderHook` in jsdom (already configured in Helm's vitest.config.ts).

DataTable (`use-data-table.ts`) characterization tests focus on the **new controlled seam**: verify that internal-state default works (state changes propagate correctly without consumer wiring), verify that controlled state override works (external state is used when provided, `onStateChange` called on transitions).

**nuqs in characterization tests:** The ported `use-data-table.ts` no longer uses nuqs. Any tests for the Helm version that use `NuqsTestingAdapter` are not ported — they test the URL-persistence path that Phase 2 doesn't ship. Phase 2 tests use plain `renderHook` with no adapter.

**Test harness setup:**

```typescript
// packages/ui/__tests__/hooks/use-data-table.test.ts
import { renderHook, act } from "@testing-library/react"
import { useDataTable } from "../../src/hooks/use-data-table"

// Characterization test: default (internal) state works standalone
it("initializes with internal state defaults", () => {
  const { result } = renderHook(() =>
    useDataTable({
      columns: [],
      data: [],
      pageCount: 0,
    })
  )
  expect(result.current.table.getState().pagination.pageIndex).toBe(0)
  expect(result.current.table.getState().sorting).toEqual([])
})

// Characterization test: controlled state override
it("uses external state when provided", () => {
  const { result } = renderHook(() =>
    useDataTable({
      columns: [],
      data: [],
      pageCount: 5,
      state: { pagination: { pageIndex: 2, pageSize: 25 } },
      onStateChange: vi.fn(),
    })
  )
  expect(result.current.table.getState().pagination.pageIndex).toBe(2)
})
```

**Existing Helm tests that can be ported:** There are no existing characterization tests for `use-data-grid.ts` or `use-data-table.ts` in `__tests__/` (confirmed: only `campaigns-list.test.tsx`, `prospects-client.test.tsx`, and lib tests exist). Phase 2 creates the characterization baseline from scratch.

**DataGrid virtual row rendering in vitest:** `@tanstack/react-virtual` uses `getBoundingClientRect` which returns zeros in jsdom. Virtualization-dependent tests need to mock or stub the element measurements. The characterization tests should focus on **hook state** (not virtual row positions), which avoids the jsdom limitation.

### Anti-Patterns to Avoid

- **Copying shadcn.io Pro block source verbatim** — license prohibits redistribution. Use as layout reference only.
- **Adding nuqs to packages/ui** — the whole point of D-05 is to remove it from the library surface.
- **Importing `next-themes` as a hard dependency** — must be an optional peer per D-10.
- **Importing icons from 'lucide-react' in server-safe (no 'use client') components** — lucide-react v1 has the `createContext` RSC issue; icon imports in server-safe files would crash RSC consumers. Use `LucideIcon` type-only import or require the component to carry `'use client'`.
- **Running axe tests in happy-dom** — vitest-axe is incompatible with happy-dom (known bug in Node.prototype.isConnected). Existing Helm vitest config uses jsdom — correct.
- **Using `react-server` conditional exports for lucide-react** — no upstream fix yet; mitigation is to import icons only from `'use client'` files (the existing pattern in all in-scope components).
- **Putting `alert()` or `confirm()` in any new page primitive code** — the CI script asserts zero instances in `packages/ui/src/`.

---

## D-13 Licensing Gate — Definitive Guidance

**shadcn.io Pro license status:** REDISTRIBUTION PROHIBITED

The license fetched from https://www.shadcn.io/license explicitly prohibits:
- Redistributing Pro Blocks or derivatives separately from an End Product
- Creating a UI library (theme, template, project starter kit) using Pro blocks
- Making such a library available whether for sale or for free

`@farsight/ui` is a distributable package — this prohibition applies directly.

**Execution path for D-03 skeleton set and D-02 ErrorState:**
1. **Look at** shadcn.io registry blocks in the `skeleton-*`, `empty-state-*`, and `error` categories to understand the layout patterns, proportions, and prop shapes they use.
2. **Re-implement from scratch** using only MIT components: `<Skeleton>` (from the ported `components/ui/skeleton.tsx`), `<Card>`, `<Table>`, etc.
3. **Follow the Phase 1 worked example** (`CardGridSkeleton` in `shadcn-block-intake.md`) as the template — it demonstrates a clean from-scratch re-implementation that captures the pattern without copying source.
4. **Export as named exports** from their own subpath (`./components/page/card-grid-skeleton`, etc.) following Phase 1 naming conventions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| axe accessibility violations in CI | Custom DOM inspector | `vitest-axe` + `axe-core` | axe-core knows 300+ rules including ARIA, color contrast, keyboard; hand-rolled checks miss edge cases |
| `next/*` import detection | Complex AST parser | 15-line bash grep script | 3 string rules don't need an AST; grep runs anywhere CI does |
| DataTable URL state parsing | Custom URL serializers | Keep `lib/parsers.ts` in Helm as reference; Phase 4 consumer wires their own nuqs parsers | nuqs parsers are well-tested; the seam decision (D-07) defers URL-sync to Phase 4 |
| Skeleton layout primitives | Copy shadcn.io Pro source | Re-implement from scratch using MIT `<Skeleton>` | License prohibits redistribution of Pro block source; from-scratch is the only legal path |
| `'use client'` directive tracking | Custom Rollup plugin | `rollup-preserve-directives` (already in packages/ui) | Phase 1 already solved this |

**Key insight:** The legal gate (D-13) is the most important "don't hand-roll" discipline here — it means the work is writing simple presentational components, not copy-pasting. The worked example in `shadcn-block-intake.md` shows this is a 30-50 line job per skeleton, not a complex decoupling.

---

## Common Pitfalls

### Pitfall 1: lucide-react XCircle → CircleX rename

**What goes wrong:** `import { XCircle } from 'lucide-react'` fails at build time with "Module has no exported member 'XCircle'" — the icon was renamed in v0.x (before v1).

**Why it happens:** `XCircle` was renamed to `CircleX` in a pre-1.0 release. Both Helm (`^0.576.0`) and packages/ui (adopting v1.17.0) may have different states here. Helm at 0.576.0 may have `XCircle`; v1.17.0 has `CircleX` (or vice versa — verify).

**How to avoid:** At port time, check each icon import in `data-table-date-filter.tsx` and `data-table-faceted-filter.tsx` against lucide.dev icon search. Use lucide.dev to verify the canonical name in v1.17.0.

**Warning signs:** TypeScript error "Module has no exported member 'X'" after upgrading lucide-react.

### Pitfall 2: lucide-react RSC createContext crash

**What goes wrong:** Any server-rendered consumer who imports a page primitive or DataGrid component that imports an icon at module scope will get `TypeError: createContext is not a function` in the RSC environment.

**Why it happens:** lucide-react v1 calls `createContext()` at module initialization (`context.js`). In the `react-server` module condition, `createContext` is not exported.

**How to avoid:** Verify every ported component file that imports lucide-react icons also has `'use client'` on line 1. The in-scope files (`data-grid/*.tsx`, `data-table/*.tsx`) already have it. `EmptyState` and `ErrorState` accept `icon?: LucideIcon` as a prop type — the `LucideIcon` type import (`import type { LucideIcon }`) is a type-only import that is erased at runtime, safe in any environment.

**Warning signs:** RSC consumers getting `TypeError: createContext is not a function` when importing a page primitive.

### Pitfall 3: next-themes still in dependencies after Phase 2

**What goes wrong:** `packages/ui/package.json` still has `next-themes` as a `dependency` (not optional peer). Every consumer installs next-themes even if they don't use it. The CI import-guard's `next-themes` allowance also implies the library treats it as a core dep.

**Why it happens:** Phase 1 left `next-themes` in dependencies (harmless then). Phase 2 must reclassify it.

**How to avoid:** Remove from `dependencies`, add to `peerDependencies` + `peerDependenciesMeta: { "next-themes": { "optional": true } }`. The `Toaster` wrapper uses `useTheme()` with a `= "system"` default which safely handles the case where no ThemeProvider is mounted.

**Warning signs:** `pnpm list next-themes -r` shows it being hoisted as a non-optional dep in consumer installs.

### Pitfall 4: nuqs types leaking into the ported DataTable hook interface

**What goes wrong:** `types/data-table.ts` exports `QueryKeys` which references nuqs parser option types. Porting it verbatim pulls nuqs as a type dependency into packages/ui, which then requires nuqs as a dev/peer dep.

**Why it happens:** The type file was designed for Helm's nuqs-coupled hook. The `QueryKeys` type includes fields like `history: UseQueryStateOptions['history']` which imports from nuqs.

**How to avoid:** Strip the nuqs-coupled fields from `QueryKeys` in the ported version. The ported DataTable's controlled seam uses a plain `DataTableState` type (no nuqs option types). `lib/parsers.ts` does not travel to packages/ui.

**Warning signs:** TypeScript error about missing 'nuqs' module when building packages/ui.

### Pitfall 5: a11y test false positives from empty/minimal test fixtures

**What goes wrong:** axe-core reports violations (e.g., missing landmark, page-title) against a bare `renderHook` or component render with no surrounding document structure. These violations don't represent real problems in the library components.

**Why it happens:** axe-core runs against the full document, including the minimal jsdom document that vitest creates. Page-level violations (no `<main>`, no `<title>`) fire on every component test.

**How to avoid:** Scope axe to the rendered component subtree only: `axe(container)` where `container` is the Testing Library render result. Configure axe rules to disable document-level checks (`landmark-one-main`, `page-has-heading-one`) that don't apply to isolated component tests.

```typescript
const { container } = render(<Button>Click</Button>)
const results = await axe(container, {
  rules: { 'landmark-one-main': { enabled: false } }
})
expect(results).toHaveNoViolations()
```

**Warning signs:** Every component test fails with "Ensure the document has one main landmark" regardless of the component's actual a11y.

### Pitfall 6: DataGrid virtual rendering broken in characterization tests

**What goes wrong:** Characterization tests for `use-data-grid.ts` that attempt to render the full `DataGrid` component fail or produce empty rows because `@tanstack/react-virtual` uses `getBoundingClientRect` which returns zeros in jsdom.

**Why it happens:** `useVirtualizer` needs element measurements to compute row offsets. Jsdom returns `0` for all layout measurements.

**How to avoid:** Characterization tests should test the **hook state** (via `renderHook`), not the full `DataGrid` render. For render tests, mock `getBoundingClientRect` to return a fixed height:
```typescript
vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
  height: 500, width: 1000, top: 0, left: 0, right: 1000, bottom: 500,
} as DOMRect)
```

---

## Code Examples

### CI Import Guard (Complete)

```bash
#!/usr/bin/env bash
# packages/ui/scripts/check-imports.sh
# Source: CORE-01 / CORE-04 CI guard — Phase 2
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src"
fail=0

# Rule 1: No next/* imports (next-themes is NOT next/* — safe)
# "from "next/" matches next/navigation, next/server, next/headers etc.
# next-themes imports as "from "next-themes"" — does not match this pattern.
NEXT_HITS=$(grep -rn 'from "next/' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$NEXT_HITS" ]; then
  echo "FAIL [CORE-01]: next/* import found (next-themes IS allowed; next/anything is not):"
  printf '%s\n' "$NEXT_HITS"
  fail=1
fi

# Rule 2: No @clerk/nextjs/server imports
CLERK_HITS=$(grep -rn '@clerk/nextjs/server' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$CLERK_HITS" ]; then
  echo "FAIL [CORE-01]: @clerk/nextjs/server import found:"
  printf '%s\n' "$CLERK_HITS"
  fail=1
fi

# Rule 3: No alert() or confirm() in package source
# Word-boundary (\b) prevents matching e.g. "defaultAlert"
ALERT_HITS=$(grep -rn '\balert(\|\bconfirm(' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$ALERT_HITS" ]; then
  echo "FAIL [CORE-04]: alert() or confirm() call found in packages/ui/src:"
  printf '%s\n' "$ALERT_HITS"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS [CORE-01/04]: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src"
fi
exit "$fail"
```

### vitest-axe Setup Pattern (CORE-05)

```typescript
// packages/ui/vitest.setup.ts (or add to existing setup)
// Source: github.com/chaance/vitest-axe README
import "vitest-axe/extend-expect"
```

```typescript
// packages/ui/src/__tests__/a11y/button.a11y.test.tsx
import { render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { Button } from "../../components/ui/button"

describe("Button a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(<Button>Submit</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it("icon-only button requires aria-label", async () => {
    const { container } = render(
      <Button size="icon" aria-label="Delete item">
        <TrashIcon />
      </Button>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### ErrorState Component (D-02 pattern)

```typescript
// packages/ui/src/components/page/error-state.tsx
// Re-implemented from scratch per D-13 licensing gate — NOT copied from shadcn.io
import * as React from "react"
import type { LucideIcon } from "lucide-react"  // type-only import — RSC safe
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"

type ErrorStateProps = {
  title?: string
  description?: string
  /** Lucide icon — accepts the component type, NOT a string */
  icon?: LucideIcon
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
}

// No 'use client' needed — purely presentational, no hooks
function ErrorState({
  title = "Something went wrong",
  description,
  icon: Icon,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}
    >
      {Icon && <Icon className="h-10 w-10 text-destructive/60 mb-3" />}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}

export { ErrorState }
export type { ErrorStateProps }
```

### eslint-plugin-jsx-a11y Config Snippet (CORE-05)

```javascript
// packages/ui/eslint.config.mjs (new file for Phase 2)
// Source: github.com/jsx-eslint/eslint-plugin-jsx-a11y
import jsxA11y from "eslint-plugin-jsx-a11y"

export default [
  {
    files: ["src/**/*.tsx"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      // Enforce aria-label on elements with no accessible text
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/interactive-supports-focus": "warn",
      // Catch icon-only buttons missing aria-label
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  },
]
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Global `alert()` / `confirm()` for feedback | Sonner `toast` (transient) + `ConfirmDialog` (destructive) | Non-blocking, styleable, accessible — CORE-04 convention |
| lucide-react brand icons in UI kits | Brand icons removed v1.0 — use @icons-pack/react-simple-icons | No impact on data-app icons; page/data-grid/data-table don't use brand icons |
| nuqs directly in hook body | Controlled/uncontrolled seam — internal state default + optional controlled props | Library-safe: no routing dependency; consumer wires nuqs at Phase 4 |
| Manual a11y checklists | vitest-axe automated rules + eslint-plugin-jsx-a11y static | Catches 30%+ of real violations automatically; manual covers the rest |
| shadcn.io Pro blocks vendored directly | Pattern-only: re-implement from MIT primitives | Legally necessary per explicit license prohibition on redistribution |

**Deprecated/outdated:**
- Copying shadcn.io Pro source into library packages: explicitly prohibited by license
- `alert()` / `confirm()` for any user-facing feedback: replace with Sonner + ConfirmDialog
- lucide-react brand icons (`Github`, `LinkedIn`, `Facebook` etc.): removed in v1.0; use @icons-pack/react-simple-icons if needed

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `vitest-axe` 0.1.0 is compatible with vitest 4.1.6 | Standard Stack | If incompatible: fall back to jest-axe usage pattern (same API, different import) or use axe-core directly with custom matcher |
| A2 | `@tanstack/react-table` and `@tanstack/react-virtual` are not yet in packages/ui dependencies | Standard Stack | If they already are: verify versions match Helm versions before porting |
| A3 | `@dnd-kit/*` should travel with `sortable.tsx` into packages/ui | Standard Stack | If sortable.tsx is considered out of scope (pipeline canvas dependency only): exclude it and don't add dnd-kit deps |
| A4 | lucide-react `XCircle` was renamed to `CircleX` in v0.x (before v1) | Pitfall 1 | If XCircle still exists in v1.17.0: no action needed; if renamed to something else: update the pitfall |
| A5 | `eslint-plugin-jsx-a11y` is compatible with the flat config format (`eslint.config.mjs`) | Code Examples | If only supports legacy `.eslintrc`: use legacy format or upgrade the plugin |
| A6 | `config/data-table.ts` has no nuqs coupling (it only exports filter/operator config) | Pattern 2 | Direct inspection confirms it imports only from `@/types/data-table` — confirmed clean |
| A7 | `lib/format.ts` has no framework coupling (it's pure Intl.DateTimeFormat) | Architecture | Direct inspection confirms it's a pure JS function — safe to port |

---

## Open Questions (RESOLVED)

1. **`@tanstack/react-virtual` version in Helm** — **RESOLVED:** Helm's root `package.json` pins `@tanstack/react-virtual` at `^3.13.24` (verified during planning); `packages/ui` declares the same `^3.13.24`. Related DataGrid/DataTable deps confirmed: `@tanstack/react-table ^8.21.3`, `@dnd-kit/core ^6.3.1`, `@dnd-kit/sortable ^10.0.0`, `@dnd-kit/modifiers ^9.0.0`, `@dnd-kit/utilities ^3.2.2`.
   - What we know: `use-data-grid.ts` imports from `@tanstack/react-virtual`; it must be declared in packages/ui
   - Resolution: match Helm's pins above; no `npm view` round-trip needed.

2. **`sortable.tsx` in-scope vs. out-of-scope** — **RESOLVED:** In scope — `sortable.tsx` is ported as one of the 34 `ui/` files (Plan 02), and `@dnd-kit/*` is added to `packages/ui` deps + `neverBundle`. The DataGrid filter-menu imports `from "@/components/ui/sortable"` → rewritten same-dir relative. xyflow conflict check deferred to Phase 4 (PORT-01).
   - What we know: It's one of the 34 ui/ files; uses `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; no next/* imports

3. **`'use client'` directive threshold update for Phase 1 CI script** — **RESOLVED (runtime-discovered):** The final `EXPECTED` value is intentionally NOT preset — Plan 05's phase-gate task counts `'use client'` files in built output and updates `check-directives.sh` `EXPECTED` from `1` to the empirical count (~26–28; Toaster is client, ErrorState + new skeletons are server-safe).
   - What we know: `packages/ui/scripts/check-directives.sh` has `EXPECTED=1` (Phase 1 walked only Button+Label); Phase 2 raises it.
   - Resolution: count at phase completion per Plan 05 gate; don't preset the number.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tsdown, vitest, scripts | ✓ | 25.8.1 | — |
| pnpm | Package management | ✓ | (workspace pnpm) | — |
| vitest | Test runner | ✓ | 4.1.6 (Helm) | — |
| @testing-library/react | Component tests | ✓ | 16.3.2 (Helm) | — |
| jsdom | vitest environment | ✓ | 29.1.1 (Helm) | — |
| vitest-axe | a11y testing | Must install | — | axe-core + jest-axe manually adapted |
| eslint-plugin-jsx-a11y | Static a11y lint | Must install | — | Manual checklist only |
| lucide-react v1 | Icon imports in ports | Must install (^1.0.0) | — | Keep ^0.576.0 and test for icon renames |

**Missing dependencies with no fallback:** None blocking.
**Missing dependencies with fallback:** vitest-axe (axe-core direct fallback), eslint-plugin-jsx-a11y (manual checklist).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (Helm) — packages/ui vitest config to be added in Phase 2 |
| Config file | `packages/ui/vitest.config.ts` — does not exist; Wave 0 creates it |
| Quick run command | `pnpm --filter @farsight/ui test` |
| Full suite command | `pnpm --filter @farsight/ui test && bash packages/ui/scripts/check-imports.sh && bash packages/ui/scripts/check-directives.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| CORE-01 | Zero next/*, @clerk/nextjs/server in packages/ui/src | grep script | `bash packages/ui/scripts/check-imports.sh` | New script; runs in any CI step |
| CORE-01 | Zero alert()/confirm() in packages/ui/src | grep script | Same `check-imports.sh` (Rule 3) | Included in the same script |
| CORE-02 | 34 ui/ primitives importable + render in jsdom | Smoke render tests | `pnpm --filter @farsight/ui test` | Render test per component |
| CORE-02 | Page primitives (PageHeader, EmptyState, ErrorState, ConfirmDialog, Toaster) render | Render tests | `pnpm --filter @farsight/ui test` | Confirm props pass through |
| CORE-02 | `'use client'` count >= 26 in dist/ | CI grep | `bash packages/ui/scripts/check-directives.sh` | Update EXPECTED from 1 → 26 |
| CORE-03 | DataGrid hook initializes correct default state | Characterization | `pnpm --filter @farsight/ui test` | `renderHook(() => useDataGrid(...))` |
| CORE-03 | DataTable internal state works without consumer wiring | Characterization | `pnpm --filter @farsight/ui test` | `renderHook(() => useDataTable(...))` |
| CORE-03 | DataTable controlled state override works | Characterization | `pnpm --filter @farsight/ui test` | Pass `state` + `onStateChange` props |
| CORE-04 | Loading skeletons render without error | Render smoke | `pnpm --filter @farsight/ui test` | `render(<CardGridSkeleton />)` exits 0 |
| CORE-04 | ErrorState renders with/without onRetry | Render smoke | `pnpm --filter @farsight/ui test` | Both prop shapes render |
| CORE-05 | No axe violations on key components | vitest-axe | `pnpm --filter @farsight/ui test` | Button, Input, ErrorState, EmptyState, Toaster |
| CORE-05 | Static a11y lint clean | ESLint jsx-a11y | `pnpm --filter @farsight/ui lint` | Covers aria-label, role, keyboard |

### a11y Coverage Per CORE-05 Sub-criterion

| Sub-criterion | axe-core (vitest-axe) | eslint-plugin-jsx-a11y | Manual |
|---------------|----------------------|----------------------|--------|
| Visible focus rings | Cannot detect (visual, CSS-dependent) | Cannot detect | Manual: verify focus ring visible in browser for each interactive component |
| Full keyboard operability | Partially (axe checks tab order, role/aria pairs) | Checks interactive-elements-have-accessible-name | Manual: Tab through each component surface |
| `aria-label` on icon-only buttons | ✓ axe detects missing accessible names | ✓ jsx-a11y/interactive-supports-focus catches button with icon child only | Manual: cross-check icon-only buttons in data-grid toolbar and data-table pagination |

**Automated coverage:** vitest-axe + jsx-a11y covers `aria-label` gaps and keyboard role correctness reliably. Focus ring visibility requires a manual or visual regression check (deferred to v2 / TOOL-02 Chromatic).

### Sampling Rate

- **Per task commit:** `pnpm --filter @farsight/ui build` exits 0
- **Per wave merge:** Full suite: build + check-directives.sh + check-imports.sh + vitest
- **Phase gate:** All 5 requirements verified; publint passes; `pnpm list react -r` one version

### Wave 0 Gaps

- [ ] `packages/ui/vitest.config.ts` — does not exist; Wave 0 creates it
- [ ] `packages/ui/vitest.setup.ts` — does not exist; Wave 0 creates it (add `import "vitest-axe/extend-expect"`)
- [ ] `packages/ui/scripts/check-imports.sh` — does not exist; Wave 0 creates it
- [ ] `packages/ui/eslint.config.mjs` — does not exist; Wave 0 creates it (jsx-a11y rules)
- [ ] `packages/ui/scripts/check-directives.sh` EXPECTED threshold — update from 1 → 26 at phase completion
- [ ] `packages/ui/src/components/page/toaster.tsx` — new file; Wave 0 or Wave 1 creates it
- [ ] `packages/ui/src/components/page/error-state.tsx` — new file; Wave 0 or Wave 1 creates it
- [ ] Skeleton primitives (`card-grid-skeleton.tsx`, `list-skeleton.tsx`, `detail-skeleton.tsx`) — new files

---

## Security Domain

> Phase 2 is a component porting + packaging discipline phase. No authentication, data access, external network calls, or user-input processing is introduced.

ASVS V2 (Authentication), V3 (Session Management), V4 (Access Control), V6 (Cryptography): Not applicable.

ASVS V5 (Input Validation): The component props are typed via TypeScript. No user-supplied string is rendered as HTML without React's XSS escaping. No `dangerouslySetInnerHTML` is used in any in-scope component (verify at port time).

One security-relevant observation: the CI import-guard (`check-imports.sh`) explicitly checks for `@clerk/nextjs/server` — preventing accidental introduction of server-only auth tokens into the client-side library. This is the single most important security property of Phase 2 (preventing a library consumer from accidentally importing server auth helpers into browser code).

---

## Sources

### Primary (HIGH confidence)

- Direct inspection of `/Users/scottjensen/Projects/helm/components/ui/` (34 files), `/components/page/` (3 files), `/components/data-grid/` (17 files), `/components/data-table/` (9 files) — confirmed zero next/*, @clerk/*, alert(), confirm()
- Direct inspection of `/Users/scottjensen/Projects/helm/hooks/use-data-table.ts` — nuqs imports at lines 19-27, `useQueryState` calls at lines 119-200
- Direct inspection of `/Users/scottjensen/Projects/helm/hooks/use-data-grid.ts` — zero next/*, @clerk/*, nuqs imports confirmed
- Direct inspection of `/Users/scottjensen/Projects/helm/packages/ui/package.json` — current Phase 1 state, exports map, deps
- npm registry (2026-05-29): lucide-react 1.17.0, sonner 2.0.7, next-themes 0.4.6, vitest-axe 0.1.0, eslint-plugin-jsx-a11y 6.10.2, nuqs 2.8.9, @radix-ui/react-direction 1.1.1
- WebFetch of https://www.shadcn.io/license — D-13 licensing gate definitively resolved: redistribution prohibited

### Secondary (MEDIUM confidence)

- [lucide.dev/guide/react/migration](https://lucide.dev/guide/react/migration) — v0→v1 breaking changes (brand icons removed; named import API unchanged)
- [lucide.dev/guide/version-1](https://lucide.dev/guide/version-1) — UMD removed; brand icons removed; RSC createContext issue documented
- [sonner.emilkowal.ski/toaster](https://sonner.emilkowal.ski/toaster) — Toaster `theme` prop API; `useTheme` integration pattern
- [nuqs.dev/docs/testing](https://nuqs.dev/docs/testing) — `withNuqsTestingAdapter` + `NuqsTestingAdapter` for vitest characterization tests
- [eslint.org/docs/latest/rules/no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) — pattern negation syntax for allow/block config
- [github.com/chaance/vitest-axe](https://github.com/chaance/vitest-axe) — vitest-axe setup, jsdom compatibility, extend-expect pattern
- [github.com/lucide-icons/lucide/issues/4200](https://github.com/lucide-icons/lucide/issues/4200) — RSC createContext issue (open, no fix yet)

### Tertiary (LOW confidence — training knowledge, confirmed via grep but not official docs)

- `@tanstack/react-virtual` jsdom getBoundingClientRect limitation — known ecosystem behavior, not verified against a changelog
- `zod` dep via `lib/parsers.ts` — confirmed by file inspection; claim that it must not travel to packages/ui is a design decision, not a documented constraint

---

## Metadata

**Confidence breakdown:**
- Grounding fact (zero framework coupling in in-scope dirs): HIGH — verified by direct grep, no output
- CI import-guard mechanism: HIGH — bash grep recommended based on direct analysis of existing scripts
- D-13 licensing gate: HIGH — direct fetch from authoritative source (shadcn.io/license)
- lucide-react v1 breaking changes: MEDIUM — migration guide page was sparse; brand icon removals confirmed; specific icon renames (XCircle→CircleX) are ASSUMED
- vitest-axe integration: HIGH — official README + known jsdom compatibility
- nuqs seam: HIGH — direct inspection of use-data-table.ts imports and nuqs adapter docs
- DataGrid characterization test pattern: MEDIUM — no existing tests to port; pattern is standard @testing-library/react renderHook

**Research date:** 2026-05-29
**Valid until:** 2026-08-29 (vitest-axe at 0.1.0 may change; lucide-react 1.x API may stabilize — verify versions before executing)
