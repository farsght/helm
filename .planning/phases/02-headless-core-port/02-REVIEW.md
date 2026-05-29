---
phase: 02-headless-core-port
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/ui/src/components/page/error-state.tsx
  - packages/ui/src/components/page/toaster.tsx
  - packages/ui/src/components/page/card-grid-skeleton.tsx
  - packages/ui/src/components/page/list-skeleton.tsx
  - packages/ui/src/components/page/detail-skeleton.tsx
  - packages/ui/src/components/page/index.ts
  - packages/ui/src/hooks/use-data-table.ts
  - packages/ui/scripts/check-imports.sh
  - packages/ui/vitest.config.ts
  - packages/ui/vitest.setup.ts
  - packages/ui/eslint.config.mjs
  - packages/ui/src/index.ts
findings:
  critical: 4
  warning: 3
  info: 2
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-29
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the 12 genuinely new or transformed files from Phase 2. The three skeleton
components and `error-state.tsx` are presentationally correct and clean (no HTTP/RFC-7807
awareness, D-02 compliant). The `toaster.tsx` theme-degradation idiom is correct.

The critical problems cluster in two areas:

1. **Package API surface**: `src/index.ts` exports none of the new Phase 2 symbols. Since the
   `package.json` exports map has only one entry (`"." → src/index.ts`) and `tsdown` bundles only
   that entry, the page primitives (`ErrorState`, `Toaster`, all three skeletons) and the
   `useDataTable` hook are completely unreachable to any consumer of `@farsight/ui`. The package
   builds but ships empty of all Phase 2 output.

2. **Controlled-state seam correctness**: `use-data-table.ts` has two distinct bugs in the
   `state`/`onStateChange` seam introduced to replace `nuqs`. One causes incorrect base state
   in function-form filter updaters during controlled mode; the other means
   `rowSelection` and `columnVisibility` mutations are silently dropped from the `onStateChange`
   stream entirely.

---

## Critical Issues

### CR-01: All Phase 2 page primitives are unreachable — not exported from `src/index.ts`

**File:** `packages/ui/src/index.ts` (entire file) and `packages/ui/src/components/page/index.ts`

**Issue:** `packages/ui/src/components/page/index.ts` defines and exports `ErrorState`,
`Toaster`, `CardGridSkeleton`, `ListSkeleton`, and `DetailSkeleton`, but `src/index.ts` —
the sole entry point listed in `package.json`'s `exports` map and `tsdown.config.ts`'s
`entry` — does not re-export any of them. No consumer of `@farsight/ui` can import these
components. The build will succeed (no bundler error) but all Phase 2 primitives are dead.

**Fix:** Add re-exports from the page barrel to `src/index.ts`:

```ts
// Page primitives
export { PageHeader } from './components/page/page-header'
export { EmptyState } from './components/page/empty-state'
export { ConfirmDialog } from './components/page/confirm-dialog'
export { ErrorState } from './components/page/error-state'
export type { ErrorStateProps } from './components/page/error-state'
export { Toaster } from './components/page/toaster'
export { CardGridSkeleton } from './components/page/card-grid-skeleton'
export { ListSkeleton } from './components/page/list-skeleton'
export { DetailSkeleton } from './components/page/detail-skeleton'
```

Or, more concisely, re-export the whole barrel:

```ts
export * from './components/page'
```

---

### CR-02: `useDataTable` and `DataTableState*` types are unreachable — not exported from `src/index.ts`

**File:** `packages/ui/src/index.ts` (entire file)

**Issue:** `useDataTable`, `DataTableState`, and `DataTableStateProps` are defined in
`packages/ui/src/hooks/use-data-table.ts` but `src/index.ts` exports only three other hooks
(`useIsomorphicLayoutEffect`, `useAsRef`, `useIsMobile`). Consumers cannot import the hook
or its types from `@farsight/ui`. Same root cause as CR-01 — the single-entry build only
sees `src/index.ts`.

**Fix:** Add to `src/index.ts`:

```ts
export { useDataTable } from './hooks/use-data-table'
export type { DataTableState, DataTableStateProps } from './hooks/use-data-table'
```

