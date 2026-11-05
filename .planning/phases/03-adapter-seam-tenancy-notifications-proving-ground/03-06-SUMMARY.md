---
phase: 03
plan: "06"
subsystem: packages/ui
tags: [gate, barrel-audit, tsc-clean, vitest, check-directives, check-imports, react-day-picker, recharts]
dependency_graph:
  requires: [03-03, 03-05]
  provides: []
  affects:
    - packages/ui/src/index.ts
    - packages/ui/scripts/check-directives.sh
    - packages/ui/package.json
    - packages/ui/pnpm-lock.yaml
    - packages/ui/src/components/ui/chart.tsx
    - packages/ui/src/components/data-grid/data-grid-cell-variants.tsx
    - packages/ui/src/hooks/use-data-table.ts
tech_stack:
  added:
    - react-day-picker upgraded from 8.10.2 to 9.14.0 (peerDep updated from ^8.0.0 to ^9.0.0)
  patterns:
    - "Gate plan: barrel audit + threshold update + vitest + tsc + check-imports + check-directives"
    - "Pre-existing Phase 2 type errors fixed as part of gate (rule: fix errors when found)"
    - "TooltipValueType defined locally in chart.tsx (recharts 2.x no longer re-exports from index)"
    - "UUID template literal mismatch fixed via Set<string> annotation"
    - "Interface conflict resolved by omitting conflicting onStateChange from TableOptions Omit"
key_files:
  created: []
  modified:
    - packages/ui/scripts/check-directives.sh
    - packages/ui/package.json
    - packages/ui/pnpm-lock.yaml
    - packages/ui/src/components/ui/chart.tsx
    - packages/ui/src/components/data-grid/data-grid-cell-variants.tsx
    - packages/ui/src/hooks/use-data-table.ts
decisions:
  - "react-day-picker upgraded to ^9.0.0 to align with calendar.tsx v9 API (ported from Helm which uses ^10); v8 was the wrong declared peerDep for the ported component source"
  - "TooltipValueType not exported from recharts 2.x index — defined locally as number|string|Array<number|string> matching recharts DefaultTooltipContent internal type"
  - "check-directives.sh EXPECTED updated from 50 to 62 (12 new 'use client' files added in Phase 3)"
metrics:
  duration: 20 min
  completed: "2026-05-29"
  tasks: 2
  files: 6
---

# Phase 3 Plan 06: Final Integration Gate Summary

Phase gate verification for all 8 requirements (DATA-01..06, NOTIF-01/02). Barrel audit confirmed complete; check-directives.sh threshold updated to 62; all 4 gate commands pass.

## What Was Built

**Task 1 — Barrel audit + check-directives.sh threshold update**

Barrel audit of `packages/ui/src/index.ts` against the full Phase-3 expected export list:

- All Phase-3 symbols already present from Plans 02-05 (FarsightProvider, useTenant, useApiClient, createApiClient, ApiClientError, ApiClientSchemaError, FarsightError, FarsightSchemaError, toFarsightError, isFarsightError, matchCode, all notification hooks/surfaces, all webhook hooks/surfaces/modals, EventTypesInput)
- No missing exports found — barrel was complete after Plan 05
- `check-directives.sh` threshold updated: EXPECTED 50 → 62 (Phase 3 adds 12 'use client' files: provider, notification-bell, notification-inbox, notification-item, notification-preferences, webhook-list, webhook-endpoint-row, webhook-secret-reveal, webhook-create-modal, webhook-rotate-secret-modal, event-types-input, use-notifications, use-webhooks, use-notification-preferences, farsight-error, create-client)

Actual file count verified via:
```
grep -rl '"use client"' packages/ui/src/ --include="*.tsx" --include="*.ts" | wc -l
# = 64 source files; dist/ after build = 62 (some hooks bundled together)
```

**Task 2 — Full gate verification + pre-existing type fixes**

