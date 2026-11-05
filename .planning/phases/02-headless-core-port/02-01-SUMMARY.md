---
phase: 02-headless-core-port
plan: "01"
subsystem: ui
tags: [vitest, vitest-axe, axe-core, eslint-plugin-jsx-a11y, check-imports, ci-guard, a11y, jsdom, lucide-react]

# Dependency graph
requires:
  - phase: 01-03
    provides: Button + Label primitives already ported to packages/ui (axe smoke target)
  - phase: 01-01
    provides: packages/ui scaffold, tsdown build config, cn() utility
provides:
  - packages/ui/vitest.config.ts — jsdom env + globals + setupFiles + src coverage
  - packages/ui/vitest.setup.ts — @testing-library/jest-dom + vitest-axe matchers registered
  - packages/ui/eslint.config.mjs — jsx-a11y rules via @typescript-eslint/parser
  - packages/ui/scripts/check-imports.sh — 3-rule CI guard (no next/*, no @clerk/nextjs/server, no alert()/confirm())
  - packages/ui/__tests__/a11y/button.a11y.test.tsx — 2-test axe smoke suite for Button
  - Proven harness: all Wave 1 gates green (check-imports, test, lint, build)
affects: [phase-02-02, phase-02-03, phase-02-04, phase-02-05]

# Tech tracking
tech-stack:
  added:
    - vitest@^4.1.7 (test runner, jsdom env)
    - @vitejs/plugin-react@^6.0.2 (JSX transform for vitest)
    - vitest-axe@0.1.0 (axe-core wrapper with toHaveNoViolations matcher)
    - eslint-plugin-jsx-a11y@^6.10.2 (static a11y lint rules)
    - @typescript-eslint/parser@^8.60.0 (TS/JSX parser for ESLint)
    - @typescript-eslint/eslint-plugin@^8.60.0 (TS ESLint rules)
    - @testing-library/react@^16.3.2 (render + container for axe tests)
    - jsdom@^29.1.1 (browser DOM simulation for vitest)
    - lucide-react@^1.0.0 (icon dep for Phase 2 component ports)
  patterns:
    - "vitest-axe@0.1.0 extend-expect module provides types only; runtime registration requires expect.extend(matchers) where matchers = import * as matchers from 'vitest-axe/matchers'"
    - "ESLint flat config for TSX requires @typescript-eslint/parser in languageOptions.parser; without it, type annotations cause 'Unexpected token' parse errors"
    - "check-imports.sh Rule 1 pattern 'from \"next/' (trailing slash) naturally excludes 'from \"next-themes\"' — no explicit grep -v exclusion needed"
    - "axe smoke tests must disable landmark-one-main and region rules when testing isolated components in jsdom (no surrounding document structure)"

key-files:
  created:
    - packages/ui/vitest.config.ts
    - packages/ui/vitest.setup.ts
    - packages/ui/eslint.config.mjs
    - packages/ui/scripts/check-imports.sh
    - packages/ui/__tests__/a11y/button.a11y.test.tsx
  modified:
    - packages/ui/package.json

key-decisions:
  - "vitest-axe extend-expect runtime registration fix: the extend-expect module adds TypeScript types only; actual matcher registration requires expect.extend(vitestAxeMatchers) in the setup file"
  - "ESLint flat config needs @typescript-eslint/parser for TSX files: eslint-plugin-jsx-a11y alone cannot parse TypeScript generics or type annotations"
  - "check-imports.sh uses trailing-slash pattern 'from \"next/' which naturally discriminates next-themes (no backtrack filter needed)"

requirements-completed: [CORE-01, CORE-05]

# Metrics
duration: ~15min
completed: 2026-05-29
---

# Phase 02 Plan 01: Test Harness + CI Guard Summary

**Wave 0 enablement shipped: vitest jsdom harness + vitest-axe smoke tests green on Button, 3-rule check-imports.sh CI guard live, eslint-plugin-jsx-a11y configured — all subsequent Phase 2 plans now have assertions to run against**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-29
- **Completed:** 2026-05-29
- **Tasks:** 2 auto (TDD)
- **Files modified/created:** 6

## Accomplishments

- Created `packages/ui/vitest.config.ts` with jsdom environment, globals: true, setupFiles wired, src/** coverage — no next/* mocks, no DATABASE_URL stub, no clerk mocks
- Created `packages/ui/vitest.setup.ts` with @testing-library/jest-dom and vitest-axe matchers registered via `expect.extend`
- Created `packages/ui/eslint.config.mjs` flat config with @typescript-eslint/parser + eslint-plugin-jsx-a11y rules (aria-proptypes error, aria-role error, interactive-supports-focus/click-events-have-key-events/no-static-element-interactions warn)
- Created `packages/ui/scripts/check-imports.sh` with 3-rule CI guard: (1) no `next/*` imports, (2) no `@clerk/nextjs/server`, (3) no `alert()`/`confirm()` — exits 0 against current src, executable, PASS message confirmed
- Created `packages/ui/__tests__/a11y/button.a11y.test.tsx` with 2 axe smoke tests: text Button + icon-only Button with aria-label; both pass; scoped to container (not document)
- All 4 Wave 1 gates confirmed green: check-imports.sh, npm test, npm lint, npm build

## Task Commits

Each task was committed atomically:

1. **Task 1: Install devDeps + create vitest.config.ts + vitest.setup.ts** — `d231653` (feat)
2. **Task 2: Create check-imports.sh + eslint.config.mjs + Button axe smoke test** — `9638bcc` (feat)

## Files Created/Modified

- `packages/ui/vitest.config.ts` — jsdom env, globals: true, setupFiles: ['./vitest.setup.ts'], coverage src/**, alias @→src/
- `packages/ui/vitest.setup.ts` — import @testing-library/jest-dom; import * as vitestAxeMatchers from 'vitest-axe/matchers'; expect.extend(vitestAxeMatchers)
- `packages/ui/eslint.config.mjs` — flat config; @typescript-eslint/parser; jsx-a11y plugin; 5 rules
- `packages/ui/scripts/check-imports.sh` — 3-rule grep guard; chmod +x; -rwxr-xr-x
- `packages/ui/__tests__/a11y/button.a11y.test.tsx` — 2 axe smoke tests scoped to container
- `packages/ui/package.json` — added test + lint scripts; devDeps: vitest, @vitejs/plugin-react, vitest-axe, eslint-plugin-jsx-a11y, @testing-library/react, jsdom, @typescript-eslint/parser, @typescript-eslint/eslint-plugin; dep: lucide-react@^1.0.0

## Decisions Made

1. **vitest-axe runtime registration pattern:** `extend-expect` module adds TypeScript types only (the dist/extend-expect.js file is empty). Actual matcher registration requires `expect.extend(vitestAxeMatchers)` where `vitestAxeMatchers = import * as matchers from 'vitest-axe/matchers'`. Plan referenced `import 'vitest-axe/extend-expect'` which works for types but not runtime.

2. **ESLint flat config + TypeScript parser required:** The plan's target eslint.config.mjs did not include a parser configuration. Without `@typescript-eslint/parser`, ESLint fails to parse TSX files with type annotations. Added `languageOptions.parser` and installed `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` as devDeps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vitest-axe extend-expect provides types only; added expect.extend() call**
- **Found during:** Task 2 (axe smoke tests failing with "Invalid Chai property: toHaveNoViolations")
- **Issue:** The plan specified `import 'vitest-axe/extend-expect'` in vitest.setup.ts. The dist/extend-expect.js file in vitest-axe@0.1.0 is empty — it does not call `expect.extend()`. The `toHaveNoViolations` matcher was unavailable at test runtime.
- **Fix:** Changed vitest.setup.ts to `import * as vitestAxeMatchers from 'vitest-axe/matchers'; expect.extend(vitestAxeMatchers)`. Both axe tests passed immediately.
- **Files modified:** packages/ui/vitest.setup.ts
- **Commit:** 9638bcc

**2. [Rule 3 - Blocking] ESLint could not parse TSX — added @typescript-eslint/parser**
- **Found during:** Task 2 (npm lint exit code 1: "Unexpected token VariantProps")
- **Issue:** The plan's eslint.config.mjs target did not include a `languageOptions.parser` entry. ESLint's default parser (espree) cannot parse TypeScript generics or type annotations.
- **Fix:** Added `parser: tsParser` from `@typescript-eslint/parser` to the flat config and installed `@typescript-eslint/parser@^8.60.0` + `@typescript-eslint/eslint-plugin@^8.60.0` as devDeps. Lint exits 0.
- **Files modified:** packages/ui/eslint.config.mjs, packages/ui/package.json
- **Commit:** 9638bcc

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking issue)

## Known Stubs

None — this plan delivers infrastructure only (config files + scripts + one smoke test). No data stubs or placeholder text.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. check-imports.sh inputs are controlled (own source files, no external data). No new threat surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- packages/ui/vitest.config.ts — FOUND (commit d231653)
- packages/ui/vitest.setup.ts — FOUND (commit d231653 + updated 9638bcc)
- packages/ui/eslint.config.mjs — FOUND (commit 9638bcc)
- packages/ui/scripts/check-imports.sh — FOUND (commit 9638bcc), -rwxr-xr-x confirmed
- packages/ui/__tests__/a11y/button.a11y.test.tsx — FOUND (commit 9638bcc)
- All 4 Wave 1 gate commands exit 0: check-imports.sh PASS, 2 tests green, lint exit 0, build exit 0
- Prior commits confirmed: d231653 + 9638bcc both present in git log

---
*Phase: 02-headless-core-port*
*Completed: 2026-05-29*
