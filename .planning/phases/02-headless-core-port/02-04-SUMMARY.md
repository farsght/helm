---
phase: "02"
plan: "04"
subsystem: packages/ui
tags: [datagrid, component-port, alias-rewrite, characterization-tests, framework-clean]
dependency_graph:
  requires: ["02-02"]
  provides:
    - packages/ui/src/components/data-grid/ (17 component files, framework-clean)
    - packages/ui/src/hooks/use-data-grid.ts (3273-line hook, zero nuqs)
    - packages/ui/src/hooks/use-data-grid-undo-redo.ts
    - packages/ui/src/lib/data-grid.ts + data-grid-coercion.ts + data-grid-filters.ts + format.ts
    - packages/ui/src/types/data-grid.ts
    - packages/ui/__tests__/characterization/data-grid.char.test.tsx
  affects:
    - packages/ui/package.json (new deps: @tanstack/react-virtual, @tanstack/react-table, @radix-ui/react-direction)
    - packages/ui/tsdown.config.ts (neverBundle additions)
tech_stack:
  added:
    - "@tanstack/react-virtual@^3.13.24"
    - "@tanstack/react-table@^8.21.3"
  patterns:
    - "Verbatim port with alias rewrite (@/ → relative): depth-2 for components, depth-1 for hooks/lib/types"
    - "Characterization test pattern: renderHook + getBoundingClientRect mock for jsdom"
    - "D-06: no state model change — hook copied verbatim (zero nuqs, framework-clean)"
key_files:
  created:
    - packages/ui/src/components/data-grid/data-grid.tsx
    - packages/ui/src/components/data-grid/data-grid-cell.tsx
    - packages/ui/src/components/data-grid/data-grid-cell-variants.tsx
    - packages/ui/src/components/data-grid/data-grid-cell-wrapper.tsx
    - packages/ui/src/components/data-grid/data-grid-column-header.tsx
    - packages/ui/src/components/data-grid/data-grid-context-menu.tsx
    - packages/ui/src/components/data-grid/data-grid-filter-menu.tsx
    - packages/ui/src/components/data-grid/data-grid-keyboard-shortcuts.tsx
    - packages/ui/src/components/data-grid/data-grid-paste-dialog.tsx
    - packages/ui/src/components/data-grid/data-grid-row-height-menu.tsx
    - packages/ui/src/components/data-grid/data-grid-row.tsx
    - packages/ui/src/components/data-grid/data-grid-search.tsx
    - packages/ui/src/components/data-grid/data-grid-select-column.tsx
    - packages/ui/src/components/data-grid/data-grid-skeleton.tsx
    - packages/ui/src/components/data-grid/data-grid-sort-menu.tsx
    - packages/ui/src/components/data-grid/data-grid-view-menu.tsx
    - packages/ui/src/components/data-grid/variant-menu.tsx
    - packages/ui/src/hooks/use-data-grid.ts
    - packages/ui/src/hooks/use-data-grid-undo-redo.ts
    - packages/ui/src/hooks/use-badge-overflow.ts
    - packages/ui/src/hooks/use-callback-ref.ts
    - packages/ui/src/hooks/use-debounced-callback.ts
    - packages/ui/src/hooks/use-lazy-ref.ts
    - packages/ui/src/lib/data-grid.ts
    - packages/ui/src/lib/data-grid-coercion.ts
    - packages/ui/src/lib/data-grid-filters.ts
    - packages/ui/src/lib/format.ts
    - packages/ui/src/types/data-grid.ts
    - packages/ui/__tests__/characterization/data-grid.char.test.tsx
  modified:
    - packages/ui/package.json
    - packages/ui/tsdown.config.ts
decisions:
  - "D-06 honored: use-data-grid.ts copied verbatim (zero nuqs confirmed), no state model change"
  - "Actual Helm source has different file names than plan listed (e.g., data-grid-keyboard-shortcuts.tsx vs data-grid-toolbar.tsx) — ported actual 17 files"
  - "@radix-ui/react-direction added to dependencies (was already optional peer — moved to hard dep as DataGrid uses it internally via useDirection)"
  - "lib/format.ts ported as dependency of data-grid-filter-menu.tsx (plan did not list it but was required)"
  - "Utility hooks ported: use-badge-overflow, use-callback-ref, use-debounced-callback, use-lazy-ref (required by data-grid-cell-variants)"
metrics:
  duration: "~35 min"
  completed: "2026-05-29"
  tasks_completed: 2
  files_created: 31
  files_modified: 2
---

# Phase 02 Plan 04: DataGrid Surface Port Summary

