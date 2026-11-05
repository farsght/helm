---
phase: 04-contract-gated-surfaces-monorepo-port
plan: 02
subsystem: datasets
tags: [tanstack-query, farsight-contracts, dataset-surface, rag-search, discriminated-union, datatable]

# Dependency graph
requires:
  - phase: 04-contract-gated-surfaces-monorepo-port
    plan: 01
    provides: "import-safe stubs for use-datasets.ts + dataset-list.tsx overwritten by this plan; TestProvider/mock-fetch test helpers"
provides:
  - "use-datasets.ts: datasetKeys + 5 hooks (list/get/records/delete/search) with D-02 enabled:!!projectSlug guard"
  - "DatasetList: DataTable with Farsight Dataset shape columns, ConfirmDialog delete, onNavigate prop"
  - "DatasetDetail: metadata card + Tabs (Records + Search), back button via onNavigate prop"
  - "DatasetRecords: DataTable of NormalizedRecord rows with loading/error/empty guards"
  - "DatasetSearch: discriminated-union result renderer (vectorize/none/ai_search), indexingPending notice"
  - "datasets/index.ts surface barrel"
  - "src/index.ts Phase-4 dataset hooks + surfaces block registered"
affects: [04-06 port-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union search result renderer branching on result.backend without dangerouslySetInnerHTML (T-04-02-T1 mitigation)"
    - "DatasetList overrides 04-01 null stub with real DataTable component + ConfirmDialog delete gate"
    - "useDataTable with pageCount=-1 for client-side pagination (required prop with default semantics)"

key-files:
  created:
    - packages/ui/src/components/datasets/dataset-detail.tsx
    - packages/ui/src/components/datasets/dataset-records.tsx
    - packages/ui/src/components/datasets/dataset-search.tsx
    - packages/ui/src/components/datasets/index.ts
  modified:
    - packages/ui/src/hooks/use-datasets.ts
    - packages/ui/src/components/datasets/dataset-list.tsx
    - packages/ui/src/index.ts
    - packages/ui/__tests__/hooks/use-datasets.test.ts

key-decisions:
  - "pageCount=-1 required for useDataTable — interface requires explicit pageCount (maps to 'unknown' pagination mode)"
  - "DatasetList guards list rendering in DatasetListInner sub-component to keep hook call ordering stable with early-return guards"
  - "DatasetSearch pre-search EmptyState uses !hasSearched && !isPending predicate to avoid flash on first submit"

# Metrics
duration: 40min
completed: 2026-05-29
---

# Phase 4 Plan 02: Datasets Vertical Walking Slice Summary

**Datasets vertical (D-02): use-datasets.ts hook factory + DatasetList/Detail/Records/Search components on Farsight contracts, decoupled from Next.js, with discriminated-union RAG search renderer.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-05-29
- **Tasks:** 2
- **Files created:** 5 / modified: 4

## Accomplishments

**Task 1: use-datasets.ts hook factory**
- `datasetKeys` key factory: all/list/detail/records segments — locked shape from 04-01 preserved
- `useDatasetsQueryOptions`: list with `enabled: !!orgSlug && !!projectSlug` D-02 guard, staleTime 30_000
- `useDatasetQueryOptions`: single dataset get with `!!id` guard added to ready check
- `useDatasetRecordsQueryOptions`: paginated records with same guard pattern
- `useDeleteDatasetMutation`: server-confirmed, onSettled invalidates `datasetKeys.all`
- `useSearchDatasetMutation`: stateless POST, no invalidation, AnyFn SDK cast (matches use-webhooks.ts exactly)
- No "use client" directive; no next/* imports
- 2 `it.todo` tests promoted to live assertions (enabled=false + enabled=true guard tests) — both pass

**Task 2: Dataset surface components + barrel registration**
- `DatasetList`: DataTable with Farsight Dataset shape columns (name/kind/recordCount/searchBackend/vectorizeStatus/createdAt); ConfirmDialog delete gate (not browser confirm()); no-project EmptyState guard; onNavigate callback prop
- `DatasetDetail`: metadata card with dataset name in `h2.text-lg.font-medium`; Tabs for Records + Search; back button via `onNavigate(backHref ?? "/datasets")`
- `DatasetRecords`: DataTable of NormalizedRecord rows (id + createdAt); loading/error/empty three-branch
- `DatasetSearch`: form + discriminated-union result renderer — vectorize renders `<Progress value={score*100}>`; ai_search renders key+text+score; none renders title+snippet; indexingPending amber `<AlertTriangle>` notice; never `dangerouslySetInnerHTML` (T-04-02-T1)
- `datasets/index.ts`: surface barrel mirroring webhooks/index.ts pattern
- `src/index.ts`: Phase-4 dataset hooks + surfaces block appended after Phase-3 provider block

## Task Commits

1. **Task 1: use-datasets.ts hook factory** — `cc19ddb` (feat)
2. **Task 2: Dataset surface components + barrel** — `97b329b` (feat)

**Plan metadata:** this SUMMARY (docs)

## Files Created/Modified

**Created:**
- `packages/ui/src/components/datasets/dataset-detail.tsx`
- `packages/ui/src/components/datasets/dataset-records.tsx`
- `packages/ui/src/components/datasets/dataset-search.tsx`
- `packages/ui/src/components/datasets/index.ts`

**Modified (stubs overwritten or augmented):**
- `packages/ui/src/hooks/use-datasets.ts` — real implementation replacing 04-01 stub
- `packages/ui/src/components/datasets/dataset-list.tsx` — real implementation replacing 04-01 null stub
- `packages/ui/src/index.ts` — Phase-4 dataset block appended
- `packages/ui/__tests__/hooks/use-datasets.test.ts` — 2 it.todo promoted to live assertions

## Decisions Made

- **pageCount=-1 for useDataTable**: The `useDataTable` hook interface `Required<Pick<TableOptions<TData>, "pageCount">>` requires explicit pageCount. Passing -1 maps to "unknown page count" (same default as the hook internals use). Auto-fixed as Rule 1 (TS error blocking compilation).
- **DatasetListInner sub-component**: Early-return guards (no-project, loading, error, empty) are placed in `DatasetList`. The actual table rendering is delegated to `DatasetListInner` to keep hook/mutation call ordering stable across the conditional branches.
- **Pre-search EmptyState predicate**: `!hasSearched && !searchMutation.isPending` prevents the "Search this dataset" placeholder from flashing back after a failed search or empty result.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useDataTable requires explicit pageCount prop**
- **Found during:** Task 2 TypeScript check
- **Issue:** `useDataTable` interface extends `Required<Pick<TableOptions<TData>, "pageCount">>` — `pageCount` is a required prop. The initial calls to `useDataTable({ data, columns })` failed TS with "Property 'pageCount' is missing".
- **Fix:** Added `pageCount: -1` (the standard "no server page count" sentinel, same as the hook default) to all `useDataTable` calls in `dataset-list.tsx` and `dataset-records.tsx`.
- **Files modified:** `dataset-list.tsx`, `dataset-records.tsx`
- **Commit:** `97b329b`

---

**Total deviations:** 1 auto-fixed (1 TS type error)
**Impact:** No scope change; one-line fix per file.

## Verification Results

```
npx vitest run __tests__/hooks/use-datasets.test.ts
  Tests: 4 passed | 3 todo (7)

npx vitest run __tests__/components/datasets.test.tsx
  Tests: 5 todo — imports resolve cleanly

npx vitest run (full suite)
  Test Files: 24 passed | 2 skipped (26)
  Tests: 116 passed | 23 todo (139) — no new failures

npx tsc --noEmit -p tsconfig.json
  (clean — no output)

bash scripts/check-imports.sh
  PASS [CORE-01/04]: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src

bash scripts/check-directives.sh
  PASS: 67 'use client' file(s) in dist/ (expected >= 62)
```

## Known Stubs

None. All 04-01 stubs for datasets are fully implemented:
- `use-datasets.ts` — real hook factory (replaces throwing stubs)
- `dataset-list.tsx` — real DataTable component (replaces null stub)
- New files `dataset-detail.tsx`, `dataset-records.tsx`, `dataset-search.tsx` are fully implemented

## Threat Surface Scan

All T-04-02 threats addressed per plan:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-04-02-T1 | DatasetSearch renders result text as React text nodes (`<p>`, `<code>`, `<span>`) — never `dangerouslySetInnerHTML` |
| T-04-02-ID | `datasetKeys.all(orgSlug, projectSlug)` namespaces every cache entry; `enabled:!!projectSlug` guard in all hooks |
| T-04-02-E | ConfirmDialog gates delete intent in DatasetList; actual authorization is server-side |
| T-04-02-D | Records endpoint uses paginated QuerySchema (cursor-based) — `pageCount: -1` signals client-managed pagination |

No new security-relevant surfaces beyond those in the plan's threat model.

## Self-Check: PASSED

All created/modified files verified present on disk:
- `packages/ui/src/hooks/use-datasets.ts` ✓
- `packages/ui/src/components/datasets/dataset-list.tsx` ✓
- `packages/ui/src/components/datasets/dataset-detail.tsx` ✓
- `packages/ui/src/components/datasets/dataset-records.tsx` ✓
- `packages/ui/src/components/datasets/dataset-search.tsx` ✓
- `packages/ui/src/components/datasets/index.ts` ✓
- `packages/ui/src/index.ts` (dataset block appended) ✓

Both task commits verified in git history:
- `cc19ddb` (feat(04-02): implement use-datasets.ts hook factory) ✓
- `97b329b` (feat(04-02): datasets surface components + barrel registration) ✓

---
*Phase: 04-contract-gated-surfaces-monorepo-port*
*Completed: 2026-05-29*
