---
phase: 04-contract-gated-surfaces-monorepo-port
plan: 01
subsystem: testing
tags: [vitest, tanstack-query, vite, pnpm-workspace, xyflow, test-harness, stubs]

# Dependency graph
requires:
  - phase: 03-adapter-seam-tenancy-notifications-proving-ground
    provides: "FarsightProvider seam + TestProvider/mock-fetch helpers + Phase-3 Wave-0 import-safe-stub precedent (use-webhooks.ts)"
provides:
  - "6 import-safe source stubs at final paths (use-datasets.ts, use-workflows.ts, use-agents.ts, workflow-canvas.tsx, dataset-list.tsx, agent-chat-view.tsx) exporting shaped key factories + throwing/no-op placeholders"
  - "6 Nyquist test stub files covering DSET-01/PIPE-01/AGNT-01 with concrete key-factory tests + it.todo behavior stubs"
  - "examples/farsight-ui-consumer Vite workspace package resolving @farsight/ui via workspace:*"
  - "Root pnpm-workspace.yaml registering packages/*, examples/*, and external farsight-platform sdk+contracts"
affects: [04-02 datasets, 04-04 pipelines, 04-05 agents, 04-06 port-verification]

# Tech tracking
tech-stack:
  added: [vite@^6, "@vitejs/plugin-react@^4", "@tailwindcss/vite@^4 (examples/ devDeps only)"]
  patterns:
    - "Import-safe Wave-0 stub: test files import key factories LIVE from real source paths; minimal source stubs make imports resolve so vitest never module-not-fails"
    - "Source stubs export real, correctly-shaped key factories + throwing hook placeholders + null-returning component placeholders; fleshed out by later plans"

key-files:
  created:
    - packages/ui/src/hooks/use-datasets.ts
    - packages/ui/src/hooks/use-workflows.ts
    - packages/ui/src/hooks/use-agents.ts
    - packages/ui/src/components/pipelines/workflow-canvas.tsx
    - packages/ui/src/components/datasets/dataset-list.tsx
    - packages/ui/src/components/agents/agent-chat-view.tsx
    - packages/ui/__tests__/hooks/use-datasets.test.ts
    - packages/ui/__tests__/hooks/use-workflows.test.ts
    - packages/ui/__tests__/hooks/use-agents.test.ts
    - packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx
    - packages/ui/__tests__/components/datasets.test.tsx
    - packages/ui/__tests__/components/agents.test.tsx
    - examples/farsight-ui-consumer/package.json
    - examples/farsight-ui-consumer/vite.config.ts
    - examples/farsight-ui-consumer/index.html
    - examples/farsight-ui-consumer/src/index.css
    - examples/farsight-ui-consumer/src/main.tsx
    - examples/farsight-ui-consumer/src/App.tsx
    - pnpm-workspace.yaml
  modified: []

key-decisions:
  - "src/index.ts intentionally NOT touched — barrel registration ownership stays with the flesh-out plans (04-02/04-04/04-05) per the tsdown barrel-export trap discipline"
  - "Root pnpm-workspace.yaml must also list ../farsight-platform/packages/sdk + contracts — packages/ui depends on them via workspace:*, and root-level resolution otherwise fails ERR_PNPM_WORKSPACE_PKG_NOT_FOUND"
  - "The 6 source stubs are deliberately overwritten by 04-02/04-04/04-05 flesh-out plans; key-factory shapes are LOCKED now so test cache keys never change"

patterns-established:
  - "Pattern 1: Import-safe Wave-0 mirrors Phase-3 (commit fdacc22) — live top-level imports + real source stubs keep vitest clean before any production code lands"
  - "Pattern 2: Key factories are pure functions tested directly (no mounted hook) so concrete Wave-0 tests pass while deeper behavior stays it.todo"

requirements-completed: [DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02]

# Metrics
duration: 35min
completed: 2026-05-29
---

# Phase 4 Plan 01: Wave-0 Test Harness & Vite Consumer Scaffold Summary

