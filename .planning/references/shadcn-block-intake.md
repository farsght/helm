# shadcn.io Block Intake Checklist

**Created:** 2026-05-29 (during Phase 2 discussion)
**Applies to:** Phases 2–4. Any time we pull a component/block from the **shadcn.io** registry (MCP `shadcnio`) into `packages/ui`.
**Status:** Process reference for planner/executor. Not a license to vendor — see the Licensing Gate below.

---

## Why this exists

shadcn.io is a large registry (~7,800 items; **6,167 blocks** across 56 categories) of mostly **pre-composed surfaces**, not headless primitives. Several categories map directly onto our roadmap (`skeleton`, `empty-state`, `error`, `notification`, `tables`, `settings`, `chat`, `kanban`, `dashboard`). The items are **demos** — a presentational shell + baked-in mock data + self-contained local state. Turning one into a library component is a *decoupling* exercise, identical in spirit to the rest of this project. This doc makes that conversion mechanical and repeatable.

**Default posture: shadcn.io is a PATTERN SOURCE, not a dependency.** Do **not** `shadcn add` blocks into `packages/ui`. Copy-and-decouple only the handful that earn their place.

---

## What a registry item looks like (MCP `get_item_source`)

```jsonc
{
  "name": "tables-bulk-actions",
  "type": "registry:block",            // ui | block | hook | chart | example | style
  "files": [{ "path": "...", "content": "<raw source>", "target": "..." }],
  "dependencies": ["framer-motion", "lucide-react"],   // npm deps
  "registryDependencies": ["badge", "button", "checkbox", "table"], // other registry items
  "premium": true,                     // shadcn.io Pro — licensing matters
  "author": "shadcn.io"
}
```

Key facts observed:
- Imports use the **`~/` alias** (`~/components/ui/skeleton`, `~/lib/utils`) — not Helm's `@/`.
- Blocks use **`export default function`** — opposite of our named-export convention.
- `'use client'` is on line 1 (our tsdown pipeline already preserves it).
- `registryDependencies` resolve to **our own ported primitives** — the dependency chain closes inside `packages/ui`. ✅
- The "Next.js" in descriptions is marketing; the two sampled (`skeleton-card-grid`, `tables-bulk-actions`) had **no `next/*` imports**. Navigation/marketing categories (`login`, `navbar`, `hero`) are the ones likely to carry `next/link` / `next/image` — audit per block.

---

## Item-type triage

