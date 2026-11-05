---
phase: 04-contract-gated-surfaces-monorepo-port
plan: "06"
subsystem: ui
tags: [vite, workspace-protocol, tree-shaking, tsdown, xyflow, css-import-order, publint, attw, consumer-docs, PORT-01, PORT-02]

requires:
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-04 WorkflowCanvas + workflowKeys + pipeline surface"
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-05 AgentChatView + agent hooks"
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-01 examples/farsight-ui-consumer scaffold + index.css D-09/R-05 order"
  - phase: 03-adapter-seam-tenancy-notifications-proving-ground
    provides: "FarsightProvider + _test* bypass props + createApiClient seam"

provides:
  - "examples/farsight-ui-consumer: full PORT-01 Vite consumer wiring FarsightProvider + Button + WorkflowCanvas (seeded) + AgentChatView, consuming built dist via workspace:*"
  - "Button-only tree-shake probe (treeshake-probe.tsx + treeshake.html + vite.treeshake.config.ts + build:treeshake script) — EXECUTED D-05 proof: dist-treeshake/ has no xyflow/recharts"
  - "packages/ui/CONSUMER.md: consumer-setup guide + Farsight copy runbook (PORT-02)"
  - "check-directives.sh threshold updated 62 → 84 for Phase-4 dist"

affects: [farsight-monorepo-port, apps-web-consumption]

tech-stack:
  added: []
  patterns:
    - "PORT-01 dev mode: FarsightProvider mounted via _testClient/_testUserId/_testOrgSlug bypass props so the standalone Vite app needs no ClerkProvider for a visual-only proof"
    - "Canvas seeded via QueryClient.setQueryData(workflowKeys.detail(...)) so WorkflowCanvas renders nodes+edges without a live API"
    - "Tree-shake proof = a SEPARATE vite build entry (treeshake.html → treeshake-probe.tsx) importing ONLY Button, asserted by grep against dist-treeshake/assets/"

key-files:
  created:
    - examples/farsight-ui-consumer/src/treeshake-probe.tsx
    - examples/farsight-ui-consumer/treeshake.html
    - examples/farsight-ui-consumer/vite.treeshake.config.ts
    - packages/ui/CONSUMER.md
  modified:
    - examples/farsight-ui-consumer/src/App.tsx
    - examples/farsight-ui-consumer/package.json
    - packages/ui/scripts/check-directives.sh

key-decisions:
  - "FarsightProvider in the Vite app uses _test* bypass props (no ClerkProvider) — visual PORT-01 proof only; apps/web uses real Clerk getToken/useOrganization"
  - "WorkflowCanvas seeded via QueryClient cache (2 nodes + 1 edge) — renders edges without a live API call per D-03 (live round-trip is manual UAT)"
  - "check-directives.sh threshold set to the ACTUAL post-build count (84), not an estimate"
  - "attw exits 1 against the workspace symlink (dev src/-pointing exports) and crashes (exit 3) on the private packed tarball — documented as a deviation; bundler profile resolves the main entry, which is the only profile that matters for the Vite/apps-web consumer"

patterns-established:
  - "Standalone tree-shake assertion: dedicated vite config + HTML entry importing one primitive, grep-asserted against its dist output"
  - "Consumer @source must point at the consumed package's dist (npm) or src (workspace) — R-05 documented in CONSUMER.md"

requirements-completed: [PORT-01, PORT-02]

duration: 38min
completed: 2026-05-29
---

# Phase 04 Plan 06: PORT-01 Vite Consumer + PORT-02 Docs Summary

**External Vite app consumes @farsight/ui via workspace:* built dist — proves tree-shaking (Button-only build has no xyflow/recharts), token application (@source R-05), and canvas-edges-render (D-09 CSS order) in a real browser; CONSUMER.md + Farsight copy runbook ship for the monorepo port.**

## Performance