**Import-safe Nyquist harness — 6 test stubs with live key-factory imports backed by 6 real-path source stubs (shaped key factories + throwing/null placeholders), plus the examples/farsight-ui-consumer Vite workspace resolving @farsight/ui via workspace:\***

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-05-29
- **Tasks:** 2
- **Files created:** 19

## Accomplishments

- 6 import-safe source stubs at their final paths so the live test imports resolve with zero `Cannot find module`: `use-datasets.ts` (`datasetKeys`), `use-workflows.ts` (`workflowKeys`), `use-agents.ts` (`agentKeys`) each export real, correctly-shaped key factories plus throwing hook placeholders; `workflow-canvas.tsx`, `dataset-list.tsx`, `agent-chat-view.tsx` are `"use client"` components returning `null`.
- 6 Nyquist test stub files — concrete passing key-factory assertions (org/project/wf/agent scoping + tenant isolation) plus `it.todo` stubs for every deeper behavior (queryOptions enabled-guard, mutations, polling interval, render branches), to be promoted by 04-02/04-04/04-05.
- `examples/farsight-ui-consumer` Vite workspace package scaffolded: `package.json` with `@farsight/ui: workspace:*` + required peers, `vite.config.ts` (tailwindcss + react plugins), `index.html`, locked `index.css` CSS order (tailwindcss → theme.css → xyflow/dist/style.css → `@source` R-05 fix), `main.tsx`, and `App.tsx` importing `Button` from `@farsight/ui` (proves dist entry point) under a `QueryClientProvider` stub.
- Root `pnpm-workspace.yaml` created registering `packages/*`, `examples/*`, and the external farsight-platform `sdk` + `contracts`; `pnpm ls --filter @farsight/ui-consumer-example` confirms `@farsight/ui@link:../../packages/ui`.

## Task Commits

1. **Task 1: Test harness stubs + import-safe source stubs (all 3 surfaces)** — `c62c3c7` (feat)
2. **Task 2: examples/farsight-ui-consumer Vite scaffold + root workspace registration** — `89a907f` (feat)

**Plan metadata:** this SUMMARY (docs)

_Note: This plan's tasks are scaffolding (Wave 0); the TDD `tdd="true"` on Task 1 is satisfied by concrete key-factory tests passing while behavior tests remain `it.todo` — promoted to live RED/GREEN by the source-creating plans._

## Files Created/Modified

**Source stubs (overwritten by later plans):**
- `packages/ui/src/hooks/use-datasets.ts` — `datasetKeys` (all/list/detail/records) + throwing hook placeholders (04-02)
- `packages/ui/src/hooks/use-workflows.ts` — `workflowKeys` (all/list/detail) + throwing hook placeholders (04-04)
- `packages/ui/src/hooks/use-agents.ts` — `agentKeys.messages` + throwing hook placeholders (04-05)
- `packages/ui/src/components/pipelines/workflow-canvas.tsx` — `WorkflowCanvas` returns null (04-04); no xyflow CSS import
- `packages/ui/src/components/datasets/dataset-list.tsx` — `DatasetList` returns null (04-02)
- `packages/ui/src/components/agents/agent-chat-view.tsx` — `AgentChatView` returns null (04-05)

**Test stubs:**
- `packages/ui/__tests__/hooks/use-datasets.test.ts` — DSET-01 key tests + it.todo behavior stubs
- `packages/ui/__tests__/hooks/use-workflows.test.ts` — PIPE-01 key tests + it.todo behavior stubs
- `packages/ui/__tests__/hooks/use-agents.test.ts` — AGNT-01 key tests + it.todo behavior stubs
- `packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx` — PIPE-01 jsdom render-smoke it.todo + import-resolves check
- `packages/ui/__tests__/components/datasets.test.tsx` — DSET-01 component render it.todo stubs
- `packages/ui/__tests__/components/agents.test.tsx` — AGNT-01 chat component render it.todo stubs

