---
phase: "01"
plan: "01"
subsystem: packages/ui
tags: [packaging, build-tooling, tsdown, peer-deps, cn-utility]
dependency_graph:
  requires: []
  provides:
    - packages/ui package scaffold with buildable tsdown config
    - cn() utility available at @farsight/ui/lib/utils
    - peer dependency contract (5 peers including @clerk/react)
    - CSS subpath export stubs (theme.css, globals.css)
  affects:
    - All subsequent Phase 1 plans (02 theming, 03 primitives) depend on this scaffold
tech_stack:
  added:
    - tsdown@0.22.1 (devDep — Rolldown-powered library build tool)
    - rollup-preserve-directives@1.1.3 (devDep — per-file 'use client' preservation)
    - publint@0.3.21 (devDep — exports map linting)
    - "@arethetypeswrong/cli@0.18.2 (devDep — ESM .d.ts resolution check)"
    - clsx@2.1.1 (dep — className merge)
    - tailwind-merge@3.6.0 (dep — Tailwind-aware class merge)
  patterns:
    - Internal-packages source-consumption pattern (exports point to src/ during development)
    - publishConfig swaps to dist/ entries on publish
    - tsdown unbundle:true for per-module output (preserves 'use client' per file)
    - deps.neverBundle for peer externalization (tsdown 0.22.x API)
key_files:
  created:
    - packages/ui/package.json
    - packages/ui/tsdown.config.ts
    - packages/ui/tsconfig.json
    - packages/ui/src/lib/utils.ts
    - packages/ui/src/index.ts
    - packages/ui/src/styles/theme.css (stub — populated in Plan 02)
    - packages/ui/src/styles/globals.css (stub — populated in Plan 02)
    - packages/ui/package-lock.json
  modified:
    - .gitignore (added packages/*/node_modules and packages/*/dist)
decisions:
  - "BRANCH A selected: tsdown 0.22.1 supports unbundle:true — confirmed via `npx tsdown --help | grep -i unbundle`. No tsup fallback needed."
  - "deps.neverBundle used instead of external (external is deprecated in tsdown 0.22.x)"
  - "CSS stub files created for theme.css and globals.css to satisfy publint; content populated in Plan 02"
  - "Build script includes CSS copy step: tsdown && cp src/styles/*.css dist/styles/ — ensures publishConfig dist references are satisfied"
metrics:
  duration_minutes: 3
  completed_date: "2026-05-29"
  tasks_completed: 1
  tasks_total: 1
  files_created: 8
  files_modified: 1
---

# Phase 01 Plan 01: Package Scaffold Summary

**One-liner:** tsdown 0.22.1 with unbundle:true scaffolds @farsight/ui as a buildable, tree-shakeable ESM package with 5 peer declarations and cn() utility.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Scaffold packages/ui — package.json, build config, tsconfig, utils | 8a6ed5b | packages/ui/package.json, tsdown.config.ts, tsconfig.json, src/lib/utils.ts, src/index.ts, src/styles/theme.css (stub), src/styles/globals.css (stub), package-lock.json |

Additional commits:
- `439aa44` — chore: gitignore packages/*/node_modules and packages/*/dist

## Verification Results

All phase-gate checks passed:

1. **Peer declarations correct** — PASS: react, react-dom, @clerk/react, @xyflow/react, @tanstack/react-query all declared
2. **Wrong clerk name absent** — PASS: @clerk/clerk-react NOT present; @clerk/react is correct
3. **sideEffects is array** — PASS: ["**/*.css"]
4. **Build artifact exists** — PASS: dist/index.js + dist/index.d.ts + dist/lib/utils.js + dist/lib/utils.d.ts
5. **publint** — PASS: "All good!" — no errors after CSS stub files and dist copy step added
6. **type:module** — PASS
7. **private:true** — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added CSS stub files and dist copy step to satisfy publint**
- **Found during:** Task 1 verify step
- **Issue:** publint reported `publishConfig.exports["./theme.css"]` and `publishConfig.exports["./styles/globals.css"]` pointed to `dist/styles/` files that did not exist (CSS files are not emitted by tsdown — only JS/d.ts)
- **Fix:** Created stub `src/styles/theme.css` and `src/styles/globals.css`; updated build script to `tsdown -c tsdown.config.ts && mkdir -p dist/styles && cp src/styles/theme.css dist/styles/theme.css && cp src/styles/globals.css dist/styles/globals.css`. Stubs are populated with full content in Plan 02 (THEME-01).
- **Files modified:** packages/ui/package.json (scripts.build), packages/ui/src/styles/theme.css (new stub), packages/ui/src/styles/globals.css (new stub)
- **Commit:** 8a6ed5b

**2. [Rule 2 - Missing critical functionality] Updated .gitignore for packages/ui build artifacts**
- **Found during:** Post-commit check (git status showed untracked packages/ui/dist and packages/ui/node_modules)
- **Fix:** Added `/packages/*/node_modules` and `/packages/*/dist` to root .gitignore — prevents generated artifacts from being accidentally staged
- **Files modified:** .gitignore
- **Commit:** 439aa44

**3. [Rule 1 - Auto-fix] Replaced deprecated `external` with `deps.neverBundle` in tsdown.config.ts**
- **Found during:** First build run
- **Issue:** tsdown 0.22.x emitted WARN: `` `external` is deprecated. Use `deps.neverBundle` instead ``
- **Fix:** Replaced `external: [...]` with `deps: { neverBundle: [...] }` per tsdown 0.22.x API
- **Files modified:** packages/ui/tsdown.config.ts
- **Commit:** 8a6ed5b (same task commit — fixed before commit)

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Empty CSS comment stub | packages/ui/src/styles/theme.css | Full token content (`:root`, `.dark`, `@theme inline`, `@source`) populated in Plan 02 (THEME-01) |
| Empty CSS comment stub | packages/ui/src/styles/globals.css | Full CSS entry content populated in Plan 02 (THEME-01) |

These stubs satisfy the publishConfig exports map requirement (publint passes). They do not prevent Plan 01's goal — the package scaffold is buildable with correct peer declarations and cn() utility.

## PKG-02 Scope Note

Phase 1 delivers: peer declarations in packages/ui/package.json (all 5 peers, @clerk/react corrected name).

**Deferred to Phase 4 PORT-01:** Root pnpm.overrides in the Farsight monorepo + `pnpm list react -r` single-version assertion. Do NOT write to ~/Projects/farsight-platform/ in Phase 1.

## Self-Check: PASSED

Verified:
- packages/ui/package.json — EXISTS
- packages/ui/tsdown.config.ts — EXISTS
- packages/ui/tsconfig.json — EXISTS
- packages/ui/src/lib/utils.ts — EXISTS
- packages/ui/src/index.ts — EXISTS
- packages/ui/src/styles/theme.css — EXISTS
- packages/ui/src/styles/globals.css — EXISTS
- packages/ui/dist/index.js — EXISTS (build output)
- packages/ui/dist/index.d.ts — EXISTS (build output)
- Commit 8a6ed5b — FOUND
- Commit 439aa44 — FOUND