- **Duration:** ~38 min (across the checkpoint resume)
- **Started:** 2026-05-29T16:50:00Z
- **Completed:** 2026-05-29T17:10:00Z
- **Tasks:** 3 (Task 2 = human-verify checkpoint, APPROVED)
- **Files created:** 4
- **Files modified:** 3

## Accomplishments

- **PORT-01 Vite consumer (Task 1):** `examples/farsight-ui-consumer/src/App.tsx` wires four demo sections against the built `@farsight/ui` dist (`workspace:*`): (a) Button import proof, (b) `var(--color-primary)` token div, (c) WorkflowCanvas with a pre-seeded QueryClient (2 nodes + 1 edge, no live API), (d) AgentChatView EmptyState. `FarsightProvider` mounted via `_test*` bypass props so no ClerkProvider is required for the visual-only proof.
- **D-05 tree-shake proof EXECUTED (Task 1):** added `treeshake-probe.tsx` (imports ONLY `Button`), `treeshake.html`, `vite.treeshake.config.ts` (outDir `dist-treeshake/`), and a `build:treeshake` script. The autonomous assertion `! grep -rEi "xyflow|react-flow|recharts" dist-treeshake/assets/` PASSED — the Button-only bundle is 226 kB vs the main 753 kB bundle (which correctly includes xyflow for the canvas).
- **PORT-01 visual checkpoint APPROVED by user (Task 2):** in-browser at http://localhost:4173 — (a) Button tokens themed, (b) primary-color div green, (c) WorkflowCanvas shows 2 nodes with a visible SVG edge (xyflow CSS order correct, D-09), (d) AgentChatView empty state, (e) no console errors.
- **PORT-02 docs (Task 3):** `packages/ui/CONSUMER.md` with Installation (peer versions table), CSS Setup (locked import order + `@source` for dist/workspace, R-05), Provider Setup (ClerkProvider above FarsightProvider, projectSlug, getToken, Toaster once), Key Notes (tenant-isolation key, canvas CSS order, tree-shaking, canvas a11y), Available Surfaces table, and the Farsight Monorepo Copy Runbook (build → publint → attw → cp → workspace wire → install → apps/web wire → verify single React).
- **check-directives.sh threshold (Task 3):** built Phase-4 dist, counted actual `"use client"` `.js` files = **84**, updated `EXPECTED` from 62 → 84 with a Phase-4 attribution comment.

## Task Commits

1. **Task 1: Vite consumer + executed tree-shake proof** - `df421e7` (feat)
2. **Task 2: PORT-01 visual checkpoint** - APPROVED by user (no commit — human verification)
3. **Task 3: CONSUMER.md + check-directives threshold** - `36161c3` (docs)

**Plan metadata:** committed with SUMMARY + STATE + ROADMAP (docs: complete plan)

## Files Created/Modified

- `examples/farsight-ui-consumer/src/App.tsx` — full PORT-01 demo surface (modified from 04-01 scaffold)
- `examples/farsight-ui-consumer/src/treeshake-probe.tsx` — Button-only tree-shake entry
- `examples/farsight-ui-consumer/treeshake.html` — minimal Vite HTML entry for the probe
- `examples/farsight-ui-consumer/vite.treeshake.config.ts` — probe build → dist-treeshake/
- `examples/farsight-ui-consumer/package.json` — added `build:treeshake` script
- `packages/ui/CONSUMER.md` — consumer setup guide + Farsight copy runbook (PORT-02)
- `packages/ui/scripts/check-directives.sh` — threshold 62 → 84

## Decisions Made

- **FarsightProvider dev mode via `_test*` props:** the standalone Vite app has no Clerk session, so `FarsightProvider` is mounted with `_testClient` (a `createApiClient` with `getToken: async () => null`), `_testUserId`, and `_testOrgSlug` to bypass the Clerk hooks. This is acceptable for the PORT-01 visual-only proof; `apps/web` uses real Clerk `getToken`/`useOrganization` (documented in CONSUMER.md).
- **Canvas seeded from cache:** `QueryClient.setQueryData(workflowKeys.detail("demo-org","demo-project","demo-wf"), {... definition: 2 nodes + 1 edge ...})` so WorkflowCanvas renders edges without hitting the API — the live round-trip is manual UAT per D-03.
- **Threshold = actual count, not estimate:** the interfaces section estimated ~82; the real post-build count is 84.