**One-liner:** Verbatim port of 17 DataGrid components + 3273-line use-data-grid.ts hook + lib/types with alias rewrite only; characterization tests pin default state; zero nuqs, zero next/*, build and CI guards green.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Port 17 DataGrid components + hook + lib + types with alias rewrite | 21ed2ab | Done |
| 2 | DataGrid characterization tests pinning default state | 6e74097 | Done |

## What Was Built

### Task 1: DataGrid Surface Port

Ported the full DataGrid surface from Helm to `packages/ui/src/`:

**17 component files** (actual Helm source, differs from plan's listed names):
- `data-grid.tsx` — main grid container
- `data-grid-cell.tsx` — cell dispatcher (variant switch)
- `data-grid-cell-variants.tsx` — 9 cell variant implementations (ShortText, LongText, Number, URL, Checkbox, Select, MultiSelect, Date, File)
- `data-grid-cell-wrapper.tsx` — cell interaction wrapper (effect-based syncing preserved per CLAUDE.md)
- `data-grid-column-header.tsx` — column sort/pin/hide header
- `data-grid-context-menu.tsx` — right-click menu (tableMeta derivation preserved per CLAUDE.md)
- `data-grid-filter-menu.tsx` — column filter popover
- `data-grid-keyboard-shortcuts.tsx` — keyboard shortcuts dialog
- `data-grid-paste-dialog.tsx` — paste expand/clip dialog
- `data-grid-row-height-menu.tsx` — row height selector
- `data-grid-row.tsx` — virtualized row renderer
- `data-grid-search.tsx` — in-grid search bar
- `data-grid-select-column.tsx` — checkbox/row-number select column
- `data-grid-skeleton.tsx` — loading skeleton
- `data-grid-sort-menu.tsx` — multi-column sort popover
- `data-grid-view-menu.tsx` — column visibility popover
- `variant-menu.tsx` — column type coercion menu

**Hooks:** `use-data-grid.ts` (3273 lines, zero nuqs), `use-data-grid-undo-redo.ts` (502 lines), plus utility hooks: `use-badge-overflow.ts`, `use-callback-ref.ts`, `use-debounced-callback.ts`, `use-lazy-ref.ts`

**Lib:** `data-grid.ts`, `data-grid-coercion.ts`, `data-grid-filters.ts`, `format.ts`

**Types:** `data-grid.ts` (no alias rewrites needed — no @/ imports)

**Package updates:** Added `@tanstack/react-virtual@^3.13.24`, `@tanstack/react-table@^8.21.3`, `@radix-ui/react-direction@^1.1.1` to `dependencies`; both tanstack packages added to `tsdown.config.ts` `deps.neverBundle`.

### Task 2: Characterization Tests

Created `packages/ui/__tests__/characterization/data-grid.char.test.tsx` with 11 tests:

- Hook initializes without throwing
- Returns `table.getState()` with valid state object
- `sorting` defaults to `[]`
- `rowSelection` defaults to `{}`
- `columnFilters` defaults to `[]`
- `focusedCell` defaults to `null`
- `editingCell` defaults to `null`
- `contextMenu` defaults to `{ open: false, x: 0, y: 0 }`
- `rowHeight` defaults to `'short'`
- `pasteDialog` defaults to `{ open: false, rowsNeeded: 0 }`
- `cellSelectionMap` defaults to `null` (no selection)

`getBoundingClientRect` mocked via `vi.spyOn` to avoid jsdom virtual-row failures.

## Deviations from Plan

### Auto-fixed: Actual file names differ from plan

**Found during:** Task 1 — reading Helm source directory

**Issue:** The plan listed 17 specific file names (`data-grid-body.tsx`, `data-grid-toolbar.tsx`, `data-grid-loading.tsx`, etc.) that don't exist in Helm source. The actual 17 files have different names.

**Fix:** Ported the actual 17 Helm source files. The count is correct; the file names in the plan were stale/incorrect. The plan's intent ("port all 17 DataGrid component files") was honored.

**Files:** All 17 actual component files from `components/data-grid/`

### Auto-added: lib/format.ts missing from plan

**Found during:** Task 1 — reading data-grid-filter-menu.tsx imports

**Issue:** `data-grid-filter-menu.tsx` imports `formatDate` from `@/lib/format`. The plan did not list `format.ts` as a file to port.

**Fix:** Ported `lib/format.ts` to `packages/ui/src/lib/format.ts` (single function, no @/ imports needed).

### Auto-added: Utility hooks not listed in plan

**Found during:** Task 1 — reading data-grid-cell-variants.tsx imports

**Issue:** `data-grid-cell-variants.tsx` requires `use-badge-overflow`, `use-debounced-callback` (which requires `use-callback-ref`), and `use-lazy-ref`. The plan listed these hooks in context but not in the files list.

**Fix:** Ported all required utility hooks with alias rewrite.

### Decision: @radix-ui/react-direction in dependencies

**Issue:** `@radix-ui/react-direction` was already in `peerDependencies` (optional) from a prior plan. The plan requires it in `dependencies` since `use-data-grid.ts` uses it internally. Added to both `dependencies` and `neverBundle` (was already in neverBundle from Phase 2 setup).

## Known Stubs

None. All 17 components port live hook-driven behavior — no hardcoded placeholders.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. All files are client-side React components and utility functions. The `getBoundingClientRect` mock in tests is test-only and does not affect production behavior.

T-02-10 mitigated: `grep -rn 'nuqs' packages/ui/src/hooks/use-data-grid.ts` returns 0.
T-02-11 mitigated: effect-based syncing in `data-grid-cell-variants.tsx` copied verbatim (per CLAUDE.md).
T-02-12 mitigated: `@tanstack/react-virtual` added to `deps.neverBundle`.
T-02-SC accepted: `@tanstack/react-virtual` and `@radix-ui/react-direction` are pre-existing Helm deps.

## Verification Results

```
ls packages/ui/src/components/data-grid/ | wc -l   → 17
grep -rn 'from "@/' packages/ui/src/components/data-grid/ | wc -l → 0
grep -rn 'from "@/' packages/ui/src/hooks/use-data-grid.ts | wc -l → 0
grep 'nuqs' packages/ui/src/hooks/use-data-grid.ts | wc -l → 0
bash packages/ui/scripts/check-imports.sh → PASS
pnpm --filter @farsight/ui test → 32/32 passed
pnpm --filter @farsight/ui build → Build complete
```

## Self-Check: PASSED

All files verified present:
- `packages/ui/src/components/data-grid/` → 17 files ✓
- `packages/ui/src/hooks/use-data-grid.ts` → exists ✓
- `packages/ui/src/hooks/use-data-grid-undo-redo.ts` → exists ✓
- `packages/ui/__tests__/characterization/data-grid.char.test.tsx` → exists ✓

Commits verified:
- `21ed2ab` → feat(02-04): port 17 DataGrid components ✓
- `6e74097` → test(02-04): add DataGrid characterization tests ✓