---

### CR-03: `onColumnFiltersChange` applies the updater to internal state, not controlled state

**File:** `packages/ui/src/hooks/use-data-table.ts:190-205`

**Issue:** When a consumer passes `controlledState.columnFilters` (controlled mode), the
function-form updater path in `onColumnFiltersChange` passes `prev` from
`setInternalColumnFilters` — which is `internalColumnFilters`, not the effective controlled
value — as the base for the computation:

```ts
setInternalColumnFilters((prev) => {   // `prev` is INTERNAL state
  const next =
    typeof updaterOrValue === "function"
      ? updaterOrValue(prev)             // controlled value ignored as base
      : updaterOrValue;
  debouncedSetColumnFilters(next);
  return next;                          // internal state also mutated in controlled mode
});
```

By contrast, `onPaginationChange` (line 137-149) correctly resolves `pagination` (which
prefers the controlled value) before passing it to the updater. The filter handler should
mirror that pattern. Additionally, the unconditional `setInternalColumnFilters` call means
internal state is mutated on every keystroke even in controlled mode, causing spurious
re-renders and a diverged internal state.

**Fix:** Mirror the `onPaginationChange` pattern — read the effective (possibly controlled)
value first, compute the new state from it, then conditionally update internal state:

```ts
const onColumnFiltersChange = React.useCallback(
  (updaterOrValue: Updater<ColumnFiltersState>) => {
    if (enableAdvancedFilter) return;
    const next =
      typeof updaterOrValue === "function"
        ? updaterOrValue(columnFilters)   // use effective (controlled) value as base
        : updaterOrValue;
    debouncedSetColumnFilters(next);      // notifyStateChange + conditional setInternal
  },
  [columnFilters, debouncedSetColumnFilters, enableAdvancedFilter],
);
```

And in the `debouncedSetColumnFilters` callback body, the existing
`if (!controlledState?.columnFilters)` guard for `setInternalColumnFilters` is already
correct — no change needed there.

---

### CR-04: `rowSelection` and `columnVisibility` changes never fire `onStateChange`

**File:** `packages/ui/src/hooks/use-data-table.ts:224,228`

**Issue:** `DataTableState` declares `columnVisibility` and `rowSelection` as part of the
controlled seam. A consumer who passes `onStateChange` to receive state snapshots will
never receive an event when a user selects a row or toggles column visibility, because
those handlers wire directly to the internal setters:

```ts
onRowSelectionChange: setRowSelection,          // no notifyStateChange call
onColumnVisibilityChange: setColumnVisibility,  // no notifyStateChange call
```

`notifyStateChange` is only called from `onPaginationChange`, `onSortingChange`, and
`debouncedSetColumnFilters`. A parent that stores controlled state will fall permanently
out of sync for these two fields until an unrelated state change (pagination, sort, filter)
happens to piggy-back the current values.

**Fix:** Wrap both handlers to call `notifyStateChange` before updating internal state:

```ts
onRowSelectionChange: React.useCallback((updaterOrValue: Updater<RowSelectionState>) => {
  const newRowSelection =
    typeof updaterOrValue === "function"
      ? updaterOrValue(rowSelection)
      : updaterOrValue;
  notifyStateChange({ rowSelection: newRowSelection });
  setRowSelection(newRowSelection);
}, [rowSelection, notifyStateChange]),

onColumnVisibilityChange: React.useCallback((updaterOrValue: Updater<VisibilityState>) => {
  const newColumnVisibility =
    typeof updaterOrValue === "function"
      ? updaterOrValue(columnVisibility)
      : updaterOrValue;
  notifyStateChange({ columnVisibility: newColumnVisibility });
  setColumnVisibility(newColumnVisibility);
}, [columnVisibility, notifyStateChange]),
```

---

## Warnings

### WR-01: `check-imports.sh` Rule 1 misses single-quoted `next/*` imports

**File:** `packages/ui/scripts/check-imports.sh:11`

**Issue:** The grep pattern `from "next/"` uses a double-quoted string literal as the search
target, so it only matches imports written with double quotes. TypeScript/TSX files may
legally use single-quoted imports (`from 'next/navigation'`). A file containing:

```ts
import { useRouter } from 'next/navigation'
```

would pass the CI guard silently with no `FAIL` output. Rules 2 (clerk) and 3 (alert)
are unaffected — Rule 2's search string contains no quote characters and Rule 3 does not
involve import strings.

**Fix:** Match both quote styles in Rule 1:

```bash
NEXT_HITS=$(grep -rn "from ['\"]next/" "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
```

---

### WR-02: `@testing-library/jest-dom` not declared as a `devDependency` in the package

**File:** `packages/ui/package.json` (missing entry), `packages/ui/vitest.setup.ts:6`

**Issue:** `vitest.setup.ts` imports `@testing-library/jest-dom`, but the package is not
listed in `packages/ui/package.json` `devDependencies`. It resolves today only because it
is declared in the monorepo root's `devDependencies` and npm hoists it. When `packages/ui`
is extracted into the Farsight monorepo (Phase 4 / PORT-01), or if the root dependency is
removed, test setup will fail with a module-not-found error.

**Fix:** Add `"@testing-library/jest-dom": "^6.9.1"` to `packages/ui/package.json`
`devDependencies`.

---

### WR-03: `vitest.config.ts` alias `@` maps to `src/`, but `tsconfig.json` maps `@/*` to the package root

**File:** `packages/ui/vitest.config.ts:13`, `packages/ui/tsconfig.json`

**Issue:** The TypeScript compiler resolves `@/foo` to `<package-root>/foo` (paths:
`"@/*": ["./*"]`), while Vitest resolves `@/foo` to `<package-root>/src/foo` (alias:
`{ '@': path.resolve(__dirname, 'src') }`). No source files currently use the `@/` alias
(all imports are relative), so this mismatch is dormant. The moment a test or source file
uses `@/` imports, TS will compile successfully while vitest will resolve a different file,
producing confusing failures.

**Fix:** Align the vitest alias with tsconfig by pointing it to the package root:

```ts
resolve: { alias: { '@': path.resolve(__dirname, '.') } }
```

Or switch tsconfig `paths` to `"@/*": ["./src/*"]` (matching the vitest resolution) and
update any `@/` import that relies on root-relative resolution (currently none).

---

## Info

### IN-01: `eslint.config.mjs` imports `@typescript-eslint/eslint-plugin` as a devDep but does not use it

**File:** `packages/ui/eslint.config.mjs` (entire file), `packages/ui/package.json`

**Issue:** `@typescript-eslint/eslint-plugin` is listed in `devDependencies` and implicitly
expected to be used alongside `@typescript-eslint/parser`, but `eslint.config.mjs` only
imports `@typescript-eslint/parser` (for JSX parsing) and `eslint-plugin-jsx-a11y`. No
`@typescript-eslint/*` rules (`no-explicit-any`, `no-unused-vars`, etc.) are configured.
The plugin is a dead devDependency.

**Fix:** Either add a `plugins: { '@typescript-eslint': tsPlugin }` block with desired rules,
or remove `@typescript-eslint/eslint-plugin` from `devDependencies` to avoid confusion.

---

### IN-02: `"use client"` directive in `toaster.tsx` is a Next.js RSC convention, not standard React

**File:** `packages/ui/src/components/page/toaster.tsx:1`

**Issue:** The `"use client"` directive is a Next.js (and React Server Components) build-time
marker. In the Farsight `apps/web` (Vite/React, no RSC), it is a no-op string literal that
adds harmless noise. The `rollup-preserve-directives` plugin in `tsdown.config.ts` will
preserve it in the bundle. Consumers using Vite will see `"use client"` as an inert
top-level expression with no effect. This is benign today but signals a Next.js assumption
that contradicts the package's framework-agnostic constraint.

**Fix:** Remove the `"use client"` directive. `Toaster` uses `useTheme()` (a client hook),
which means it must be rendered in a client component anyway; consumers using RSC will
place it in their own client boundary. The directive on the library component itself adds
nothing and muddies the abstraction.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
