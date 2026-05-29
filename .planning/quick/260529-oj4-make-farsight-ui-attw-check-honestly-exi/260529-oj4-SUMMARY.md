---
phase: quick-260529-oj4
plan: 01
subsystem: packages/ui
tags: [packaging, attw, types, build]
requirements: [PORT-02]
dependency_graph:
  requires: []
  provides: [attw-check-passing]
  affects: [packages/ui/package.json, packages/ui/tsdown.config.ts, packages/ui/CONSUMER.md]
tech_stack:
  added: ["@arethetypeswrong/cli@0.18.3"]
  patterns: ["pnpm pack + attw --profile esm-only", "zod externalized in tsdown neverBundle"]
key_files:
  created: []
  modified:
    - packages/ui/package.json
    - packages/ui/tsdown.config.ts
    - packages/ui/CONSUMER.md
    - .planning/phases/04-contract-gated-surfaces-monorepo-port/04-VERIFICATION.md
decisions:
  - "Upgrade @arethetypeswrong/cli 0.18.2 → 0.18.3: 0.18.2 has data[0].filename crash bug in createPackage.js"
  - "Add zod to tsdown neverBundle: prevents farsight-error.d.ts from emitting dist/node_modules relative paths"
  - "Use !dist/node_modules negation in files: excludes dagre/graphlib/lodash from tarball; attw crash was from scanning bundled node_modules"
  - "Use pnpm pack not npm pack: pnpm applies publishConfig.exports; npm pack does not"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  files_modified: 5
---

# Phase Quick-260529-oj4 Plan 01: @farsight/ui attw check — SUMMARY

**One-liner:** Wire `npm run check:attw` using `pnpm pack` + `attw --profile esm-only` to earn exit 0 on the bundler profile by externalizing `zod` from tsdown to eliminate `farsight-error.d.ts` internal resolution errors.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add files allowlist + check:attw script | `998393e` | `packages/ui/package.json`, `packages/ui/tsdown.config.ts`, `pnpm-lock.yaml` |
| 2 | Document attw validation in CONSUMER.md + update VERIFICATION.md | `b368525` | `packages/ui/CONSUMER.md`, `04-VERIFICATION.md` |
| 3 | Full regression gate sweep (verification only) | — | no edits |

---

## check:attw Invocation

**Final script in package.json:**
```
"check:attw": "npm run build && TARBALL=$(pnpm pack --pack-destination /tmp 2>&1 | grep '\\.tgz' | tail -1 | tr -d '[:space:]') && npx @arethetypeswrong/cli $TARBALL --profile esm-only --exclude-entrypoints theme.css styles/globals.css; STATUS=$?; rm -f $TARBALL; exit $STATUS"
```

**Exit code: 0**

**Key output lines:**
```
@farsight/ui v0.0.0

Build tools:
- @arethetypeswrong/cli@0.18.3
- tsdown@0.22.1

 (ignoring resolutions: 'node10', 'node16-cjs')

┌───────────────────┬────────────────────────────────────────┬──────────────────────┐
│                   │ "@farsight/ui"                         │ "@farsight/ui/lib/*" │
├───────────────────┼────────────────────────────────────────┼──────────────────────┤
│ node16 (from ESM) │ 🟢 (ESM)                               │ (wildcard)           │
├───────────────────┼────────────────────────────────────────┼──────────────────────┤
│ bundler           │ 🟢                                     │ (wildcard)           │
├───────────────────┼────────────────────────────────────────┼──────────────────────┤
│ node10            │ (ignored) 💀 Resolution failed         │ (ignored) (wildcard) │
├───────────────────┼────────────────────────────────────────┼──────────────────────┤
│ node16 (from CJS) │ (ignored) ⚠️ ESM (dynamic import only) │ (ignored) (wildcard) │
└───────────────────┴────────────────────────────────────────┴──────────────────────┘
```

- Bundler profile: **GREEN**
- node16 (from ESM): **GREEN (ESM)**
- **Zero InternalResolutionError** in output
- CSS entrypoints (theme.css, styles/globals.css) absent from results (excluded)
- No `--ignore-rules` flag used

