---
phase: 02-headless-core-port
verified: 2026-05-29T06:45:00Z
status: human_needed
score: 4/5
overrides_applied: 0
human_verification:
  - test: "Verify visible focus rings render correctly in a browser"
    expected: "Tab through interactive components (Button, Dialog trigger, DataGrid toolbar, DataTable pagination controls) — a visible focus ring renders on each focused element"
    why_human: "CSS-dependent visual property; axe + eslint-plugin-jsx-a11y cannot detect styling; VALIDATION.md documents this as a deliberate manual check deferred to Chromatic"
  - test: "Full keyboard operability for DataGrid toolbar and DataTable pagination"
    expected: "Tab / Enter / Space / Arrow navigate all toolbar and pagination controls; no keyboard trap exists"
    why_human: "axe checks aria roles/attributes only; full traversal sequence requires human interaction"
  - test: "Toaster light/dark theme sync via next-themes"
    expected: "With a ThemeProvider mounted and theme toggled, Sonner toasts switch theme. With no ThemeProvider, toast defaults to theme='system' (no crash)"
    why_human: "Requires a mounted ThemeProvider in a real browser environment; purely visual + runtime behavior"
---

# Phase 02: Headless Core Port — Verification Report

**Phase Goal:** `apps/web` can render the full design system — primitives, page primitives, and DataGrid/DataTable — decoupled from Next.js/Clerk-server, with loading/error/empty and accessibility as first-class conventions rather than per-screen afterthoughts.
**Verified:** 2026-05-29T06:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CI import-guard proves zero `next/*` and zero `@clerk/nextjs/server` across in-scope components | VERIFIED | `bash packages/ui/scripts/check-imports.sh` exits 0: "PASS [CORE-01/04]: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src" |
| 2 | `apps/web` can import and render all 34 shadcn `ui/` primitives + PageHeader, EmptyState, ConfirmDialog, Toaster, with `@/` paths rewritten to package-local | VERIFIED | All 34 Helm ui/ primitives present in packages/ui/src/components/ui/; all exported from src/index.ts; all built into dist/; zero `@/` aliases remain in any ported file; 38 tests pass including smoke tests for both server-safe and client components |
| 3 | DataGrid/DataTable (including use-data-grid.ts) render outside Next.js with characterization tests passing (ported, not rewritten) | VERIFIED | Zero nuqs in use-data-grid.ts and use-data-table.ts; characterization tests pass for both DataGrid default state and DataTable internal-default + controlled-override modes; 38 tests pass (7 files) |
| 4 | No `alert()` or `confirm()` in ported components; destructive uses ConfirmDialog; transient uses Sonner toast; standardized loading/error/empty states | VERIFIED | check-imports.sh Rule 3 exits 0; ConfirmDialog ported; Toaster created (Sonner wrapper); ErrorState created (purely presentational, zero HTTP/RFC-7807); three layout skeletons with Array.from SSR-safe pattern; CONVENTIONS.md documents the four-branch pattern and alert/confirm prohibition |
| 5 | Visible focus rings, keyboard-operable, aria-label on icon-only buttons | UNCERTAIN | Automated gates pass: vitest-axe axe tests green (button.a11y, page-primitives.a11y, data-grid.a11y), eslint-plugin-jsx-a11y exits 0 (3 warnings, 0 errors). However: VALIDATION.md explicitly defers focus-ring visibility and full keyboard traversal to manual human verification — these are visual/behavioral properties not detectable by axe or lint. Additionally, 3 eslint warnings exist on data-table filter components (role="button" divs with onClick but no onKeyDown), which are real a11y gaps though not CI-blocking. |

**Score:** 4/5 truths fully verified; Truth 5 partially automated with human confirmation required

### Deferred Items

