---
phase: "02"
plan: "05"
subsystem: packages/ui — DataTable surface
tags: [data-table, nuqs-seam, controlled-state, characterization-tests, phase-gate]
dependency_graph:
  requires:
    - 02-02 (test harness + CI scripts)
    - 02-04 (DataGrid port — established depth-2 alias pattern)
  provides:
    - packages/ui/src/components/data-table/ (9 files)
    - packages/ui/src/hooks/use-data-table.ts (nuqs-seamed, controlled seam)
    - packages/ui/src/types/data-table.ts (nuqs-coupled types stripped)
    - packages/ui/src/config/data-table.ts
    - packages/ui/src/lib/data-table.ts
  affects:
    - Phase 4 PORT-01 (nuqs URL-sync adapter wired against the controlled seam)
tech_stack:
  added: []
  patterns:
    - controlled/uncontrolled seam via state?/onStateChange? props (D-05)
    - nuqs imports replaced with React.useState (D-06)
    - URL-sync deferred to Phase 4/PORT-01 (D-07)
key_files:
  created:
    - packages/ui/src/hooks/use-data-table.ts
    - packages/ui/src/components/data-table/data-table.tsx
    - packages/ui/src/components/data-table/data-table-column-header.tsx
    - packages/ui/src/components/data-table/data-table-date-filter.tsx
    - packages/ui/src/components/data-table/data-table-faceted-filter.tsx
    - packages/ui/src/components/data-table/data-table-pagination.tsx
    - packages/ui/src/components/data-table/data-table-skeleton.tsx
    - packages/ui/src/components/data-table/data-table-slider-filter.tsx
    - packages/ui/src/components/data-table/data-table-toolbar.tsx
    - packages/ui/src/components/data-table/data-table-view-options.tsx
    - packages/ui/src/types/data-table.ts
    - packages/ui/src/config/data-table.ts
    - packages/ui/src/lib/data-table.ts
    - packages/ui/__tests__/characterization/data-table.char.test.tsx
    - packages/ui/__tests__/a11y/data-grid.a11y.test.tsx
  modified:
    - packages/ui/src/hooks/use-debounced-callback.ts (wrong import path fixed)
decisions:
  - "D-05/D-06/D-07 honored: DataTable uses React.useState internally; controlled seam via state?/onStateChange? props; URL-sync deferred to Phase 4"
  - "data-table-slider-filter.tsx ported as the 9th file (data-table-body.tsx in plan was a phantom — does not exist in Helm source)"
  - "XCircle kept as-is: confirmed present in lucide-react v1.17.0"
  - "ExtendedColumnFilter stripped from types/data-table.ts (referenced FilterItemSchema from parsers.ts which imports nuqs/server)"
  - "getValidFilters dropped from lib/data-table.ts (referenced stripped ExtendedColumnFilter)"
  - "check-directives.sh EXPECTED=26 confirmed correct against actual dist/ count"
metrics:
  duration: ~35 min
  completed: "2026-05-29"
  tasks: 2
  files_created: 15
  files_modified: 1
---

# Phase 02 Plan 05: DataTable Surface Port — Summary

**One-liner:** DataTable ported with nuqs → React.useState seam (5 state slices), controlled state props exposed, characterization tests prove both modes, final phase gate green.

## What Was Built

### Task 1: 9 DataTable Components + Supporting Files

All 9 DataTable component files ported from Helm source with depth-2 alias rewrite (`@/components/ui/X` → `../ui/X`, `@/lib/X` → `../../lib/X`, etc.):

- `data-table.tsx` — table + pagination orchestrator, zero nuqs
- `data-table-column-header.tsx` — sortable/hideable column header
- `data-table-date-filter.tsx` — date/dateRange filter with Popover
- `data-table-faceted-filter.tsx` — multi-select faceted filter
- `data-table-pagination.tsx` — page navigation controls
- `data-table-skeleton.tsx` — loading skeleton for full DataTable layout
- `data-table-slider-filter.tsx` — numeric range slider filter
- `data-table-toolbar.tsx` — filter toolbar with view options
- `data-table-view-options.tsx` — column visibility toggle

Supporting files ported:
- `types/data-table.ts` — nuqs-coupled types stripped (ExtendedColumnFilter removed, FilterItemSchema reference eliminated)
- `config/data-table.ts` — verbatim (zero nuqs)
- `lib/data-table.ts` — alias-rewritten; getValidFilters dropped (referenced stripped type)

