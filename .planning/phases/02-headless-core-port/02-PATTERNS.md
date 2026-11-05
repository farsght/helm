# Phase 2: Headless Core Port — Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 8 distinct file groups (34-primitive group counted as 1 group + 7 individually-mapped targets)
**Analogs found:** 7 / 8 (the vitest/eslint infra has a partial analog — Helm's root configs)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/ui/src/components/ui/*.tsx` (34 files) | component | request-response | `components/ui/*.tsx` (Helm) | exact — verbatim + alias rewrite |
| `packages/ui/src/components/page/{page-header,empty-state,confirm-dialog}.tsx` | component | request-response | Same-named Helm source files | exact — verbatim + alias rewrite |
| `packages/ui/src/components/page/error-state.tsx` | component | request-response | `components/page/empty-state.tsx` (Helm) | exact-structural — same shape, add `onRetry` |
| `packages/ui/src/components/page/toaster.tsx` | component | request-response | RESEARCH.md §Pattern 3 (Sonner + next-themes) | new — no Helm analog |
| `packages/ui/src/components/page/{card-grid,list,detail}-skeleton.tsx` | component | request-response | `components/data-grid/data-grid-skeleton.tsx` + `components/ui/skeleton.tsx` | role-match — re-implement from same primitives |
| `packages/ui/src/hooks/use-data-table.ts` | hook | request-response | `hooks/use-data-table.ts` (Helm) | transform — nuqs → React.useState seam |
| `packages/ui/src/hooks/use-data-grid.ts` + all other hooks/lib/types/config | hook/utility | request-response | Same-named Helm source files | exact — verbatim + alias rewrite |
| `packages/ui/scripts/check-imports.sh` | config (CI) | — | `packages/ui/scripts/check-directives.sh` (Phase 1) | role-match — same bash grep pattern |
| `packages/ui/vitest.config.ts` + `vitest.setup.ts` + `eslint.config.mjs` | config (test/lint) | — | `/Users/scottjensen/Projects/helm/vitest.config.ts` + `vitest.setup.ts` | partial-match — jsdom env same; setup strips Helm-specific mocks |

---

## Pattern Assignments

---

### GROUP: 34 `components/ui/*` primitives + ported page components + hooks/lib/types/config (verbatim + alias rewrite)

**Analog:** The same-named Helm source files — e.g., `/Users/scottjensen/Projects/helm/components/ui/button.tsx`, `/Users/scottjensen/Projects/helm/hooks/use-data-grid.ts`

**This group uses the LOCKED Phase 1 port pattern exclusively.** Do NOT derive bespoke patterns per file. Apply the same transform to all:

**The single required transform — alias rewrite:**

From `components/ui/button.tsx` (lines 1–5), which exemplifies the only cross-package import in all 34 primitives:
```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"   // ← REWRITE: import { cn } from "../../lib/utils"
```

The rewrite rule (verified empirically in Phase 1):
- `@/lib/utils` → `../../lib/utils` (two levels: `src/components/ui/` → `src/components/` → `src/`)
- `@/components/ui/X` → `./X` (same-dir relative, within `components/ui/`)
- `@/hooks/X` → `../../hooks/X`
- `@/lib/X` → `../../lib/X`
- `@/types/X` → `../../types/X`
- `@/config/X` → `../../config/X`

**Depth reference by destination directory:**

| Destination dir | Depth | `@/lib/utils` becomes |
|---|---|---|
| `src/components/ui/` | 2 | `../../lib/utils` |
| `src/components/page/` | 2 | `../../lib/utils` |
| `src/components/data-grid/` | 2 | `../../lib/utils` |
| `src/components/data-table/` | 2 | `../../lib/utils` |
| `src/hooks/` | 1 | `../lib/utils` |
| `src/lib/` | 1 | `./utils` (same dir) |
| `src/types/` | 1 | `../lib/utils` |
| `src/config/` | 1 | `../lib/utils` |

**`'use client'` preservation — must be line 1:**

From `components/ui/label.tsx` (lines 1–2), representative of the 26/34 client components:
```typescript
"use client"

import * as React from "react"
```

From `components/ui/skeleton.tsx` (full file — server-safe, no directive):
```typescript
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

**Named export, no default — the invariant for every ported file:**

```typescript
// CORRECT — named export
export { Button, buttonVariants }

// WRONG — never use
export default Button
```

**`data-slot` attribute — copy verbatim, never strip:**

From `components/ui/button.tsx` (line within the render):
```tsx
<Comp
  data-slot="button"
  className={cn(buttonVariants({ variant, size, className }))}
  {...props}
/>
```

**Files in this group (copy list):**
- All 34 `components/ui/*.tsx` files
- `components/page/page-header.tsx`, `empty-state.tsx`, `confirm-dialog.tsx`
- `components/data-grid/` all 17 files (including `data-grid-skeleton.tsx`)
- `components/data-table/` all 9 files (including `data-table-skeleton.tsx`)
- `hooks/use-data-grid.ts` (3273 lines, zero nuqs/next/clerk — travels as-is after alias rewrite)
- `hooks/use-data-grid-undo-redo.ts`
- `hooks/use-as-ref.ts`, `use-isomorphic-layout-effect.ts`, `use-lazy-ref.ts`, `use-debounced-callback.ts`, `use-callback-ref.ts`, `use-badge-overflow.ts`
- `lib/data-grid.ts`, `lib/data-grid-coercion.ts`, `lib/data-grid-filters.ts`, `lib/data-table.ts`, `lib/compose-refs.ts`, `lib/format.ts`
- `types/data-grid.ts`, `types/data-table.ts` (with nuqs-coupled `QueryKeys` fields stripped — see DataTable seam below)
- `config/data-table.ts` (confirmed zero nuqs — travels verbatim)

---

### `packages/ui/src/components/page/error-state.tsx` (component, request-response) — NEW

**Analog:** `/Users/scottjensen/Projects/helm/components/page/empty-state.tsx`

**Full analog source** (22 lines):
```typescript
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

**Delta from analog to `error-state.tsx`:**

| Property | `EmptyState` (analog) | `ErrorState` (new) |
|---|---|---|
| `title` prop | required `string` | optional `string` (default: `"Something went wrong"`) |
| `icon` color class | `text-muted-foreground/40` | `text-destructive/60` |
| `onRetry` prop | absent | `onRetry?: () => void` — renders `<Button variant="outline" size="sm">Try again</Button>` |
| Action container | wraps `{action}` in a plain `<div className="mt-4">` | wraps both `onRetry` button and `{action}` in a flex row `<div className="mt-4 flex items-center gap-2">` |
| `'use client'` | absent (server-safe) | absent (server-safe — no hooks) |
| Export style | named: `export function EmptyState` | named: `export { ErrorState }` + `export type { ErrorStateProps }` |
| `data-slot` | absent in analog | `data-slot="error-state"` (add per convention) |

**Import rewrite:**
- `@/lib/utils` → `../../lib/utils`
- `import type { LucideIcon } from "lucide-react"` — type-only import stays as-is (RSC-safe; no runtime import)
- Add: `import { Button } from "../ui/button"` for the retry button

**Full target shape** (from RESEARCH.md §Code Examples, lines 776–823):
```typescript
// packages/ui/src/components/page/error-state.tsx
// Re-implemented from scratch per D-13 — NOT copied from shadcn.io
import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"

type ErrorStateProps = {
  title?: string
  description?: string
  icon?: LucideIcon
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
}

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

---

### `packages/ui/src/components/page/toaster.tsx` (component, request-response) — NEW

**Analog:** No Helm analog — the `Toaster` primitive does not exist in `components/ui/` or `components/page/`. Pattern comes from RESEARCH.md §Pattern 3 (Sonner + next-themes official shadcn/ui pattern).

**Imports pattern:**
```typescript
"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "next-themes"
```

**Core pattern — the `= "system"` default handles missing ThemeProvider:**
```typescript
function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()
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

**Key constraints:**
- `'use client'` on line 1 — `useTheme` is a client hook
- `useTheme()` with `= "system"` default gracefully degrades when no `ThemeProvider` is mounted above in the tree (returns `{ theme: undefined }`)
- `from "next-themes"` does NOT trigger the `check-imports.sh` Rule 1 guard (the rule matches `from "next/"` with a trailing slash — `next-themes` has no slash after `next`)
- `sonner` stays in `dependencies` (library bundles it); `next-themes` moves from `dependencies` → `peerDependencies` + `peerDependenciesMeta: { "next-themes": { "optional": true } }`
- Named export only: `export { Toaster }`

---

### `packages/ui/src/components/page/{card-grid-skeleton,list-skeleton,detail-skeleton}.tsx` (component, request-response) — NEW

**Primary analog:** `/Users/scottjensen/Projects/helm/components/data-grid/data-grid-skeleton.tsx`

**Secondary analog:** `/Users/scottjensen/Projects/helm/components/data-table/data-table-skeleton.tsx`

**Base primitive:** `/Users/scottjensen/Projects/helm/components/ui/skeleton.tsx` (the `<Skeleton>` component all three new skeletons build on)

**Reuse pattern from data-grid-skeleton.tsx** (lines 1–64):
```typescript
// Pattern: multi-sub-component export from one file
// data-grid-skeleton exports: DataGridSkeleton, DataGridSkeletonGrid, DataGridSkeletonToolbar

// Sub-component composable pattern:
function DataGridSkeletonToolbar({
  align = "end",
  actionCount = 4,
  className,
  ...props
}: DataGridSkeletonToolbarProps) {
  return (
    <div data-slot="grid-skeleton-toolbar" className={cn("flex items-center gap-2", ...)}>
      {Array.from({ length: actionCount }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-20 shrink-0" />
      ))}
    </div>
  )
}
```

**Key patterns to copy from both analogs:**
- `Array.from({ length: count }).map((_, i) => ...)` for repeating skeleton rows/cards (safe SSR — no `Math.random`)
- `data-slot="..."` on root element
- Props: `count?`, `columns?`, `className`, `...props` spread (forwarded to root `<div>`)
- No `'use client'` — all three new skeletons are server-safe (no hooks, no handlers)
- Named export per component (no default)
- Import chain: `import { Skeleton } from "../ui/skeleton"` (same `components/` level) + `import { cn } from "../../lib/utils"`

**Layout reference — CardGridSkeleton from shadcn-block-intake.md worked example** (the pattern-only reference, re-implemented from scratch per D-13):
```typescript
// packages/ui/src/components/page/card-grid-skeleton.tsx
// Re-implemented from scratch using MIT Skeleton primitive only
import * as React from "react"
import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"

const TITLE_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5", "w-2/3"] as const
const BODY_WIDTHS = ["w-full", "w-5/6", "w-full", "w-4/5", "w-full", "w-5/6"] as const
const COLS = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const

type CardGridSkeletonProps = React.ComponentProps<"div"> & {
  count?: number    // @default 6
  columns?: keyof typeof COLS  // @default 2
}

function CardGridSkeleton({ count = 6, columns = 2, className, ...props }: CardGridSkeletonProps) {
  return (
    <div data-slot="card-grid-skeleton" className={cn("overflow-hidden rounded-lg border bg-card", className)} {...props}>
      <div className={cn("grid grid-cols-1 gap-px bg-border", COLS[columns])}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-3 bg-card p-4">
            <Skeleton className="h-24 w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className={cn("h-4", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className={cn("h-3", BODY_WIDTHS[i % BODY_WIDTHS.length])} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { CardGridSkeleton }
```

**`list-skeleton.tsx` and `detail-skeleton.tsx`** follow the identical structural template:
- Same import block (`cn` + `Skeleton`)
- Same `data-slot` convention
- Same props pattern (`count?` + `className` + `...props`)
- Same `Array.from` SSR-safe repetition
- Same named export
- Layout varies: `list-skeleton` renders stacked rows (avatar circle + title/subtitle lines); `detail-skeleton` renders a header block + body content area (e.g., a wide header Skeleton + a narrower body Skeleton below)

**D-13 enforcement:** These files MUST NOT copy any verbatim source from shadcn.io Pro blocks. The `CardGridSkeleton` worked example above is the correct template — it uses only the open-source MIT `<Skeleton>` primitive and reconstructs the layout pattern from scratch.

---

### `packages/ui/src/hooks/use-data-table.ts` (hook, request-response) — TRANSFORM

**Analog:** `/Users/scottjensen/Projects/helm/hooks/use-data-table.ts` (316 lines)

**The nuqs imports to remove** (lines 19–27 of Helm source):
```typescript
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type SingleParser,
  type UseQueryStateOptions,
  useQueryState,
  useQueryStates,
} from "nuqs";
```

**The nuqs-specific props to strip from `UseDataTableProps`** (lines 43–66):
```typescript
// REMOVE these from the ported interface — they are nuqs-only:
queryKeys?: Partial<QueryKeys>;     // references nuqs option shapes via QueryKeys type
history?: "push" | "replace";      // nuqs push/replace behavior
clearOnDefault?: boolean;           // nuqs clear-on-default
scroll?: boolean;                   // nuqs scroll param
shallow?: boolean;                  // nuqs shallow routing
startTransition?: React.TransitionStartFunction;  // nuqs transition
```

**The nuqs `useQueryState` calls to replace** (lines 119–200, 5 state slices):

| Helm (nuqs) | Ported (React.useState) |
|---|---|
| `const [page, setPage] = useQueryState(pageKey, parseAsInteger.withDefault(1))` | `const [page, setPage] = React.useState(initialState?.pagination?.pageIndex ?? 0)` |
| `const [perPage, setPerPage] = useQueryState(perPageKey, parseAsInteger.withDefault(10))` | `const [perPage, setPerPage] = React.useState(initialState?.pagination?.pageSize ?? 10)` |
| `const [sorting, setSorting] = useQueryState(sortKey, getSortingStateParser(...).withDefault([]))` | `const [sorting, setSorting] = React.useState<ExtendedColumnSort<TData>[]>(initialState?.sorting ?? [])` |
| `const [filterValues, setFilterValues] = useQueryStates(filterParsers)` | `const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialState?.columnFilters ?? [])` |
| joinOperator via `useQueryState` | `const [joinOperator, setJoinOperator] = React.useState<"and" | "or">("and")` |

**New exports added to the seam** (from RESEARCH.md §Pattern 2):
```typescript
export type DataTableState = {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
};

export type DataTableStateProps = {
  /** Opt-in controlled state. Omit for internal (uncontrolled) default. */
  state?: Partial<DataTableState>;
  onStateChange?: (state: DataTableState) => void;
};
```

**Controlled/uncontrolled seam pattern** (from shadcn-block-intake.md `BulkActionsTable` worked example — the exact same D-05 seam):
```typescript
// controlled-with-uncontrolled-default seam
const [internal, setInternal] = React.useState<string[]>([])
const selected = controlled ?? internal
const setSelected = React.useCallback((ids: string[]) => {
  onSelectionChange?.(ids)
  if (controlled === undefined) setInternal(ids)
}, [controlled, onSelectionChange])
```

Applied to the DataTable: each state slice uses `props.state?.X ?? internalX` as the live value; each setter calls `props.onStateChange?.({ ...allState, X: newX })` then updates internal state only when `props.state` is undefined.

**`lib/parsers.ts` does NOT travel to packages/ui.** It imports from `nuqs/server` + `zod`. It remains in Helm as the reference implementation for the Phase 4 consumer-side nuqs adapter.

**`types/data-table.ts` nuqs field stripping:** The `QueryKeys` type references `UseQueryStateOptions['history']` and other nuqs option types. In the ported version, strip nuqs-coupled fields and keep only the pure pagination/sorting/filter shape types. The `QueryKeys` type itself should not appear in the ported `use-data-table.ts` interface.

---

### `packages/ui/scripts/check-imports.sh` (CI script) — NEW

**Analog:** `/Users/scottjensen/Projects/helm/packages/ui/scripts/check-directives.sh` (Phase 1)

**Analog source** (30 lines — the exact bash-grep pattern to copy):
```bash
#!/usr/bin/env bash
# CI assertion for PKG-03: 'use client' directive preservation in dist/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: dist/ directory not found at $DIST_DIR — run npm run build first"
  exit 1