None — all items are within Phase 2 scope.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/scripts/check-imports.sh` | 3-rule CI guard (no next/*, no @clerk/nextjs/server, no alert()/confirm()) | VERIFIED | Exists, executable, exits 0; both single and double-quote variants caught (WR-01 fix applied); next-themes correctly passes |
| `packages/ui/vitest.config.ts` | jsdom env + setupFiles + coverage | VERIFIED | environment: jsdom, globals: true, setupFiles: ['./vitest.setup.ts'], WR-03 fix applied (@ alias now resolves to package root matching tsconfig) |
| `packages/ui/vitest.setup.ts` | @testing-library/jest-dom + vitest-axe matchers | VERIFIED | Uses `import * as vitestAxeMatchers from 'vitest-axe/matchers'` + `expect.extend(vitestAxeMatchers)` (functionally equivalent to extend-expect import); no next/* mocks, no DB stubs |
| `packages/ui/eslint.config.mjs` | jsx-a11y rules active | VERIFIED | aria-proptypes (error), aria-role (error), interactive-supports-focus (warn), click-events-have-key-events (warn), no-static-element-interactions (warn) |
| `packages/ui/src/components/ui/` | All 34 shadcn primitives | VERIFIED | 34 files present (matches Helm source exactly; accordion is not in Helm source either); zero @/ aliases; 26 components carry 'use client'; 8 server-safe files correctly omit it |
| `packages/ui/src/components/page/` | 9 component files + CONVENTIONS.md | VERIFIED | card-grid-skeleton.tsx, confirm-dialog.tsx, CONVENTIONS.md, detail-skeleton.tsx, empty-state.tsx, error-state.tsx, index.ts, list-skeleton.tsx, page-header.tsx, toaster.tsx (10 files total) |
| `packages/ui/src/components/data-grid/` | 17 DataGrid component files | VERIFIED | 17 files present; zero @/ aliases; matches Helm source exactly |
| `packages/ui/src/hooks/use-data-grid.ts` | Framework-clean DataGrid hook | VERIFIED | Zero nuqs; zero next/* imports; @/ aliases rewritten |
| `packages/ui/src/hooks/use-data-table.ts` | Nuqs-seamed DataTable hook | VERIFIED | Zero nuqs; DataTableState + DataTableStateProps exported; state?/onStateChange? seam implemented; controlled state override confirmed via characterization test |
| `packages/ui/src/components/data-table/` | 9 DataTable component files | VERIFIED | 9 files present; zero @/ aliases; zero nuqs |
| `packages/ui/src/index.ts` | Single entry exporting all Phase 2 symbols | VERIFIED | CR-01/CR-02 fix applied; all page primitives, DataGrid surface, DataTable surface, and all 34 ui/ primitives exported; 336 dist files produced |
| `packages/ui/src/components/page/CONVENTIONS.md` | Loading/error/empty + alert/confirm convention docs | VERIFIED | isLoading, ErrorState, EmptyState, ConfirmDialog all referenced; explicit alert() prohibition stated; D-04 four-branch pattern documented; D-08 destructive/transient rule documented |
| `packages/ui/__tests__/characterization/data-grid.char.test.tsx` | DataGrid characterization tests with getBoundingClientRect mock | VERIFIED | getBoundingClientRect mocked; at least 4 tests pinning initial hook state (sorting=[], rowSelection={}, etc.) |
| `packages/ui/__tests__/characterization/data-table.char.test.tsx` | DataTable characterization for internal-default + controlled modes | VERIFIED | Test 1 (internal default: pageIndex=0, sorting=[]); Test 3 (controlled: pageIndex=2); Test 4 (onStateChange called); all 5 tests pass |
| `packages/ui/__tests__/a11y/` | vitest-axe axe tests | VERIFIED | button.a11y.test.tsx, page-primitives.a11y.test.tsx, data-grid.a11y.test.tsx present; all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| check-imports.sh | packages/ui/src | `grep -rn "from ['\"]next/"` (both quote styles) | VERIFIED | WR-01 fix: both single and double-quoted imports caught; next-themes passes (no trailing slash) |
| src/index.ts | page primitives | named re-exports | VERIFIED | CR-01 fix confirmed: PageHeader, EmptyState, ConfirmDialog, ErrorState, Toaster, CardGridSkeleton, ListSkeleton, DetailSkeleton all exported |
| src/index.ts | DataGrid/DataTable surfaces | named re-exports | VERIFIED | CR-02 fix confirmed: DataGrid, DataTable, useDataTable, DataTableState, DataTableStateProps, useDataGrid all exported |
| toaster.tsx | next-themes | `import { useTheme } from "next-themes"` | VERIFIED | Import present; `const { theme = "system" } = useTheme()` graceful default confirmed; next-themes in peerDependencies + peerDependenciesMeta optional:true; NOT in dependencies |
| error-state.tsx | ui/button.tsx | `import { Button } from "../ui/button"` | VERIFIED | onRetry prop renders Button; zero HTTP/RFC-7807 references |
| skeletons | ui/skeleton.tsx | `import { Skeleton } from "../ui/skeleton"` | VERIFIED | Array.from pattern confirmed in card-grid-skeleton and list-skeleton |
| use-data-table.ts | @tanstack/react-table | `import from '@tanstack/react-table'` | VERIFIED | Exists in packages/ui package.json dependencies + neverBundle |
| use-data-grid.ts | @tanstack/react-virtual | `import { useVirtualizer }` | VERIFIED | @tanstack/react-virtual in dependencies + neverBundle |

### Data-Flow Trace (Level 4)

Not applicable — Phase 2 components are presentational primitives with no data sources. Data wiring is deferred to Phase 3 (adapter seam).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CI import guard passes | `bash packages/ui/scripts/check-imports.sh` | Exit 0: PASS [CORE-01/04] | PASS |
| CI directive guard passes | `bash packages/ui/scripts/check-directives.sh` | Exit 0: PASS 50 'use client' files (expected >= 50) | PASS |
| Full test suite (38 tests, 7 files) | `npm test --prefix packages/ui` | Exit 0: 7 passed, 38 passed | PASS |
| Build produces 336 dist files | `npm run build --prefix packages/ui` | Exit 0: Build complete in ~1.5s | PASS |
| Lint exits 0 (jsx-a11y active) | `npm run lint --prefix packages/ui` | Exit 0: 3 warnings (inherited from Helm), 0 errors | PASS |
| next-themes passes import guard | Pattern test | `from 'next-themes'` does NOT match `from ['\"]next/` | PASS |
| zero @/ aliases in ported dirs | grep check | 0 matches in ui/, page/, data-grid/, data-table/, hooks/ | PASS |
| zero nuqs in use-data-table.ts | grep check | 0 matches | PASS |
| DataTableState exported | grep check | `export type DataTableState` present | PASS |
| ErrorState has no HTTP refs | grep check | 0 matches for ApiErrorEnvelope/RFC-7807/HttpError | PASS |
| Array.from in skeletons | grep check | Present in card-grid-skeleton and list-skeleton | PASS |
| D-11 transition note | grep STATE.md | D-11 note present with "READ-ONLY" and "does not own" | PASS |

### Probe Execution

No probes declared in PLAN files. CI scripts confirmed above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CORE-01 | Plans 01, 02, 03, 04, 05 | Zero next/* and @clerk/nextjs/server in packages/ui/src, CI-enforced | SATISFIED | check-imports.sh exits 0; 3-rule guard with both quote styles |
| CORE-02 | Plans 02, 03 | 34 ui/ primitives + page primitives ported with @/ paths rewritten | SATISFIED | 34 files in ui/; 9 in page/ (+ CONVENTIONS.md); zero @/ aliases; all exported from src/index.ts |
| CORE-03 | Plans 04, 05 | DataGrid/DataTable ported with characterization tests | SATISFIED | 17 data-grid + 9 data-table files; use-data-grid (zero nuqs); use-data-table (nuqs seam replaced); 5 DataGrid + 5 DataTable characterization tests pass |
| CORE-04 | Plans 03, 05 | Loading/error/empty standardized; alert()/confirm() replaced | SATISFIED | ErrorState (presentational, no HTTP), 3 skeletons (Array.from SSR-safe), Toaster (Sonner wrapper), ConfirmDialog ported; check-imports.sh Rule 3 exits 0; CONVENTIONS.md documents both patterns |
| CORE-05 | Plans 01, 03, 05 | A11y baseline — focus rings, keyboard operability, aria-label on icon-only buttons | PARTIAL | Automated: vitest-axe axe tests green, eslint-plugin-jsx-a11y exits 0 (3 warnings on inherited Helm patterns); Human: focus-ring visibility and keyboard traversal require browser testing (per VALIDATION.md) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/ui/src/components/data-grid/variant-menu.tsx` | 88 | `// TODO: persist options to column meta` | WARNING | No issue/PR reference; TODO is unresolved debt marker. Ported verbatim from Helm source. Not a CI blocker (exit 0 on lint/test) but untracked |
| `packages/ui/src/components/ui/chart.tsx` | 95 | `dangerouslySetInnerHTML` | INFO | Ported verbatim from Helm source (confirmed: same line in components/ui/chart.tsx). Used to inject CSS custom property styles for chart theming — an established shadcn chart pattern, not a XSS risk (server-generated CSS from config object). Not introduced by porting |
| `packages/ui/src/components/data-table/data-table-date-filter.tsx` | 184 | `role="button"` div with onClick but no onKeyDown | WARNING | 3 similar instances across data-table filters; eslint warns but does not error. Inherited from Helm source. Real keyboard operability gap for these specific elements |

**Debt marker assessment:** The TODO in variant-menu.tsx has no issue/PR tracking reference. Per debt-marker gate rules, this is an untracked marker. However, because (a) it was ported verbatim from Helm source and not introduced by Phase 2, (b) variant-menu.tsx is an internal DataGrid sub-component not part of Phase 2's surface contract, and (c) all gates exit 0, this is classified as WARNING rather than BLOCKER. The developer should decide whether to track this TODO formally.

### Human Verification Required

### 1. Visible Focus Rings on Interactive Components

**Test:** Tab through Button, Dialog trigger/close, DataTable pagination buttons, DataGrid toolbar actions in a real browser
**Expected:** Each focused element shows a visually distinct focus ring (outline or box-shadow); no element loses focus styling entirely when focused via keyboard
**Why human:** CSS-dependent visual property; vitest-axe detects role/aria issues not styling; VALIDATION.md explicitly defers this to Chromatic automation (TOOL-02, out of scope for Phase 2)

### 2. Full Keyboard Operability for DataGrid Toolbar and DataTable Pagination

**Test:** With a mounted DataGrid and DataTable, navigate all toolbar controls (column selector, sort menu, filter menu, search) and all pagination controls using only keyboard (Tab, Enter, Space, Arrow keys)
**Expected:** All interactive controls are reachable and activatable via keyboard with no keyboard traps; the 3 eslint warnings about missing onKeyDown handlers in data-table filters may surface as actual keyboard gaps
**Why human:** axe checks aria attributes only, not full traversal sequences; the 3 warnings (data-table-date-filter, data-table-faceted-filter, data-table-slider-filter) have onClick without onKeyDown on role="button" divs

### 3. Toaster Theme Sync via next-themes

**Test:** In a consumer that mounts `<ThemeProvider>` (from next-themes) alongside the Toaster, toggle light/dark. Then test without ThemeProvider mounted.
**Expected:** Toasts switch between Sonner's light and dark themes in sync with the active theme. Without ThemeProvider, Toaster degrades gracefully to `theme="system"` with no crash or console error
**Why human:** Requires runtime browser rendering with ThemeProvider; visual confirmation of theme switching

### Gaps Summary

No gaps block the primary deliverables. All automated gates pass (check-imports.sh, check-directives.sh, full test suite, build). The one partial truth (SC-5: a11y) is by design — VALIDATION.md explicitly documents that focus-ring visibility and keyboard traversal are deferred to human/Chromatic verification. The 3 eslint warnings are inherited from Helm source and not blocking.

The only actionable finding for the developer is the untracked TODO in variant-menu.tsx.

---

_Verified: 2026-05-29T06:45:00Z_
_Verifier: Claude (gsd-verifier)_