| `type` | What it is | Intake effort | Verdict |
|---|---|---|---|
| `registry:ui` | A primitive (e.g. shadcn.io's `empty`, `spinner`) | alias rewrite + named export | Port like Phase 1 if it fills a gap |
| `registry:block` | Surface composition + mock data + local state | full pipeline below | Decouple only curated picks |
| `registry:hook` | Utility hook | alias rewrite; verify no framework deps | Port if useful |
| `registry:chart` | Recharts preset | rewrite palette → `tokens.chart[n]` | Use as chart source |
| `registry:example` | Demo | — | **Don't ship.** Use as test/story fixtures |
| `registry:style`/themes/background/shaders/text | Meta / decorative | — | Out of scope for the data-app domain |

---

## The transform pipeline (per block)

Mechanical steps (1–3) + judgment steps (4–5) + per-block audits (6–8). A block isn't "done" until the Acceptance Criteria pass.

1. **Alias rewrite.** `~/components/ui/X` and `@/components/ui/X` → package-relative path to `src/components/ui/X`; `~/lib/utils` / `@/lib/utils` → relative to `src/lib/utils`. Compute the depth from the file's final location (Phase 1 verified: from `src/components/ui/` the util path is `../../lib/utils` — recompute for deeper dirs like `src/components/blocks/<cat>/`).
2. **Named export, no default.** `export default function Foo()` → `export function Foo()`; add to the file's named exports. (Phase 1 "No Default Export" convention.)
3. **Preserve `'use client'`** on line 1 if present. Don't add it to server-safe components.
4. **Lift mock data to typed props.** Delete the baked-in `const rows = [...]`; introduce a `data`/`items` prop with an exported TS type. Render-slot anything app-specific (cell renderers, icons) rather than hardcoding.
5. **Lift state + callbacks to a controlled-with-uncontrolled-default seam.** Self-contained `useState` + `handleX` become optional controlled props (`value`/`onValueChange`, `onAction`) with an internal-state fallback — the **same seam chosen for DataTable (CONTEXT D-05)**. Keep zero-config usability; allow consumer control.
6. **Strip `next/*`.** `next/link` → `href` + `onClick`/`asChild` prop; `next/image` → `<img>` or an `image` render slot. (Audit — absent in dataless blocks, common in `login`/`navbar`/`hero`.)
7. **Reconcile npm `dependencies`.** Map each against our peer/dep policy. `framer-motion`/`motion` is heavy — prefer a peer, or drop the animation if it's decorative. `lucide-react` follows our icon policy (note the pending 0.576→1.x audit).
8. **Verify `registryDependencies`.** Each must already exist as a ported `packages/ui` primitive. If a block needs a primitive we haven't ported, port the primitive first (or drop the block).

---

## Acceptance criteria (a converted block must pass)

- [ ] CI import-guard clean: **zero `next/*`**, zero `@clerk/nextjs/server`, zero `~/`/unresolved `@/`
- [ ] **No `alert()` / `confirm()`** (CORE-04 convention — destructive → `ConfirmDialog`, transient → toast)
- [ ] **Named export, no default**; `'use client'` preserved if needed
- [ ] **No baked-in mock data**; renders from props (dataless blocks like skeletons are exempt)
- [ ] State/callbacks exposed via the controlled/uncontrolled seam (interactive blocks)
- [ ] `registryDependencies` resolve to ported package primitives
- [ ] Tree-shakeable: lands at its own subpath export, no new barrel
- [ ] a11y baseline holds (focus rings, keyboard, `aria-label` on icon-only buttons — CORE-05)
- [ ] Chart palettes use `tokens.chart[n]`, not hardcoded hex (charts only)

---

## Licensing gate (BLOCKING before any source is vendored)

Sampled blocks are `premium: true`, `author: "shadcn.io"`. Official shadcn/ui is MIT, but **shadcn.io is a separate commercial product**; redistributing its premium source inside `@farsight/ui` (which is copied into the Farsight monorepo) is **redistribution** and may be restricted by the Pro license.

**Verify the shadcn.io Pro license permits redistribution-in-a-derived-package before any block source lands in `packages/ui`.** Surface the concrete terms + implications first. Dataless layout patterns (skeletons) that we re-implement from scratch (rather than copy verbatim) carry the least risk; verbatim premium source carries the most.

---

## Phase fit & candidate picks

- **Phase 2 (cleanest):** `skeleton-*` and `empty-state-*` / `error-*` blocks — 1 file, depend only on `skeleton`/primitives, **no data-lifting** (inherently dataless). Seed candidates for CONTEXT D-03 / D-02:
  - `card-grid-skeleton` ← `skeleton-card-grid`
  - `list-skeleton` ← `skeleton-article-list` / `skeleton-activity-feed`
  - `detail-skeleton` ← `skeleton-dashboard-full` / `skeleton-blog-post`
  - `EmptyState` / `ErrorState` styling ← `empty-state-*`, `error` category
  - Also evaluate official `@shadcn/empty` + `@shadcn/spinner` primitives.
- **Phase 3 (notifications):** `notification-center`, `notification-bell-dropdown`, `notification-api-error`, `notification-empty-state` — *pattern source*; rebuilt onto contracts + the adapter seam.
- **Phase 4 (surfaces):** `tables-*`, `kanban`, `dashboard-*`, `chat`, `settings` — *pattern source* for datasets/pipelines/agents.
- **Charts:** the 53 presets — intake = palette swap to `tokens.chart[n]`.
- **Examples (1,101):** characterization-test fixtures / Storybook stories, not shipped code.

---

## Worked examples

Two ends of the difficulty spectrum, both run through the pipeline above. (Produced during Phase 2 discussion; not yet vendored — pending the Licensing Gate.)

### A. Dataless / static — `skeleton-card-grid` → `CardGridSkeleton`

Exercises steps 1–3 + the two "un-demo" refinements. Source shipped `export default function`, `~/` alias, a `<section className="mx-auto max-w-2xl p-4">` page wrapper, a reflexive `'use client'`, and a fixed 6-card grid.

Decoupled result (`src/components/ui/card-grid-skeleton.tsx`):

```tsx
import * as React from "react"

import { cn } from "../../lib/utils"
import { Skeleton } from "./skeleton"

const TITLE_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5", "w-2/3"] as const
const BODY_WIDTHS = ["w-full", "w-5/6", "w-full", "w-4/5", "w-full", "w-5/6"] as const
const COLS = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const

type CardGridSkeletonProps = React.ComponentProps<"div"> & {
  /** Number of placeholder cards. @default 6 */
  count?: number
  /** Columns at the `sm` breakpoint and up. @default 2 */
  columns?: keyof typeof COLS
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

Key refinements beyond the mechanical steps:
- **Dropped `'use client'`** — no hooks/handlers/browser APIs → server-safe like the base `skeleton.tsx`. The block added it reflexively.
- **Stripped demo page-chrome** — the `mx-auto max-w-2xl p-4` wrapper imposes layout a primitive must not; root is now a container-filling `<div>` that forwards `className` + `...props`.
- **Lifted `count`/`columns` to props**; width variation kept **SSR-safe** via `i % len` (no `Math.random`).
- Added `data-slot`.

### B. Stateful / interactive — `tables-bulk-actions` → `BulkActionsTable<T>`

Exercises steps 4–5 in full. Source shipped 8 hardcoded `contacts`, a `statusConfig` map, `useState` selection, a `useEffect` indeterminate-checkbox sync, hardcoded Email/Export/Archive/Delete buttons, a `setTimeout` fake-feedback string, and a `framer-motion` entrance wrapper.

Decoupled result (`src/components/ui/bulk-actions-table.tsx`): keeps `'use client'`, generic over `<T>`.

```tsx
"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

type BulkAction = { id: string; label: string; icon?: React.ReactNode; destructive?: boolean }
type BulkActionsColumn<T> = { id: string; header: React.ReactNode; cell: (row: T) => React.ReactNode; className?: string }

type BulkActionsTableProps<T> = {
  data: T[]
  columns: BulkActionsColumn<T>[]
  getRowId: (row: T) => string
  actions: BulkAction[]
  onAction: (actionId: string, selectedIds: string[]) => void
  getRowLabel?: (row: T) => string
  /** Controlled selection. Omit for internal (uncontrolled) state. */
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  className?: string
}

function BulkActionsTable<T>({
  data, columns, getRowId, actions, onAction, getRowLabel,
  selectedIds: controlled, onSelectionChange, className,
}: BulkActionsTableProps<T>) {
  // controlled-with-uncontrolled-default seam (CONTEXT D-05)
  const [internal, setInternal] = React.useState<string[]>([])
  const selected = controlled ?? internal
  const setSelected = React.useCallback((ids: string[]) => {
    onSelectionChange?.(ids)
    if (controlled === undefined) setInternal(ids)
  }, [controlled, onSelectionChange])

  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const allSelected = data.length > 0 && selected.length === data.length
  const someSelected = selected.length > 0 && !allSelected

  const headerRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    const input = headerRef.current?.querySelector("input")
    if (input) input.indeterminate = someSelected
  }, [someSelected])

  const toggleAll = () => setSelected(allSelected || someSelected ? [] : data.map(getRowId))
  const toggleRow = (id: string) =>
    setSelected(selectedSet.has(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div data-slot="bulk-actions-table" className={cn("relative overflow-hidden rounded-lg border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox ref={headerRef} aria-label="Select all rows" checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            {columns.map(col => (
              <TableHead key={col.id} className={cn("text-xs font-medium text-muted-foreground", col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(row => {
            const id = getRowId(row)
            const isSelected = selectedSet.has(id)
            return (
              <TableRow key={id} className={cn(isSelected && "bg-muted/50")}>
                <TableCell>
                  <Checkbox
                    aria-label={getRowLabel ? `Select ${getRowLabel(row)}` : "Select row"}
                    checked={isSelected}
                    onCheckedChange={() => toggleRow(id)}
                  />
                </TableCell>
                {columns.map(col => (
                  <TableCell key={col.id} className={col.className}>{col.cell(row)}</TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Floating bulk-action toolbar — CSS transition, no framer-motion */}
      <div className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 transition-all duration-200",
        selected.length > 0 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}>
        <div role="toolbar" aria-label="Bulk actions" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="Clear selection" onClick={() => setSelected([])}>Clear</Button>
          <div className="h-4 w-px bg-border" />
          {actions.map(action => (
            <Button key={action.id} size="sm" variant="ghost"
              className={cn("h-7", action.destructive && "text-destructive hover:text-destructive")}
              onClick={() => onAction(action.id, selected)}>
              {action.icon}{action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { BulkActionsTable }
export type { BulkAction, BulkActionsColumn, BulkActionsTableProps }
```

Decoupling decisions:
- **Step 4** — deleted the 8-row `contacts` mock + `statusConfig`; generic `<T>` over `data`/`columns`/`getRowId`. Status badge rendering moves to the consumer's `cell`.
- **Step 5** — selection lifted to the **controlled/uncontrolled seam (D-05)**; hardcoded action buttons → an `actions` prop; the `setTimeout` fake-feedback string → a real `onAction(id, ids)` callback (feedback is the consumer's toast per CORE-04).
- **Step 7** — **dropped `framer-motion`** (decorative entrance only) → CSS transition; `lucide-react` icons leave the file (passed via `action.icon`) → the module imports zero npm deps.
- **Step 8** — `badge` drops off `registryDependencies`; only `button`/`checkbox`/`table` remain (all ported).
- **a11y** — indeterminate state preserved; `role="toolbar"` + labels added; icon-only clear button given a text+aria label.

**Bigger lesson:** the only *novel reusable* part of this block is the selection + floating-toolbar behavior. Since we already own DataGrid/DataTable, the leaner Phase-4 extraction is a `<BulkActionBar>` composed over DataTable's existing row-selection rather than this standalone table — but the version above proves the full data+state lift.

---

*Reference for: Farsight UI Library (Helm Extraction). Source registry: shadcn.io via MCP `shadcnio`.*