GATE 1 (vitest): 20 test files, 71 tests passing, 23 todos (unchanged from Phase 3 start)
GATE 2 (tsc): Initially failed with pre-existing Phase 2 errors; all fixed (see Deviations)
GATE 3 (DATA-06 type-chain): `tsc --noEmit` passes — contract→hook→prop type chain intact with no `any` escapes in Phase 3 files
GATE 4 (import guards): Both scripts pass

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| Tests | `cd packages/ui && npx vitest run` | PASS — 20 files, 71 tests, 23 todos |
| TypeScript | `cd packages/ui && npx tsc --noEmit -p tsconfig.json` | PASS (EXIT 0) |
| Import guard | `bash packages/ui/scripts/check-imports.sh` | PASS |
| Directive guard | `bash packages/ui/scripts/check-directives.sh` | PASS (62 >= 62) |
| DATA-05 cache-bleed | `npx vitest run __tests__/integration/multi-org-cache.test.tsx` | PASS — 2 tests |
| DATA-04 error codes | `npx vitest run __tests__/errors/farsight-error.test.ts` | PASS — 5 tests |
| NOTIF-02 secret-shown-once | `npx vitest run __tests__/components/webhook-secret-reveal.test.tsx` | PASS — 1 test + 3 todos |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] chart.tsx: TooltipValueType not exported from recharts 2.x**
- **Found during:** Task 2 — first `tsc --noEmit` run
- **Issue:** `import type { TooltipValueType } from "recharts"` fails — recharts 2.15.4 exports `DefaultTooltipContentProps` but not `TooltipValueType` from its index
- **Fix:** Removed the import; defined `type TooltipValueType = number | string | Array<number | string>` locally (matches recharts' internal `ValueType` definition)
- **Files modified:** `packages/ui/src/components/ui/chart.tsx`
- **Commit:** 80978f8

**2. [Rule 1 - Bug] data-grid-cell-variants.tsx: UUID template literal Set type mismatch**
- **Found during:** Task 2 — first `tsc --noEmit` run
- **Issue:** `new Set(tempFiles.map((f) => f.id))` infers `Set<ReturnType<typeof crypto.randomUUID>>` = `Set<\`${string}-${string}-${string}-${string}-${string}\`>`; calling `.has(f.id)` where `f.id: string` fails the stricter template type check
- **Fix:** Annotated `new Set<string>(...)` to widen the set type
- **Files modified:** `packages/ui/src/components/data-grid/data-grid-cell-variants.tsx`
- **Commit:** 80978f8

**3. [Rule 1 - Bug] use-data-table.ts: onStateChange interface conflict**
- **Found during:** Task 2 — first `tsc --noEmit` run
- **Issue:** `UseDataTableProps` extends both `Omit<TableOptions<TData>, ...>` and `DataTableStateProps`; `TableOptions.onStateChange` expects `Updater<TableState>` (full TanStack table state), `DataTableStateProps.onStateChange` expects `(state: DataTableState) => void`; TS2320 simultaneous-extend conflict
- **Fix:** Added `"onStateChange"` to the Omit list so the custom `DataTableStateProps.onStateChange` signature is the sole provider
- **Files modified:** `packages/ui/src/hooks/use-data-table.ts`
- **Commit:** 80978f8

**4. [Rule 1 - Bug] calendar.tsx: react-day-picker v9 API with v8 installed (pre-existing version mismatch)**
- **Found during:** Task 2 — first `tsc --noEmit` run (9 errors: getDefaultClassNames, DayButton, captionLayout, formatMonthDropdown, button_previous, Root component, WeekNumber children prop)
- **Issue:** `packages/ui/package.json` declared peerDependency `"react-day-picker": "^8.0.0"` but `calendar.tsx` was ported from Helm which uses react-day-picker v9/v10 APIs. v8.10.2 was installed via pnpm
- **Fix:** Upgraded react-day-picker to 9.14.0 via `pnpm add react-day-picker@^9.0.0 -w`; updated peerDependency range to `"^9.0.0"` in package.json
- **Files modified:** `packages/ui/package.json`, `packages/ui/pnpm-lock.yaml`
- **Commit:** 80978f8 (lock), 670c24c (peerDep)

## Known Stubs

None — all Phase-3 implementations are real (Plans 02-05 replaced all stubs).

## Threat Flags

None — T-03-19 (star exports) and T-03-20 (missing 'use client') both mitigated:
- T-03-19: All exports in src/index.ts use named form `export { X } from '...'`; no `export *` present
- T-03-20: check-directives.sh passes at 62 >= 62; every Phase-3 file has directive as first line

## Self-Check: PASSED

Files verified:
- packages/ui/scripts/check-directives.sh ✓ (EXPECTED=62, passes with 62 in dist/)
- packages/ui/package.json ✓ (react-day-picker peerDep = ^9.0.0)
- packages/ui/src/components/ui/chart.tsx ✓ (no TooltipValueType import, local type defined)
- packages/ui/src/components/data-grid/data-grid-cell-variants.tsx ✓ (Set<string> annotation)
- packages/ui/src/hooks/use-data-table.ts ✓ (onStateChange omitted from TableOptions)

Commits verified:
- b7cd329 (chore(03-06): update check-directives.sh threshold to 62 for Phase 3) ✓
- 80978f8 (fix(03-06): resolve pre-existing tsc errors to achieve clean Phase 3 gate) ✓
- 670c24c (chore(03-06): update react-day-picker peerDependency to ^9.0.0) ✓