## Deviations from Plan

### 1. [Rule 4 — Architectural / honest gate report] attw does NOT exit 0 on this private bundler-only package

- **Found during:** Task 3 (PORT-02 port-readiness gate)
- **Issue:** The plan's PORT-02 truth asserts `@arethetypeswrong/cli` exits 0. In reality:
  - `npx @arethetypeswrong/cli --pack packages/ui` (the Phase-1 canonical invocation, run from repo root) exits **1**. It resolves against the **workspace symlink's dev-time `exports`** (which point at `src/`, not `dist/`), producing 150 `InternalResolutionError`s (extensionless TS imports like `./lib/utils` fail node16 resolution from `src/index.ts`), 9 `NoResolution` (the `.css` subpath exports + `./lib/*` have no `.d.ts` — they are CSS/JS, not types), and 1 `CJSResolvesToESM`.
  - Running attw directly against the `pnpm pack` tarball (which DOES correctly apply `publishConfig.exports` → `dist/index.d.ts`/`dist/index.js`) **crashes** with exit 3 (`Cannot read properties of undefined (reading 'filename')`) — an attw 0.18.2 bug triggered by this `private: true` / vendored-`dist/node_modules` tarball shape.
- **Why not auto-fixed:** Making attw exit 0 would require architectural packaging changes outside this docs-plan's scope — e.g. emitting a CJS build + per-subpath `.d.ts`, restructuring the dev `exports` to also point at dist, or adding a CJS condition. The library is deliberately a **bundler-only, ESM-only, `moduleResolution: "bundler"`, `platform: "browser"`** package; the **bundler profile resolves the main `.` entry** (the only profile that matters for the Vite/`apps/web` consumer, which is the stated project constraint). This is a pre-existing packaging characteristic, NOT a regression introduced by 04-06 (zero changes were made to `package.json` exports, `tsdown.config.ts`, or any `.d.ts`).
- **Disposition:** Reported honestly rather than papered over (per execution constraint). The bundler-profile-green main entry + clean `publint` + the rendering Vite consumer satisfy the *intent* of D-07 (artifact is port-clean for a bundler consumer). The strict "attw exits 0 across all four profiles" bar is **not met** and is flagged for a future packaging plan if node16/node10 consumer support is ever required (it is not, per project constraints).
- **Files modified:** none (diagnostic only)

### 2. [Rule 1 — doc bug] `attw packages/ui` (without `--pack`) is not a valid invocation from inside packages/ui

- **Found during:** Task 3
- **Issue:** The plan listed `npx @arethetypeswrong/cli packages/ui` run from inside `packages/ui` — that path does not exist relative to that cwd (ENOENT).
- **Fix:** Used the Phase-1 canonical form `npx @arethetypeswrong/cli --pack packages/ui` from the repo root, and additionally packed + inspected the tarball directly to diagnose the resolution behavior.
- **Files modified:** none (invocation correction)

---

**Total deviations:** 2 (1 architectural/honest-gate report, 1 invocation correction)
**Impact on plan:** PORT-01 fully achieved (build + tree-shake + visual approval). PORT-02 docs + threshold + publint + the full vitest/tsc/check-imports/check-directives gate all pass. The single not-met bar is the strict cross-profile attw-exits-0, deferred with rationale.

## Issues Encountered

- attw 0.18.2 crashes on the private packed tarball (`reading 'filename'`) — a tooling bug, worked around by analyzing the `--pack` symlink run + manual tarball inspection. See Deviation 1.

## Verification Results

