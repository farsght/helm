---
phase: 01-package-foundation-theming
verified: 2026-05-29T00:00:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
reverified: 2026-05-29T00:00:00Z
gaps_resolved:
  - truth: "tsconfig.json has a coherent, passing module/moduleResolution pairing"
    status: resolved
    fix_commit: 2d81d54
    resolution: "Changed compilerOptions.module from 'NodeNext' to 'ESNext' in packages/ui/tsconfig.json (legal pairing with moduleResolution:bundler). Re-verified: npx tsc --noEmit -p packages/ui/tsconfig.json now exits 0."
  - truth: "All runtime-required packages that ship as bare external imports in dist/ are declared in package.json"
    status: resolved
    fix_commit: 2d81d54
    resolution: "Added radix-ui (^1.4.3) and class-variance-authority (^0.7.1) to packages/ui/package.json dependencies, matching Helm root version ranges. Re-verified: both declared; build still exits 0; publint 'All good!'; 'use client' preservation intact. NOTE: WR-01 (dist/node_modules/class-variance-authority types.d.ts leak via dts resolve) was NOT addressed here — it is a non-blocking warning carried forward as Phase-2/Phase-4 cleanup."
---

# Phase 1: Package Foundation & Theming — Verification Report

**Phase Goal:** `apps/web` can install the package and import a themed, tree-shakeable artifact with exactly one version of React, and the design-system token contract exists as a consumable `./theme.css` subpath.
**Verified:** 2026-05-29
**Status:** passed (re-verified after gap closure — commit 2d81d54)
**Re-verification:** Yes — initial run found 2 gaps (CR-01, CR-02); both fixed inline and empirically re-confirmed

All empirical checks were run directly against the codebase. SUMMARY.md claims were not accepted as evidence.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Package builds (npm run build exits 0) and produces per-module dist/ | VERIFIED | Build ran successfully in 731ms, produced 5 .js files (one per source module) + matching .d.ts files, no build errors |
| 2 | sideEffects:["**/*.css"] and type:module are set correctly | VERIFIED | `node -e` check confirms Array.isArray(sideEffects) PASS; type:module confirmed in package.json |
| 3 | All 5 required peers declared (@clerk/react, not @clerk/clerk-react) | VERIFIED | All 5 present: react, react-dom, @clerk/react, @xyflow/react, @tanstack/react-query; @clerk/clerk-react absent |
| 4 | ./theme.css subpath export exists and file contains the correct Tailwind v4 token contract | VERIFIED | exports["./theme.css"] maps to src/styles/theme.css; file has @custom-variant dark, @source, @theme inline (60 lines), :root (48 lines), .dark (47 lines); no @import "tailwindcss" |
| 5 | tokens.chart[0] === 'var(--color-chart-1)' | VERIFIED | `npx tsx` check confirmed: PASS tokens.chart[0]= var(--color-chart-1), length=5 |
| 6 | tsconfig.json has a coherent, passing module/moduleResolution pairing | VERIFIED (gap closed, commit 2d81d54) | module changed NodeNext→ESNext; `npx tsc --noEmit -p packages/ui/tsconfig.json` now exits 0 |
| 7 | All runtime-required packages that ship as bare external imports in dist/ are declared in package.json | VERIFIED (gap closed, commit 2d81d54) | radix-ui (^1.4.3) + class-variance-authority (^0.7.1) added to dependencies; build exits 0; publint "All good!" |

**Score:** 7/7 truths verified (5 at initial run + 2 after gap closure)

---

### Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **PKG-01** — subpath exports + ESM + sideEffects:["**/*.css"] | SATISFIED | exports map present with ./theme.css and ./lib/* subpaths; sideEffects:["**/*.css"]; type:module; publint "All good!" |
| **PKG-02** — 5 peers declared (Phase 1 portion only; pnpm.overrides + pnpm list deferred to Phase 4) | SATISFIED (partial by design) | All 5 peers in peerDependencies; @clerk/react (corrected name); peerDependenciesMeta with optional:true for clerk/xyflow/query. Root pnpm.overrides and single-version proof explicitly deferred to Phase 4 PORT-01 per scope decision. |
| **PKG-03** — 'use client' preserved in built output + CI assertion | SATISFIED | label.js line 1: "use client"; button.js correctly omits it; check-directives.sh outputs PASS (count 1 >= 1). Note: rollup-preserve-directives plugin emits "failed to parse" warnings on every file — the directive survives by accident of tsdown's internal transform, not by the plugin's design (WR-02 from 01-REVIEW.md — mechanism fragile). |
| **PKG-04** — build externalizes peers + emits .d.ts | SATISFIED | tsdown exits 0; dist/ has per-module .js + .d.ts pairs; peers are bare external imports in runtime JS; publint "All good!" |
| **THEME-01** — theme.css at ./theme.css subpath, no @import "tailwindcss" | SATISFIED | Subpath wired; file confirmed no tailwindcss import; @custom-variant dark, @source, @theme inline, :root, .dark all present |
| **THEME-02** — .dark token override + consumer setup documented | SATISFIED | .dark block in theme.css (47 lines); README.md documents @source, import order, dark mode contract, xyflow CSS order, peer versions |
| **THEME-03** — tokens.chart[1] JS export | SATISFIED | tokens.chart[0]=var(--color-chart-1) through tokens.chart[4]=var(--color-chart-5); tokens.color with 7 semantic keys; as const; TokenChart/TokenColor types exported |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/package.json` | exports map, sideEffects, 5 peers, @clerk/react | VERIFIED | All present and correct |
| `packages/ui/tsdown.config.ts` | unbundle:true, rollup-preserve-directives, neverBundle externals | VERIFIED | unbundle:true confirmed; 9 entries in neverBundle (react, react-dom, react/* paths, clerk, xyflow, tanstack, radix-ui, class-variance-authority) |
| `packages/ui/tsconfig.json` | Valid TypeScript config | STUB/BROKEN | File exists but module:NodeNext + moduleResolution:bundler is illegal; tsc --noEmit exits 2 |
| `packages/ui/src/lib/utils.ts` | cn() using clsx + tailwind-merge | VERIFIED | Exact copy of Helm lib/utils.ts; cn() confirmed function via tsx smoke |
| `packages/ui/src/styles/theme.css` | @custom-variant dark, @source, @theme inline, :root, .dark; no tailwindcss import | VERIFIED | All sections present and substantive (160+ lines total); no tailwindcss import |
| `packages/ui/src/lib/tokens.ts` | tokens.chart (5), tokens.color (7 keys), as const | VERIFIED | tokens.chart length=5, tokens.chart[0]=var(--color-chart-1), tokens.color.mutedFg=var(--color-muted-foreground) |
| `packages/ui/README.md` | Consumer setup: peers, import order, @source, dark mode, xyflow CSS, tokens | VERIFIED | All sections present; @source, xyflow, @clerk/react confirmed via grep |
| `packages/ui/src/components/ui/button.tsx` | Server-safe (no 'use client'), alias rewrite | VERIFIED | No 'use client'; uses ../../lib/utils (correct two-level path); no @/ aliases |
| `packages/ui/src/components/ui/label.tsx` | 'use client' at line 1, alias rewrite | VERIFIED | "use client" confirmed at line 1; uses ../../lib/utils |
| `packages/ui/scripts/check-directives.sh` | CI assertion for 'use client' count | VERIFIED | Script runs; output: PASS 1 'use client' file(s) in dist/ (expected >= 1) |
| `packages/ui/dist/` | Per-module ESM output | VERIFIED | 5 .js files: index.js, lib/tokens.js, lib/utils.js, components/ui/button.js, components/ui/label.js |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| tsdown.config.ts | src/index.ts | entry array | VERIFIED | `entry: ['src/index.ts']` confirmed |
| package.json exports | src/styles/theme.css | `"./theme.css": "./src/styles/theme.css"` | VERIFIED | Confirmed in package.json |
| src/index.ts | src/components/ui/button.tsx | export from | VERIFIED | `export { Button, buttonVariants } from './components/ui/button'` |
| src/index.ts | src/components/ui/label.tsx | export from | VERIFIED | `export { Label } from './components/ui/label'` |
| src/index.ts | src/lib/tokens.ts | export from | VERIFIED | `export { tokens, type TokenChart, type TokenColor } from './lib/tokens'` |
| src/components/ui/button.tsx | src/lib/utils.ts | `../../lib/utils` | VERIFIED | Alias correctly rewritten two levels up |
| src/components/ui/label.tsx | src/lib/utils.ts | `../../lib/utils` | VERIFIED | Alias correctly rewritten two levels up |
| dist/components/ui/label.js | 'use client' directive | rollup-preserve-directives | VERIFIED | "use client"; is line 1 of label.js |
| dist/components/ui/button.js | radix-ui, class-variance-authority | neverBundle external | WIRED but undeclared | Bare external imports confirmed in dist/; packages not declared in package.json (CR-02) |

---

### Data-Flow Trace (Level 4)

Not applicable — Phase 1 delivers static primitives (Button, Label) with no data-fetching or dynamic data rendering. All token values are static CSS var() strings confirmed by tsx check.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build exits 0 | `npm run build` from packages/ui/ | Exit 0, 731ms, 20 files | PASS |
| per-module dist: 5 .js files (one per source module) | `find dist -name "*.js" -not -path "*/node_modules/*"` | 5 files confirmed | PASS |
| label.js has 'use client' at line 1 | `head -1 dist/components/ui/label.js` | `"use client";` | PASS |
| button.js omits 'use client' | `grep -q '"use client"' dist/components/ui/button.js` | absent | PASS |
| check-directives.sh exits 0 | `bash scripts/check-directives.sh` | PASS: 1 'use client' file(s) | PASS |
| publint exits 0 | `npx publint .` | "All good!" | PASS |
| tokens.chart[0] value | `npx tsx` import of src/lib/tokens.ts | var(--color-chart-1) confirmed | PASS |
| walking skeleton import chain | `npx tsx` import of button.tsx + utils.ts | Button=function, cn=function | PASS |
| tsc --noEmit on package tsconfig | `npx tsc --noEmit -p packages/ui/tsconfig.json` | Exit 0 (after gap fix 2d81d54; was Exit 2 / TS5095 + TS5109) | PASS |
| peers not bundled in dist runtime JS | grep for `from 'react'` in dist/*.js | absent (bare external `import "react"`) | PASS |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `packages/ui/tsconfig.json:4-5` | module:NodeNext + moduleResolution:bundler illegal combination | BLOCKER | tsc --noEmit exits 2; IDE project service fails; any tsconfig that extends this file inherits broken settings |
| `packages/ui/package.json` | radix-ui and class-variance-authority imported + externalized but undeclared | BLOCKER | Clean consumer install fails; "installable" invariant broken outside hoisting context |
| `packages/ui/tsdown.config.ts:14` | `preserveDirectives() as any` — build emits "failed to parse" warnings for every file | WARNING | Plugin runs before tsdown's transform; directive preservation works by accident; fragile against future tsdown version bumps or new component syntax |
| `packages/ui/dist/components/ui/button.d.ts` | Imports ClassProp via `../../node_modules/class-variance-authority/dist/types.js` | WARNING | Leaks internal dist/node_modules path into published .d.ts; type resolution depends on this directory surviving install |
| `packages/ui/scripts/check-directives.sh` | Threshold `>= 1` cannot detect per-component regression | WARNING | A future build dropping 'use client' from a needed component passes if any one other component still has it |
| `packages/ui/src/styles/globals.css` | Stub comment only — exported but empty | INFO | Consumer importing @farsight/ui/styles/globals.css gets empty stylesheet silently |
| `packages/ui/package-lock.json` | npm lockfile committed for a package destined for a pnpm workspace | INFO | Wrong lockfile format for the target ecosystem; will drift from pnpm resolution |

---

### Code Review CR-01 and CR-02 Assessment

#### CR-01: tsconfig.json illegal module/moduleResolution combo

**Assessment: Phase-1 BLOCKER gap.**

The PLAN explicitly required creating `packages/ui/tsconfig.json` as a deliverable. The PLAN's own acceptance criteria say `moduleResolution: "bundler"` but implicitly require the file to be valid TypeScript configuration. CLAUDE.md mandates `npx tsc --noEmit` as authoritative. The tsdown build succeeds (tsdown uses its own resolver), but the tsconfig is broken as a standalone TypeScript configuration artifact. Any future phase that runs `tsc` against this package, any IDE using it as a project root, and any tsconfig that extends it will fail. Fix: change `module` from `"NodeNext"` to `"ESNext"` (legal pairing with `moduleResolution: "bundler"`) and verify `tsc --noEmit` passes.

#### CR-02: radix-ui and class-variance-authority undeclared

**Assessment: Phase-1 BLOCKER gap — not deferred.**

The scope decisions provided explicitly defer only one item to Phase 4: the `pnpm.overrides` block and `pnpm list react -r` single-version proof (PKG-02's monorepo enforcement). They do NOT defer missing dependency declarations for packages that are currently imported by shipped components. The walking skeleton (Button + Label) introduced these imports, making their declaration in-scope for Phase 1's "installable" invariant. Phase 4 PORT-01 covers workspace:* consumption from a Vite consumer — that test would fail if these deps are undeclared, but PORT-01 is a consumption test, not the repair. The repair belongs where the components were introduced: Phase 1. Fix: add `radix-ui` and `class-variance-authority` to `dependencies` in `package.json`.

---

### Gaps Summary

**Both blockers from the initial run are now RESOLVED (commit 2d81d54). Final status: passed, 7/7.**

1. **CR-01 — tsconfig.json fails tsc --noEmit.** ✓ RESOLVED. Changed `"module": "NodeNext"` → `"ESNext"` (legal pairing with `moduleResolution: "bundler"`). `npx tsc --noEmit -p packages/ui/tsconfig.json` now exits 0.

2. **CR-02 — radix-ui + class-variance-authority imported, externalized, but undeclared.** ✓ RESOLVED. Added `radix-ui` (^1.4.3) and `class-variance-authority` (^0.7.1) to `dependencies`, matching Helm root version ranges. Clean install can now resolve them; build exits 0, publint "All good!", `'use client'` preservation intact.

**All 7 truths verified.** Core user-facing deliverables (build, peers, theme.css token contract, tokens.chart JS export, publint clean, 'use client' preservation, per-module output) plus the two repaired invariants (valid tsconfig, complete runtime dependency declarations) all hold.

**Carried forward (non-blocking, from 01-REVIEW.md):** WR-01 (dist/node_modules type-decl leak — add `dts:{resolve:false}`), WR-02 (`rollup-preserve-directives` "failed to parse" warnings — directive survival is fragile), WR-03 (`check-directives.sh` `>=1` threshold can't catch per-component regression), WR-04 (`publishConfig.exports["./lib/*"]` lacks a `types` condition), WR-05 (npm `package-lock.json` committed into a pnpm-workspace-destined package), and CR-01's fragility class. These are appropriate to address during the Phase 2 component port and the Phase 4 monorepo/clean-install work.

---

### Human Verification Required

No human verification items. The phase goal's user-visible outcomes (themed import, token contract, tree-shakeability) were verified programmatically. The walking skeleton visual checkpoint was human-approved by the executor during Plan 03.

---

_Verified: 2026-05-29_
_Verifier: Claude (gsd-verifier)_