**examples/ Vite scaffold + workspace:**
- `examples/farsight-ui-consumer/{package.json,vite.config.ts,index.html,src/index.css,src/main.tsx,src/App.tsx}`
- `pnpm-workspace.yaml` (Helm root) — packages/*, examples/*, external farsight sdk+contracts

## Decisions Made

- **src/index.ts left untouched** — barrel registration is owned by the flesh-out plans (04-02/04-04/04-05). Wave-0 stubs are import targets for tests only; registering them now would expose throwing/null placeholders in the public API.
- **Root pnpm-workspace.yaml includes the external farsight-platform sdk + contracts** — packages/ui declares `@farsight/sdk`/`@farsight/contracts` as `workspace:*`; without those paths in the root workspace, `pnpm install` from the Helm root fails `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. (See Deviations.)
- **Key-factory shapes locked at Wave 0** so query cache keys stay stable when the flesh-out plans replace the stubs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root pnpm-workspace.yaml needed the external farsight-platform package paths**
- **Found during:** Task 2 (workspace resolution verification)
- **Issue:** The plan specified `packages: ['packages/*', 'examples/*']` only. With that alone, `pnpm install --filter @farsight/ui-consumer-example` failed: `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND — "@farsight/contracts@workspace:*" is in the dependencies but no package named "@farsight/contracts" is present in the workspace`. packages/ui declares the Farsight sdk/contracts as `workspace:*`, and the existing packages/ui-level `pnpm-workspace.yaml` resolved them via `../../../farsight-platform/packages/...`. Promoting workspace resolution to the Helm root meant the root file had to also list those external packages.
- **Fix:** Added `- '../farsight-platform/packages/sdk'` and `- '../farsight-platform/packages/contracts'` to the root `pnpm-workspace.yaml`.
- **Files modified:** `pnpm-workspace.yaml`
- **Verification:** `pnpm install --filter @farsight/ui-consumer-example` completes; `pnpm ls --filter @farsight/ui-consumer-example` shows `@farsight/ui@link:../../packages/ui`.
- **Committed in:** `89a907f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the PORT-01 workspace-resolution acceptance criterion to pass. No scope creep — same external package paths the packages/ui-level workspace already used, just lifted to the root file that now owns resolution.

## Issues Encountered

None beyond the workspace-path deviation above. The package-legitimacy concern flagged in the threat model (vite, @vitejs/plugin-react, @tailwindcss/vite as `[ASSUMED]`) resolved cleanly — all three are official, high-download ecosystem tools and installed without incident; no slopsquat substitution was attempted.

## Known Stubs

All 6 source stubs are **intentional** Wave-0 import targets, documented in-file (`// 04-01 import-safe stub. Fleshed out in 04-0N`):
- `use-datasets.ts` / `dataset-list.tsx` → fleshed out in **04-02** (DSET-01)
- `use-workflows.ts` / `workflow-canvas.tsx` → fleshed out in **04-04** (PIPE-01)
- `use-agents.ts` / `agent-chat-view.tsx` → fleshed out in **04-05** (AGNT-01)

These do NOT block the plan goal — the plan's goal is the import-safe harness itself. None are registered in `src/index.ts`, so no throwing/null placeholder leaks into the public API. The `App.tsx` canvas mount is a documented placeholder (`// TODO Plan 04-06: wire FarsightProvider + ClerkProvider`).

## User Setup Required

None — no external service configuration required. (FarsightProvider/Clerk wiring for the Vite app is deferred to Plan 04-06.)

## Next Phase Readiness

- Wave-0 harness is in place: 04-02 (datasets), 04-03 (canvas-kit), 04-04 (pipelines), 04-05 (agents) can now verify each task against the failing/`it.todo` test foundation and promote stubs to live assertions.
- examples/farsight-ui-consumer resolves `@farsight/ui` via `workspace:*`; 04-06 can wire FarsightProvider + ClerkProvider and run the PORT-01 tree-shaking + edge-render proofs.
- Verification status (verified by orchestrator): `cd packages/ui && npx vitest run` → 24 files pass, 114 tests + 25 todo, 0 failures, no module-not-found; `check-imports.sh` PASS; `check-directives.sh` PASS (62). check-directives threshold is NOT bumped here — 04-06 owns the Phase-4 bump.

## Self-Check: PASSED

All 19 created files verified present on disk; both task commits (`c62c3c7`, `89a907f`) verified in git history.

---
*Phase: 04-contract-gated-surfaces-monorepo-port*
*Completed: 2026-05-29*
