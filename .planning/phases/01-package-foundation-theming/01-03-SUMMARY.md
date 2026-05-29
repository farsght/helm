---
phase: 01-package-foundation-theming
plan: "03"
subsystem: ui
tags: [tsdown, rollup, use-client, directive-preservation, publint, button, label, radix-ui, class-variance-authority, esm]

# Dependency graph
requires:
  - phase: 01-02
    provides: theme.css token contract + tokens.ts JS export (THEME-01..03)
  - phase: 01-01
    provides: packages/ui scaffold with tsdown build config and cn() utility (PKG-01, PKG-02, PKG-04)
provides:
  - Button + Label primitives in packages/ui/src/components/ui/ with @/ alias rewritten to relative paths
  - Per-module ESM dist/ artifact with 'use client' directive preserved in label.js, correctly absent from button.js
  - packages/ui/scripts/check-directives.sh — CI assertion for 'use client' count in dist/
  - publint-clean package with all peers (react, radix-ui, class-variance-authority, react/jsx-runtime) externalized at runtime
  - Proven import chain: tsx smoke confirms Button=function, tokens.chart[0]/tokens.color.background resolve correctly
  - Walking skeleton: full Phase 1 pipeline proven (Helm source → packages/ui/dist → importable artifact with theme tokens)
affects: [phase-02-headless-core-port, phase-04-monorepo-port]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alias rewrite depth: from src/components/ui/ the correct relative path to lib/ is ../../lib/utils (two levels up, NOT ../lib/utils as written in 01-PATTERNS.md)"
    - "Peer externalization: radix-ui and class-variance-authority must be in deps.neverBundle (not just peerDependencies) to avoid bundling into dist/node_modules"
    - "Server-safe component: button.tsx carries no 'use client' directive; label.tsx carries it at line 1 — both patterns proved by dist/ grep checks"

key-files:
  created:
    - packages/ui/src/components/ui/button.tsx
    - packages/ui/src/components/ui/label.tsx
    - packages/ui/scripts/check-directives.sh
  modified:
    - packages/ui/src/index.ts
    - packages/ui/tsdown.config.ts

key-decisions:
  - "Phase 2 alias rewrite rule correction: PATTERNS.md says '../lib/utils' but the correct depth from src/components/ui/ is '../../lib/utils' — all 34 Phase 2 component ports must use the two-level path"
  - "radix-ui and class-variance-authority added to deps.neverBundle in tsdown.config.ts — they were bundling into dist/node_modules despite being peerDependencies; neverBundle forces runtime externalization"

patterns-established:
  - "Alias rewrite correction (../../lib/utils): Phase 2 must apply the corrected two-level relative path for all 34 component ports — PATTERNS.md has an off-by-one error"
  - "neverBundle pattern: any package that appears in peerDependencies AND as a direct import in component source must also be listed in deps.neverBundle to prevent tsdown from vendoring it"

requirements-completed: [PKG-01, PKG-03, PKG-04]

# Metrics
duration: ~35min
completed: 2026-05-29
---

# Phase 01 Plan 03: Button + Label Port + Build Verification Summary

**Per-module ESM artifact with 'use client' directive preservation proven: button.js (server-safe) vs label.js (directive present), publint clean, all peers externalized, walking skeleton import smoke passed**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-29
- **Completed:** 2026-05-29
- **Tasks:** 2 auto + 1 checkpoint (human-approved)
- **Files modified:** 5

## Accomplishments