---

## files Allowlist Added

```json
"files": [
  "dist",
  "!dist/node_modules",
  "src/styles",
  "README.md",
  "CONSUMER.md"
]
```

The `!dist/node_modules` negation excludes `dagre@0.8.5`, `graphlib@2.1.8`, `lodash@4.18.1` (bundled by tsdown for `auto-layout.ts`) from the published tarball. This was the root cause of attw 0.18.2's `Cannot read properties of undefined (reading 'filename')` crash — attw's tarball scanner couldn't handle the bundled node_modules structure.

---

## publint Result

```
Running publint v0.3.21 for @farsight/ui...
Packing files with `pnpm pack`...
Linting...
All good!
```

Exit code: **0** — the previous non-blocking suggestion ("can use pkg.files to scope") is now resolved. publint shows "All good!" (zero suggestions/errors).

---

## Root Causes Diagnosed and Fixed

### 1. attw 0.18.2 crash (exit 3)
- `createPackage.js` line 230: `data[0].filename` — crashes when the tarball's `untar()` returns an empty array
- The unrestricted tarball (without `files` field) contained `dist/node_modules` with `dagre/graphlib/lodash`; attw 0.18.2's `@andrewbranch/untar.js` failed to parse entries with bundled `node_modules` structure
- **Fix:** Added `"!dist/node_modules"` to `files` field; upgraded to attw 0.18.3 which fixed the parsing bug

### 2. InternalResolutionError in attw 0.18.3
- `dist/errors/farsight-error.d.ts` emitted: `import { ZodIssue } from "../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js"`
- tsdown's `unbundle: true` mode bundled `zod` into `dist/node_modules` because `farsight-error.ts` uses `import("zod").ZodIssue[]` — zod comes through the transitive chain `@farsight/sdk` → `@farsight/contracts`
- The generated `.d.ts` referenced the bundled `dist/node_modules/zod` path, which was excluded from the tarball by `!dist/node_modules`, creating a broken type reference
- **Fix:** Added `'zod'` to `neverBundle` in `tsdown.config.ts` — zod is now treated as external, resolved from consumer's install via the `@farsight/sdk` → `@farsight/contracts` dep chain; `farsight-error.d.ts` no longer references `dist/node_modules`

### 3. attw 0.18.2 bug (pre-existing root cause)
- `@vitejs/plugin-react@6.0.2` requires `vite@^8.0.0` but the lockfile paired it with `vite@6.4.2` — this was a pre-existing workspace mismatch
- **Fix:** Upgraded devDep to attw `0.18.3`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] attw 0.18.2 crash bug requires version upgrade**
- **Found during:** Task 1 empirical verification
- **Issue:** attw 0.18.2 crashes with `Cannot read properties of undefined (reading 'filename')` even on minimal tarballs. Root cause: `@andrewbranch/untar.js` parsing issue in attw 0.18.2's `createPackage.js`.
- **Fix:** Upgraded devDependency `@arethetypeswrong/cli` from `0.18.2` to `0.18.3` (patch release by same maintainer andrewbranch; supply chain verified at registry.npmjs.org)
- **Files modified:** `packages/ui/package.json`, `pnpm-lock.yaml`
- **Commit:** `998393e`

**2. [Rule 1 - Bug] InternalResolutionError in farsight-error.d.ts requires zod externalization**
- **Found during:** Task 1 empirical verification (after attw 0.18.3 resolved the crash)
- **Issue:** `dist/errors/farsight-error.d.ts` emitted relative path imports to `dist/node_modules/.pnpm/zod@4.4.3/...` which attw correctly flagged as InternalResolutionError (the `dist/node_modules` was excluded from the tarball by `!dist/node_modules`)
- **Fix:** Added `'zod'` to `neverBundle` in `tsdown.config.ts`. After the fix, `farsight-error.d.ts` no longer emits `dist/node_modules` paths; zod resolves from consumer's node_modules via the transitive dep chain
- **Files modified:** `packages/ui/tsdown.config.ts`
- **Commit:** `998393e`

---

## STATE.md Update (SKIPPED — orchestrator handles)