fi

CLIENT_COUNT=$(grep -rl '"use client"' "$DIST_DIR" 2>/dev/null | grep '\.js$' | wc -l | tr -d ' ')
EXPECTED=1

if [ "$CLIENT_COUNT" -lt "$EXPECTED" ]; then
  echo "FAIL: 'use client' directives missing in dist/ — got $CLIENT_COUNT, expected >= $EXPECTED"
  exit 1
fi

echo "PASS: $CLIENT_COUNT 'use client' file(s) in dist/ (expected >= $EXPECTED)"
```

**The same structural pattern for `check-imports.sh`:**
- `#!/usr/bin/env bash` + `set -euo pipefail`
- `SCRIPT_DIR` + derived `SRC` dir (target `src/` not `dist/`)
- `fail=0` accumulator — all rules run, exit with total `$fail`
- Each rule: `HITS=$(grep -rn 'pattern' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)` then `[ -n "$HITS" ]` to fail
- Final `exit "$fail"`

**Complete target script** (from RESEARCH.md §Code Examples, lines 694–735):
```bash
#!/usr/bin/env bash
# packages/ui/scripts/check-imports.sh — CORE-01 / CORE-04 CI guard — Phase 2
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src"
fail=0

# Rule 1: No next/* imports (next-themes is NOT next/* — does not match "next/")
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

**Also update `check-directives.sh`:** Change `EXPECTED=1` → `EXPECTED=26` at Phase 2 completion (after all 34 + page primitives are ported and built). Do NOT preset to 26 before the port is done — the Phase 1 script comment already documents this.

---

### `packages/ui/vitest.config.ts` + `vitest.setup.ts` + `eslint.config.mjs` (config, test/lint infra) — NEW

**Analog:** `/Users/scottjensen/Projects/helm/vitest.config.ts` + `/Users/scottjensen/Projects/helm/vitest.setup.ts`

**Helm vitest.config.ts** (full, 14 lines):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { reporter: ['text', 'lcov'], include: ['app/api/**', 'lib/**'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

**Helm vitest.setup.ts** (full, 31 lines):
```typescript
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost/mock';
import '@testing-library/jest-dom'
import { vi } from 'vitest'
vi.mock('next/navigation', ...)
vi.mock('next/headers', ...)
vi.mock('server-only', ...)
vi.mock('@clerk/nextjs/server', ...)
```

**Delta for `packages/ui/vitest.config.ts`:**

| Property | Helm root config | packages/ui config |
|---|---|---|
| `alias` | `'@': path.resolve(__dirname, '.')` | `'@': path.resolve(__dirname, 'src')` — or remove alias entirely; ported files use relative imports |
| `coverage.include` | `['app/api/**', 'lib/**']` | `['src/**']` |
| `setupFiles` | `['./vitest.setup.ts']` | `['./vitest.setup.ts']` (same) |
| `environment` | `'jsdom'` | `'jsdom'` (same — vitest-axe requires jsdom, not happy-dom) |
| `globals` | `true` | `true` (same) |

**Target `packages/ui/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { reporter: ['text', 'lcov'], include: ['src/**'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

**Target `packages/ui/vitest.setup.ts` — strip all Helm-specific mocks:**
```typescript
// packages/ui/vitest.setup.ts
// No DATABASE_URL stub — packages/ui has no DB
// No next/* mocks — packages/ui has zero next/* imports (enforced by check-imports.sh)
// No @clerk/* mocks — packages/ui has no clerk imports

import '@testing-library/jest-dom'
import 'vitest-axe/extend-expect'
// vitest-axe/extend-expect adds toHaveNoViolations() matcher to expect()
```

**Target `packages/ui/eslint.config.mjs`** (from RESEARCH.md §Code Examples, lines 827–847):
```javascript
// packages/ui/eslint.config.mjs
import jsxA11y from "eslint-plugin-jsx-a11y"

export default [
  {
    files: ["src/**/*.tsx"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  },
]
```

---

## Shared Patterns

### `@/` Alias Rewrite Rule
**Source:** Every `components/ui/*.tsx` + `hooks/*.ts` + `lib/*.ts` in Helm  
**Apply to:** All 65+ files being ported to packages/ui

The alias `@/` resolves to Helm repo root. In `packages/ui`, all cross-package imports use package-relative paths. The two-level rewrite (`../../lib/utils`) was verified empirically in Phase 1. See the depth table in the GROUP section above for all directory levels.

**No other alias transforms exist** — `@/lib/utils` is the only alias in `components/ui/`. Data-grid/data-table components also use `@/components/ui/X`, `@/hooks/X`, `@/lib/X`, `@/types/X` — all follow the same depth-based rule.

### Named Export / No Default Pattern
**Source:** `components/ui/button.tsx` (line 64), `components/ui/card.tsx` (lines 84–92), `lib/utils.ts`  
**Apply to:** All ported and new files

```typescript
export { Button, buttonVariants }  // correct
export default Button              // never
```

### `data-slot` Attribute Pattern
**Source:** `components/ui/button.tsx`, `components/data-grid/data-grid-skeleton.tsx` (line 12)  
**Apply to:** All component root elements (new and ported)

Every component root carries `data-slot="<kebab-component-name>"`. Copy verbatim from source; add to new files (`error-state`, `toaster`, `card-grid-skeleton`, `list-skeleton`, `detail-skeleton`).

### `'use client'` Preservation
**Source:** 26 of 34 Helm `components/ui/` files  
**Apply to:** All 26 client components when porting; add to `toaster.tsx` (new); do NOT add to `error-state.tsx` or skeleton files (server-safe)

Server-safe (no directive): `badge`, `breadcrumb`, `button`, `card`, `input`, `kbd`, `skeleton`, `textarea`, `error-state`, `card-grid-skeleton`, `list-skeleton`, `detail-skeleton`  
Client (have directive): all 26 remaining `ui/` components + `toaster.tsx`

### CI Bash Grep Pattern
**Source:** `packages/ui/scripts/check-directives.sh`  
**Apply to:** `check-imports.sh` (new Phase 2 script)

Structural pattern: `set -euo pipefail` → derive target dir from `SCRIPT_DIR` → accumulate `fail` → each rule runs independently → exit `$fail`. The `2>/dev/null || true` suffix on each grep prevents `set -e` from failing on zero matches.

### Skeleton Composition Pattern
**Source:** `components/data-grid/data-grid-skeleton.tsx`, `components/data-table/data-table-skeleton.tsx`  
**Apply to:** `card-grid-skeleton.tsx`, `list-skeleton.tsx`, `detail-skeleton.tsx`

`Array.from({ length: count }).map((_, i) => ...)` — SSR-safe repetition with no `Math.random`. Width variation via `i % WIDTHS.length` lookup into a `const` array (also SSR-safe). Props: `count?` + `className` + `...props` spread to root.

### Controlled/Uncontrolled Seam Pattern
**Source:** shadcn-block-intake.md `BulkActionsTable` worked example (the canonical seam pattern)  
**Apply to:** `use-data-table.ts` wrapper seam (D-05)

```typescript
// State is internal by default; controlled when props.state is provided
const [internalPagination, setInternalPagination] = React.useState<PaginationState>(...)
const pagination = props.state?.pagination ?? internalPagination
// Setter notifies both onStateChange and updates internal state (only when uncontrolled)
```

---

## No Analog Found

| File | Role | Data Flow | Reason | Where to Get the Pattern |
|------|------|-----------|--------|--------------------------|
| `packages/ui/src/components/page/toaster.tsx` | component | request-response | Helm has no Sonner `Toaster` wrapper primitive — it calls `toast()` directly from `sonner` at call sites, never wraps the provider | RESEARCH.md §Pattern 3 — the official shadcn/ui Toaster + next-themes pattern (lines 408–488) |

---

## Critical Implementation Notes for Planner

1. **`check-imports.sh` Rule 1 nuance:** `from "next-themes"` does NOT match `from "next/"` (the trailing slash is the discriminator). No special allowlist logic is needed for next-themes — it naturally passes the grep. The `grep -v 'next-themes'` in the RESEARCH.md Pattern 2 version is belt-and-suspenders only; the final §Code Examples version (lines 694–735) omits it cleanly.

2. **lucide-react v1 icon audit required at port time:** `data-table-date-filter.tsx` and `data-table-faceted-filter.tsx` likely import `XCircle` (renamed to `CircleX` in v1). Verify each icon name against lucide.dev at port time. `import type { LucideIcon }` is type-only and RSC-safe anywhere.

3. **`vitest-axe` jsdom-only:** The existing Helm vitest config already uses `jsdom` — the packages/ui config copies this. Do not switch to `happy-dom` (vitest-axe incompatible).

4. **Skeleton location:** RESEARCH.md recommends `packages/ui/src/skeleton-primitives/`. The shadcn-block-intake.md worked example places `CardGridSkeleton` at `src/components/ui/card-grid-skeleton.tsx`. The planner should decide between `components/page/` (colocated with `EmptyState`/`ErrorState` as a loading/error/empty trio) vs. `components/ui/` (alongside base `skeleton.tsx`) vs. a standalone `skeleton-primitives/` dir. All three are consistent with Phase 1 conventions — preference for `components/page/` since CONTEXT.md §Specific Ideas frames these as a presentational trio with `EmptyState`/`ErrorState`.

5. **`types/data-table.ts` nuqs surgery:** The `QueryKeys` type (and any type that references `UseQueryStateOptions`) must be stripped from the ported file. Keep `ExtendedColumnSort<TData>` and pure structural types.

6. **`check-directives.sh` EXPECTED threshold:** Change from `1` → `26` only AFTER Phase 2 port is complete and `build` exits 0. The script comment already documents this intent. Toaster adds 1 more client component (total would be 27+), so the final threshold may be 27 — count at completion, don't preset.

---

## Metadata

**Analog search scope:** `/Users/scottjensen/Projects/helm/components/ui/`, `/components/page/`, `/components/data-grid/`, `/components/data-table/`, `/hooks/`, `/packages/ui/scripts/`, `/vitest.config.ts`, `/vitest.setup.ts`, `.planning/references/shadcn-block-intake.md`  
**Files read:** `components/page/empty-state.tsx`, `components/data-grid/data-grid-skeleton.tsx`, `components/data-table/data-table-skeleton.tsx`, `components/ui/skeleton.tsx`, `packages/ui/scripts/check-directives.sh`, `hooks/use-data-table.ts` (lines 1–220), `vitest.config.ts`, `vitest.setup.ts`, `shadcn-block-intake.md` (lines 1–220), `01-PATTERNS.md` (full), `02-CONTEXT.md` (full), `02-RESEARCH.md` (full)  
**Pattern extraction date:** 2026-05-29