- Ported Button (server-safe, no 'use client') and Label ('use client' at line 1) into packages/ui/src/components/ui/ with @/ alias rewritten to relative paths
- Ran full tsdown build producing per-module ESM dist/; directive preservation proven: label.js contains 'use client', button.js does not
- Externalized radix-ui and class-variance-authority from dist output; publint reports "All good!"; peers are bare external imports in runtime JS
- CI assertion script (check-directives.sh) outputs PASS for Phase 1 (count >= 1); comment flags Phase 2 update needed
- Walking skeleton smoke confirmed: Button=function, tokens.chart[0]=var(--color-chart-1), tokens.color.background=var(--color-background)
- Human checkpoint approved: token values correct (--background oklch(1 0 0) in :root, oklch(0.141 0.005 285.823) in .dark; 5 chart colors in both blocks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Port Button + Label primitives with alias rewrite** - `55fcddb` (feat)
2. **Task 2: Full build + 'use client' assertion + publint + walking skeleton smoke** - `8408cd0` (feat)
3. **Task 3: Walking skeleton visual verify** - checkpoint:human-verify, APPROVED (no additional commit required)

## Files Created/Modified

- `packages/ui/src/components/ui/button.tsx` - Button primitive (server-safe, no 'use client'); alias rewritten to ../../lib/utils
- `packages/ui/src/components/ui/label.tsx` - Label primitive ('use client' at line 1); alias rewritten to ../../lib/utils
- `packages/ui/src/index.ts` - Updated to export Button, buttonVariants, Label alongside existing cn, tokens exports
- `packages/ui/scripts/check-directives.sh` - CI assertion: grep -rl 'use client' in dist/, asserts count >= 1, exits 1 on failure
- `packages/ui/tsdown.config.ts` - Added radix-ui and class-variance-authority to deps.neverBundle to prevent peer bundling

## Decisions Made

1. **Alias rewrite depth corrected to ../../lib/utils:** The plan (and 01-PATTERNS.md) specified `"../lib/utils"` as the rewrite target, but from `src/components/ui/` the correct relative path to `src/lib/` is two levels up (`../../lib/utils`). The executor applied the correct path; PATTERNS.md has an off-by-one error that must be fixed before Phase 2.

2. **radix-ui + class-variance-authority added to neverBundle:** Both packages were being vendored into dist/node_modules despite appearing in peerDependencies. Adding them to `deps.neverBundle` in tsdown.config.ts forces tsdown to treat them as external at build time, producing bare external imports in the runtime JS. A transitive class-variance-authority types.d.ts remains under dist/node_modules — type-only artifact, publint clean, acceptable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Alias rewrite depth correction: ../../lib/utils (not ../lib/utils)**
- **Found during:** Task 1 (Port Button + Label primitives with alias rewrite)
- **Issue:** The plan specified `"../lib/utils"` as the alias rewrite target. From `src/components/ui/`, `../lib/utils` would resolve to `src/components/lib/utils` (non-existent). The correct relative path to `src/lib/utils` is `../../lib/utils` (two directories up).
- **Fix:** Both button.tsx and label.tsx were written with `../../lib/utils`. Import chain verified by tsx smoke.
- **Files modified:** packages/ui/src/components/ui/button.tsx, packages/ui/src/components/ui/label.tsx
- **Verification:** tsx smoke passed; Button=function, cn resolved
- **Committed in:** 55fcddb (Task 1 commit)
- **FLAG FOR PHASE 2:** 01-PATTERNS.md documents the alias rewrite as `"@/lib/utils" → "../lib/utils"`. This is wrong by one directory level. **Phase 2 must port all 34 components using `../../lib/utils` and update PATTERNS.md accordingly** — otherwise every Phase 2 component import will silently resolve to a non-existent path.

**2. [Rule 2 - Missing Critical] radix-ui and class-variance-authority added to deps.neverBundle**
- **Found during:** Task 2 (Full build + 'use client' assertion)
- **Issue:** tsdown was bundling radix-ui and class-variance-authority into dist/node_modules despite both being declared as peerDependencies. A consumer would receive bundled copies of these packages, violating peer-dep hygiene and potentially causing version conflicts.
- **Fix:** Added both packages to `deps.neverBundle` in tsdown.config.ts. After rebuild, dist output contains only bare external imports (`from 'radix-ui'`, `from 'class-variance-authority'`).
- **Files modified:** packages/ui/tsdown.config.ts
- **Verification:** grep on dist JS confirms bare external imports; publint "All good!"; no bundled copies in dist/
- **Committed in:** 8408cd0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical)
**Impact on plan:** Both required for correctness. No scope creep. Alias fix is a correctness requirement for Phase 2 — the wrong path would silently break every Phase 2 component port.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 is complete. All 7 requirements verified:
- PKG-01: sideEffects: ["**/*.css"], exports map with ./theme.css subpath — PASS
- PKG-02: 5 correct peers including @clerk/react — PASS (root pnpm.overrides deferred to Phase 4 PORT-01 as planned)
- PKG-03: 'use client' preserved in dist/components/ui/label.js; correctly absent from button.js — PASS
- PKG-04: build exits 0; per-module dist/ with .js + .d.ts files; publint clean — PASS
- THEME-01: theme.css at ./src/styles/theme.css, no @import "tailwindcss" — PASS
- THEME-02: .dark token override present; README documents consumer setup — PASS
- THEME-03: tokens.chart[0] === 'var(--color-chart-1)' — PASS

**Phase 2 blockers to address at plan time:**
1. PATTERNS.md alias-depth rule is wrong (`../lib/utils` should be `../../lib/utils`) — fix before porting any of the 34 components
2. `lucide-react` major bump (Helm `^0.576.0` → 1.x) — audit icon imports during the port (pre-existing concern, already in STATE.md blockers)

## Self-Check: PASSED

- packages/ui/src/components/ui/button.tsx — FOUND (commit 55fcddb)
- packages/ui/src/components/ui/label.tsx — FOUND (commit 55fcddb)
- packages/ui/scripts/check-directives.sh — FOUND (commit 8408cd0)
- packages/ui/tsdown.config.ts (neverBundle) — FOUND (commit 8408cd0)
- Prior commits confirmed: 55fcddb + 8408cd0 both present in git log
- Human checkpoint approved: smoke output verified, token values confirmed correct

---
*Phase: 01-package-foundation-theming*
*Completed: 2026-05-29*
