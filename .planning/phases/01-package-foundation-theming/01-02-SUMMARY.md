---
phase: "01"
plan: "02"
subsystem: packages/ui
tags: [theming, css-tokens, tailwind-v4, design-system]
dependency_graph:
  requires: ["01-01"]
  provides: ["theme.css token contract", "tokens.ts JS refs", "consumer README"]
  affects: ["packages/ui consumers", "Phase 2 component styling", "Phase 3 adapter surfaces"]
tech_stack:
  added: []
  patterns: ["Tailwind v4 @theme inline + @source pattern", "@custom-variant dark", "CSS custom property JS refs via var()"]
key_files:
  created:
    - packages/ui/src/lib/tokens.ts
    - packages/ui/README.md
  modified:
    - packages/ui/src/styles/theme.css
    - packages/ui/src/index.ts
decisions:
  - "theme.css comments must not contain @import \"tailwindcss\" literally — grep CI check matches inside comments; rewrote comment text to describe the import without using the directive string"
  - "tokens.chart uses var(--color-chart-N) not var(--chart-N) — @theme inline maps --color-chart-N → var(--chart-N), so --color-* names are the canonical Tailwind utility names"
  - "Declaration order @theme inline before :root is intentional for Tailwind v4 — utility classes must register before their CSS custom property values are defined"
metrics:
  duration: "3m 31s"
  completed_date: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
requirements_addressed: [THEME-01, THEME-02, THEME-03]
---

# Phase 01 Plan 02: CSS Token Contract and Consumer README Summary

**One-liner:** Tailwind v4 token contract (`:root`, `.dark`, `@theme inline`) lifted verbatim from `app/globals.css` into `packages/ui/src/styles/theme.css` with `@source` and `@custom-variant dark`; `tokens.ts` exposes type-safe `var(--color-chart-N)` references for charts.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Lift token contract to theme.css and create tokens.ts | efb7941 | `src/styles/theme.css`, `src/lib/tokens.ts`, `src/index.ts` |
| 2 | Consumer setup README (THEME-02) | aa9fa30 | `packages/ui/README.md` |

---

## What Was Built

### Task 1: theme.css + tokens.ts (THEME-01, THEME-03)

`packages/ui/src/styles/theme.css` is the semantic token contract for all components. It contains:

1. `@custom-variant dark (&:is(.dark *))` — activates dark tokens when any ancestor has `.dark`
2. `@source "../../src"` — directs Tailwind to scan the package's own source for utility class usage (path relative to `src/styles/theme.css` resolves to `packages/ui/src`)
3. `@theme inline { ... }` — 60-line block mapping `--color-*` / `--radius-*` / `--shadow-*` / font / tracking / spacing tokens to Tailwind utility classes (must precede `:root` in Tailwind v4)
4. `:root { ... }` — 48-line block with all light-mode OKLCH token values
5. `.dark { ... }` — 47-line block with all dark-mode OKLCH token values

**Critical constraint honored:** No `@import "tailwindcss"` anywhere in the file. Consumer CSS must own that line.

`packages/ui/src/lib/tokens.ts` exports `tokens` as a const object with:
- `tokens.chart`: 5-element array of `'var(--color-chart-N)'` strings (index 0 = chart-1)
- `tokens.color`: semantic keys (`background`, `foreground`, `primary`, `muted`, `mutedFg`, `destructive`, `border`) mapped to `'var(--color-*)'` strings

All values are static string literals — SSR-safe, no DOM access required.

`packages/ui/src/index.ts` re-exports `tokens`, `TokenChart`, and `TokenColor`.

### Task 2: Consumer README (THEME-02)

`packages/ui/README.md` documents:
- Installation with all 5 peers (2 required: `react`, `react-dom`; 3 optional: `@clerk/react`, `@xyflow/react`, `@tanstack/react-query`)
- CSS import order: `@import "tailwindcss"` then `@import "@farsight/ui/theme.css"` in consumer CSS
- `@source` explanation: already in `theme.css`, consumers need not add a separate one
- Dark mode contract: library owns token values, app shell owns `.dark` class toggle
- xyflow CSS import order: must come after `@import "tailwindcss"` or edge styles are invisible
- `tokens.chart[N]` usage for Recharts `stroke`/`fill` props vs. hardcoded hex

---

## Verification Results

| Check | Result |
|-------|--------|
| No `@import "tailwindcss"` in theme.css | PASS |
| `@custom-variant dark` present | PASS |
| `@source` directive present | PASS |
| `.dark` block present | PASS |
| `@theme inline` present | PASS |
| Section count (expect >= 5) | PASS (8 matches) |
| `tokens.chart[0] === 'var(--color-chart-1)'` | PASS |
| `tokens.chart.length === 5` | PASS |
| `tokens.color.mutedFg === 'var(--color-muted-foreground)'` | PASS |
| README has `@source`, `xyflow`, `@clerk/react` | PASS |
| `npm run build` exits 0 | PASS (716ms, 10 files) |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment text contained literal `@import "tailwindcss"` which tripped the CI grep check**

- **Found during:** Task 1 verification
- **Issue:** The file header comment included the exact string `@import "tailwindcss"` to show consumer setup. The verification `grep -q '@import "tailwindcss"'` matches inside CSS comments, causing a false positive failure.
- **Fix:** Rewrote the comment to describe the import directive without including the literal string. The `@import "tailwindcss"` text now only appears in `README.md` (inside fenced code blocks), not in `theme.css` at all.
- **Files modified:** `packages/ui/src/styles/theme.css` (comment block only)
- **Commit:** efb7941

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Comment text must not include `@import "tailwindcss"` literally | grep-based CI check matches inside CSS comments; rewrote comment to use prose description instead |
| `var(--color-chart-N)` not `var(--chart-N)` in tokens.ts | `@theme inline` maps `--color-chart-N → var(--chart-N)`; the `--color-*` names are the Tailwind utility names and are always defined after `theme.css` is imported |
| `@theme inline` declared before `:root` | Tailwind v4 requirement: utility class registrations must precede the custom property values they reference |

---

## Known Stubs

None — all token values are populated verbatim from `app/globals.css`. No placeholder text or hardcoded empty values.

---

## Threat Flags

None — this plan creates CSS token files and documentation only. No new network endpoints, auth paths, or trust boundaries introduced.

---

## Self-Check: PASSED

- `packages/ui/src/styles/theme.css` — exists, PASSED grep checks
- `packages/ui/src/lib/tokens.ts` — exists, PASSED tsx runtime check
- `packages/ui/README.md` — exists, PASSED content checks
- `packages/ui/src/index.ts` — modified, tokens re-exported
- Commit `efb7941` — verified in git log
- Commit `aa9fa30` — verified in git log