### Task 2: use-data-table.ts Nuqs Seam + Tests + Phase Gate

**Seam transformation (D-05/D-06/D-07):**

| Helm (nuqs) | Ported (React.useState) |
|---|---|
| `useQueryState(pageKey, parseAsInteger.withDefault(1))` | `React.useState<PaginationState>({pageIndex: 0, pageSize: 10})` |
| `useQueryState(perPageKey, ...)` | Unified into single PaginationState |
| `useQueryState(sortKey, getSortingStateParser(...))` | `React.useState<ExtendedColumnSort<TData>[]>([])` |
| `useQueryStates(filterParsers)` | `React.useState<ColumnFiltersState>([])` |
| `useQueryState(joinOperatorKey, ...)` | `React.useState<"and" | "or">("and")` |

**Exported types (D-05):**
- `DataTableState` — `{pagination, sorting, columnFilters, columnVisibility, rowSelection}`
- `DataTableStateProps` — `{state?: Partial<DataTableState>; onStateChange?: (state: DataTableState) => void}`

**Characterization tests (5 tests):**
1. Internal state default: pageIndex=0, sorting=[]
2. Internal state updates propagate: setPageIndex(1) → pageIndex=1
3. Controlled override: state.pagination.pageIndex=2 → table.getState().pagination.pageIndex=2
4. onStateChange called on controlled state transitions
5. No state/onStateChange props → hook fully standalone

**Final phase gate (all green):**
- `pnpm --filter @farsight/ui test` → 38/38 passed
- `check-imports.sh` → PASS (zero nuqs/next/* in src/)
- `check-directives.sh` → PASS (26 'use client' files in dist/, EXPECTED=26)
- `pnpm --filter @farsight/ui build` → Build complete
- `npx publint` → All good (suggestion only, no errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong import path in use-debounced-callback.ts**
- **Found during:** Task 1 — checking existing hooks
- **Issue:** `from "../hooks/use-callback-ref"` should be `from "./use-callback-ref"` (wrong depth prefix)
- **Fix:** Corrected to relative sibling import
- **Files modified:** `packages/ui/src/hooks/use-debounced-callback.ts`
- **Commit:** 36bb646

**2. [Rule 2 - Auto-add] data-table-slider-filter.tsx ported (plan listed phantom data-table-body.tsx)**
- **Found during:** Task 1 — `ls components/data-table/` showed 9 files but data-table-body.tsx does not exist
- **Issue:** Plan listed `data-table-body.tsx` which doesn't exist in Helm source; the toolbar imports `data-table-slider-filter.tsx`
- **Fix:** Ported `data-table-slider-filter.tsx` as the 9th file (it's referenced by the toolbar and needed for the build)
- **Files modified:** Created `data-table-slider-filter.tsx` in packages/ui

**3. [Rule 1 - Bug] getValidFilters dropped from lib/data-table.ts**
- **Found during:** Task 1 — types/data-table.ts strip analysis
- **Issue:** `getValidFilters` in Helm's lib/data-table.ts references `ExtendedColumnFilter` which references `FilterItemSchema` from `lib/parsers.ts` (nuqs-coupled). `ExtendedColumnFilter` was stripped from the ported types file
- **Fix:** Dropped `getValidFilters` from ported lib/data-table.ts (advanced filter functionality, not used by the DataTable component files in scope)
- **Commit:** 36bb646

### Notes

- `XCircle` icon: confirmed present in lucide-react v1.17.0 — no rename needed. Both `XCircle` and `CircleX` coexist in v1.
- `check-directives.sh` EXPECTED was already set to 26 in Plan 02-03 — no change needed.

## TDD Gate Compliance

- RED commit: b40e2fa — failing tests (use-data-table.ts import fails)
- GREEN commit: 9e23a1f — all 38 tests pass
- REFACTOR: None needed

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Known Stubs

None — the DataTable seam exposes a clean controlled API. The URL-sync adapter (nuqs) is intentionally deferred to Phase 4/PORT-01 per D-07.

## Self-Check: PASSED

- use-data-table.ts: FOUND
- data-table.tsx: FOUND
- types/data-table.ts: FOUND
- data-table.char.test.tsx: FOUND
- Commits 36bb646, b40e2fa, 9e23a1f: verified in git log
