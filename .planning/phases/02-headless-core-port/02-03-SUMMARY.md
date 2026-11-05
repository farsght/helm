---
phase: 02-headless-core-port
plan: "03"
subsystem: packages/ui/src/components/page
tags: [page-primitives, error-state, toaster, skeletons, conventions, tdd]
dependency_graph:
  requires: ["02-02"]
  provides: ["page-primitives surface", "loading/error/empty convention", "D-11 transition note"]
  affects: ["packages/ui build", "check-imports.sh", "tsdown.config.ts"]
tech_stack:
  added: ["next-themes (optional peer — already classified)", "sonner (neverBundle added)"]
  patterns: ["Array.from SSR-safe repetition", "optional peer graceful degradation", "TDD RED/GREEN"]
key_files:
  created:
    - packages/ui/src/components/page/page-header.tsx
    - packages/ui/src/components/page/empty-state.tsx
    - packages/ui/src/components/page/confirm-dialog.tsx
    - packages/ui/src/components/page/error-state.tsx
    - packages/ui/src/components/page/toaster.tsx
    - packages/ui/src/components/page/card-grid-skeleton.tsx
    - packages/ui/src/components/page/list-skeleton.tsx
    - packages/ui/src/components/page/detail-skeleton.tsx
    - packages/ui/src/components/page/index.ts
    - packages/ui/src/components/page/CONVENTIONS.md
    - packages/ui/__tests__/smoke/page-primitives.smoke.test.tsx
    - packages/ui/__tests__/a11y/page-primitives.a11y.test.tsx
  modified:
    - packages/ui/tsdown.config.ts
    - .planning/STATE.md
decisions:
  - "D-02 enforced: ErrorState is purely presentational — zero HTTP/RFC-7807 references"
  - "D-03 delivered: CardGridSkeleton, ListSkeleton, DetailSkeleton as named primitives"
  - "D-08/D-10: Toaster uses useTheme() = 'system' default; next-themes confirmed optional peer"
  - "D-13 enforced: all skeletons/ErrorState re-implemented from MIT Skeleton only"
  - "next-themes added to tsdown neverBundle (was already optional peer, not in dependencies)"
metrics:
  duration: "~12 min"
  completed_date: "2026-05-29"
  tasks: 3
  files_created: 12
  files_modified: 2
---

# Phase 2 Plan 03: Page Primitives + Skeletons + Conventions Summary

**One-liner:** Page primitive surface (8 components + barrel) shipped with MIT-only skeleton trio (D-03), purely presentational ErrorState (D-02), optional-peer Toaster with next-themes graceful degradation (D-10), four-branch call-site convention doc (D-04/D-08), and D-11 transition note.

## What Was Built

### Task 1 — Port + Create primitives (commit `1ed69e0`)

Three Helm page primitives ported with `@/` alias rewrite:
- `page-header.tsx`: `title`, `description`, `actions` props; `actions`-prop layout preserved (CLAUDE.md)
- `empty-state.tsx`: server-safe, icon prop via `LucideIcon` type-only import
- `confirm-dialog.tsx`: `'use client'`, AlertDialog-based, `destructive` variant via buttonVariants

Two new components created from scratch:
- `error-state.tsx`: purely presentational (D-02) — props `title?`, `description?`, `icon?`, `onRetry?`, `action?`; no HTTP/RFC-7807 shape; `import type { LucideIcon }` RSC-safe
- `toaster.tsx`: `"use client"`, `useTheme()` with `= "system"` default (degrades without ThemeProvider), wraps Sonner with CSS-var toast classNames

`tsdown.config.ts`: added `next-themes` to `neverBundle` (next-themes already correctly in peerDependencies optional — no package.json changes needed).

### Task 2 — Layout skeletons + barrel + tests (TDD, commits `b2f4946` RED + `d8e71f8` GREEN)

Three new layout skeletons, all MIT-only, all SSR-safe:
- `card-grid-skeleton.tsx`: `count?=6`, `columns?=2` (COLS lookup), `TITLE_WIDTHS`/`BODY_WIDTHS` variation, `Array.from` repetition
- `list-skeleton.tsx`: `count?=5`, avatar-circle + title/subtitle line rows, `Array.from` repetition
- `detail-skeleton.tsx`: header block (title + subtitle) + body/sidebar layout

`index.ts` barrel: re-exports all 8 page primitives including `ErrorStateProps` type.

Tests: 9 smoke tests (render + behavior) + 2 axe a11y tests. All 21 tests (including prior waves) pass.

### Task 3 — CONVENTIONS.md + D-11 note (commit `3048acb`)

`CONVENTIONS.md`: documents both call-site conventions per D-04 and D-08:
- Section 1: four-branch `isLoading → skeleton / error → ErrorState / empty → EmptyState / else` pattern with code example and prop table
- Section 2: destructive → ConfirmDialog / transient → toast / never alert()/confirm() rule with code examples and prohibition statement

`STATE.md`: D-11 transition note appended — clarifies that Toaster's read-only next-themes peer does not violate the "library owning theme toggle + persistence" out-of-scope line.

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm --filter @farsight/ui test` | PASS — 21/21 tests |
| `pnpm --filter @farsight/ui build` | PASS — 162 files |
| `bash packages/ui/scripts/check-imports.sh` | PASS — no next/*, @clerk/*, alert(), confirm() |
| `grep -c 'ApiErrorEnvelope...' error-state.tsx` | 0 (clean) |
| `next-themes` in peerDependencies + optional | true / true |
| `Array.from` in card-grid-skeleton.tsx | present |
| `Array.from` in list-skeleton.tsx | present |
| No `@/` aliases in page/ | confirmed |
| D-11 in STATE.md | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] next-themes already correctly classified**
- **Found during:** Task 1
- **Issue:** Plan task specified "Remove next-themes from dependencies" but next-themes was already in peerDependencies + peerDependenciesMeta optional (not in dependencies) — a prior session had already done the classification
- **Fix:** Skipped the package.json edit (no change needed); added next-themes to neverBundle in tsdown.config.ts (was missing there)
- **Files modified:** packages/ui/tsdown.config.ts
- **Commit:** 1ed69e0

**2. [Rule 2 - Missing] sonner already in peerDependencies**
- **Found during:** Task 1
- **Issue:** Plan mentioned verifying sonner placement — sonner was already in peerDependencies optional (correct), already in neverBundle (correct)
- **Fix:** No change needed
- **Impact:** None

## TDD Gate Compliance

Task 2 followed RED/GREEN cycle:
- RED commit `b2f4946` — failing tests (skeleton files absent, import resolution fails)
- GREEN commit `d8e71f8` — implementation; all 21 tests pass

## Known Stubs

None. All 8 page primitives are fully implemented with working props and no placeholder data.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. New components are purely presentational.

| Flag | File | Description |
|------|------|-------------|
| (none) | — | No new threat surface beyond plan scope |