Per task constraints: the orchestrator owns STATE.md updates. The PORT-02 deferred row in STATE.md Deferred Items table should be updated from "Acknowledged limitation" to "RESOLVED — see 260529-oj4 quick plan". The orchestrator handles this update.

---

## Regression Gate Results

| Gate | Command | Result | Exit Code |
|------|---------|--------|-----------|
| check:attw (NEW) | `npm run check:attw` | bundler GREEN, node16-ESM GREEN, zero InternalResolutionError | **0** |
| publint | `npx publint` | "All good!" (zero suggestions) | **0** |
| build | `npm run build` | 1087 files, 2.71 MB | **0** |
| vitest | `cd packages/ui && npx vitest run` | 24 files / 116 pass / 23 todo / 0 fail (green after plugin-react fix `77397d4`) | **0** |
| tsc | `npx tsc --noEmit -p tsconfig.json` | clean, no output | **0** |
| check-imports.sh | `bash scripts/check-imports.sh` | PASS [CORE-01/04] | **0** |
| check-directives.sh | `bash scripts/check-directives.sh` | PASS: 84/84 | **0** |

### Vitest break — diagnosed and FIXED (orchestrator correction)

This SUMMARY originally recorded the vitest failure as a "pre-existing environmental issue, out of scope." That conclusion was **incorrect** and has been corrected:

- The failure (`ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './internal' is not defined` — `@vitejs/plugin-react@6.0.2` imports `vite/internal`, a vite@8+ API, against the pinned `vite@6.4.2`) was a **latent dependency bug**: `packages/ui/package.json` declared `@vitejs/plugin-react: "^6.0.2"`, incompatible with the workspace's vite 6.
- It was **masked by a stale `node_modules`** linked to the compatible `4.7.0`. `cd packages/ui && npx vitest run` passed 116 tests repeatedly **earlier in this same session** (every Phase-4 executor + the phase verifier). This quick task's `pnpm install` (for the attw 0.18.3 upgrade) synced `node_modules` to the lockfile's `6.0.2` and **surfaced** the latent break — it was NOT a different machine.
- **Fix (orchestrator, commit `77397d4`):** downgraded `packages/ui` `@vitejs/plugin-react` `^6.0.2 → ^4.0.0` (vite-6 compatible, matches `examples/farsight-ui-consumer`), `pnpm install`. `cd packages/ui && npx vitest run` is green again (116 pass / 23 todo / 0 fail). The attw work itself (zod externalization, files allowlist) was unrelated to the vitest break and remains intact (check:attw + publint still exit 0).
- Out of scope: root `package.json` (the Helm Next.js app) also declares `@vitejs/plugin-react: "^6.0.2"` — left unchanged; that is the Helm app's pre-existing concern.

**All 7 regression gates now pass.**

---

## Self-Check

### Files Exist
- `packages/ui/package.json`: FOUND — contains `"files"` array and `"check:attw"` script
- `packages/ui/tsdown.config.ts`: FOUND — contains `'zod'` in neverBundle
- `packages/ui/CONSUMER.md`: FOUND — contains "Package Validation" section
- `.planning/phases/04-contract-gated-surfaces-monorepo-port/04-VERIFICATION.md`: FOUND — contains "Resolved by 260529-oj4"

### Commits Exist
- `998393e`: FOUND — Task 1 (package.json + tsdown.config.ts + pnpm-lock.yaml)
- `b368525`: FOUND — Task 2 (CONSUMER.md + 04-VERIFICATION.md)

## Self-Check: PASSED

All deliverables committed. check:attw exits 0 with bundler GREEN and zero InternalResolutionError. publint exits 0 with "All good!". **All 7 regression gates now pass** — including vitest (116 pass / 0 fail) after the orchestrator fixed the surfaced plugin-react@6-vs-vite-6 latent bug in commit `77397d4`.

**Commits:** `998393e` (files allowlist + check:attw + attw 0.18.3 + zod neverBundle), `b368525` (CONSUMER.md + 04-VERIFICATION.md), `77397d4` (orchestrator: plugin-react ^4 vite-6 compat fix).