- **Task 1 — `pnpm --filter @farsight/ui build`:** exit 0 (1095 files, ~3s)
- **Task 1 — `pnpm build` (main app):** exit 0 (4254 modules, `dist/assets/index-*.js` 753 kB — xyflow present, expected for canvas)
- **Task 1 — `pnpm run build:treeshake`:** exit 0 (`dist-treeshake/assets/treeshake-*.js` 226 kB)
- **Task 1 — `! grep -rEi "xyflow|react-flow|recharts" dist-treeshake/assets/`:** PASS — "TREE-SHAKE PASS: no xyflow/recharts in Button-only build" (D-05)
- **Task 2 — PORT-01 visual checkpoint:** APPROVED by user (tokens + canvas edges + agent empty state + no console errors)
- **Task 3 — check-directives threshold:** 62 → 84 (actual post-build count)
- **Task 3 — `npx publint`:** exit 0 (one non-blocking suggestion: publishes internal tests/config)
- **Task 3 — `npx @arethetypeswrong/cli --pack packages/ui`:** exit 1 — see Deviation 1 (bundler profile green; node16/node10/css-subpath fail by design for a bundler-only private package)
- **Task 3 — `npx vitest run`:** exit 0 — 24 files passed, 2 skipped; 116 tests passed, 23 todo; no failures
- **Task 3 — `npx tsc --noEmit -p tsconfig.json`:** exit 0 (clean)
- **Task 3 — `bash scripts/check-imports.sh`:** PASS [CORE-01/04] — no next/*, @clerk/nextjs/server, alert(), confirm()
- **Task 3 — `bash scripts/check-directives.sh`:** PASS — 84 'use client' files in dist/ (expected >= 84)

## Known Stubs

None — the Vite consumer's seeded data is an intentional PORT-01 dev-mode visual proof (documented inline + in CONSUMER.md), not a stub blocking the plan goal. The `getToken: async () => null` and `_test*` props are the documented dev-mode mechanism; production `apps/web` wiring is documented in CONSUMER.md and is the deferred manual port step (D-06).

## Deferred (intentional, per phase context)

- **Physical copy into the Farsight monorepo** + `apps/web` wiring — documented in the CONSUMER.md runbook (D-06); not performed this phase ("prep here, then port").
- **Live-endpoint round-trip** (real Clerk session against `api.farsght.com`) — manual UAT (D-03), tracked in `04-VALIDATION.md`.
- **Strict cross-profile attw-exits-0** — see Deviation 1; deferred to a future packaging plan only if node16/node10 consumer support is required (not a project constraint).

## Threat Flags

No new threat surface beyond the plan's threat register:
- T-04-06-T1 (dev token returns null) — accepted; documented in CONSUMER.md that production uses real Clerk getToken
- T-04-06-T2 (check-directives threshold) — mitigated; threshold computed from actual dist count (84), not a guess
- T-04-06-R (publint/attw audit trail) — publint exit 0 captured; attw reported honestly per Deviation 1

## Next Phase Readiness

- Phase 4 is the final milestone phase. All five Phase-4 requirements (DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02) are delivered.
- `@farsight/ui` is proven consumable from an external Vite app via `workspace:*` built dist with correct tree-shaking, token application, and canvas rendering.
- Remaining work is the documented manual Farsight monorepo copy (runbook in CONSUMER.md) + manual live-API UAT — both intentionally outside this phase per D-03/D-06.

## Self-Check: PASSED

- `examples/farsight-ui-consumer/src/treeshake-probe.tsx` → FOUND
- `examples/farsight-ui-consumer/treeshake.html` → FOUND
- `examples/farsight-ui-consumer/vite.treeshake.config.ts` → FOUND
- `packages/ui/CONSUMER.md` → FOUND
- `packages/ui/scripts/check-directives.sh` → FOUND (threshold 84)
- `.planning/phases/04-contract-gated-surfaces-monorepo-port/04-06-SUMMARY.md` → FOUND
- Commit `df421e7` (Task 1) → present in git log
