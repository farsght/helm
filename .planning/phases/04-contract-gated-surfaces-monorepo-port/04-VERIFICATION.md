---
phase: 04-contract-gated-surfaces-monorepo-port
verified: 2026-05-29T17:22:00Z
status: human_needed
score: 5/5 requirements achieved; 4/5 success criteria fully verified, 1/5 human-verified
overrides_applied: 0
human_verification:
  - test: "Live-endpoint round-trip: mount the Vite consumer (or apps/web) with a real Clerk session and real api.farsght.com credentials, exercise DatasetList, WorkflowCanvas run, and AgentChatView submit/poll"
    expected: "Each surface completes its contract call, data renders, no console errors, run returns a runId, agent polling delivers messages"
    why_human: "Requires a live Clerk session + deployed api.farsght.com endpoints; cannot run in jsdom or without credentials (D-03 gate — intentionally deferred to manual UAT)"
  - test: "Physical monorepo copy: follow the CONSUMER.md runbook to copy packages/ui to ~/Projects/farsight-platform/packages/ui, wire workspace, install, wrap apps/web App root, and verify a single React version resolves"
    expected: "pnpm list react -r shows exactly one React version; apps/web renders @farsight/ui components without 'invalid hook call' errors"
    why_human: "D-06: physical copy deliberately deferred; requires manual filesystem + workspace wiring steps"
---

# Phase 04: Contract-Gated Surfaces & Monorepo Port — Verification Report

**Phase Goal:** Port datasets, pipelines, and agents surfaces onto Farsight contracts using the Phase-3 adapter seam; prove @farsight/ui is consumable as a workspace:* dependency from an external Vite app; ship a consumer-setup README.
**Verified:** 2026-05-29T17:22:00Z
**Status:** PASS-WITH-LIMITATIONS (human_needed for two intentionally-deferred manual UAT items; all automated gates pass)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Datasets list/detail + RAG search bound to Farsight datasets contracts | VERIFIED | `src/hooks/use-datasets.ts` wires `client.datasets.list/get/records/delete/search`; `enabled:!!orgSlug&&!!projectSlug` D-02 guard at line 45; `DatasetSearch` branches on `backend` discriminated union (vectorize/ai_search/none) at lines 138–175 of `dataset-search.tsx` |
| 2 | Pipelines xyflow canvas + run views render/operate on workflows/pipeline contracts; edges visible; xyflow CSS import-order locked | VERIFIED (automated + human) | `WorkflowCanvas` uses `toFlowNode/toDefinition/validatePipelineGraph` adapter; `useRunWorkflowMutation` calls `client.workflows.run`; canvas-kit has no `dist/style.css` import; `index.css` import order locked (tailwindcss → theme.css → xyflow/dist/style.css → @source); visual edge render APPROVED by user at browser checkpoint |
| 3 | Agents UI renders/operates on Farsight agents contracts (reconciled to chat surface per R-04: submit + poll messages) | VERIFIED | `use-agents.ts` wires `client.agents.messages` (2s poll) + `client.agents.submit`; `AgentChatView` renders message list + composer with `role="log" aria-live="polite"`; no canvas (D-10 amended; canvas-kit is pipelines-only) |
| 4 | External Vite app consuming workspace:* resolves utilities, applies tokens, renders canvases — validated outside Helm | VERIFIED (automated + human) | `examples/farsight-ui-consumer` resolves `@farsight/ui@workspace:*`; tree-shake proof: `build:treeshake` exit 0; `dist-treeshake/assets/` contains no xyflow/recharts strings; visual PORT-01 browser checkpoint APPROVED (tokens apply, canvas edges visible, agent empty state, no console errors) |
| 5 | Consumer-setup README documents peer versions, @source config, xyflow CSS import order, FarsightProvider mount; includes Farsight copy runbook | VERIFIED | `packages/ui/CONSUMER.md` (187 lines): Installation (peer versions table), CSS Setup (@source R-05 documented), Provider Setup (ClerkProvider → FarsightProvider pattern), Available Surfaces table, Farsight Monorepo Copy Runbook (5-step runbook with pnpm list react -r verification) |

**Score:** 5/5 truths verified (4 fully automated, 1 human-approved visual checkpoint)

### Deferred Items

Items not yet met but explicitly documented as intentional deferral per phase decisions.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live-endpoint round-trip (real Clerk session + api.farsght.com) | Manual UAT (post-phase) | D-03 explicitly defers live-endpoint automation to manual UAT; recorded in `04-VALIDATION.md` Manual-Only table |
| 2 | Physical copy into ~/Projects/farsight-platform + apps/web wiring | Manual step (runbook provided) | D-06 explicitly defers physical copy; CONSUMER.md Farsight Monorepo Copy Runbook is the deliverable |

---

## Per-Requirement Verdicts

| Requirement | Verdict | Key Evidence |
|-------------|---------|-------------|
| DSET-01 | ACHIEVED | `use-datasets.ts` (5 hooks, D-02 guard, SDK wiring); `DatasetList/Detail/Records/Search` components in `src/components/datasets/`; all in barrel `src/index.ts` lines 98–107; `vitest run use-datasets.test.ts` = 4 passed / 3 todo; `tsc --noEmit` clean |
| PIPE-01 | ACHIEVED | `use-workflows.ts` (6 hooks); `WorkflowCanvas` + `WorkflowList` + `WorkflowRunView` + 3 node components; canvas-kit 8 components; `pipeline-adapter.ts` (toFlowNode/toDefinition/validatePipelineGraph); no `dist/style.css` imports; barrel lines 109–138; smoke test 1 passed / 3 todo; visual checkpoint APPROVED |
| AGNT-01 | ACHIEVED (reconciled scope per R-04) | `use-agents.ts` (2s polling + submit); `AgentChatView` + `AgentMessage`; chat surface not canvas (D-10); barrel lines 140–146; `vitest run use-agents.test.ts` = 3 passed / 3 todo |
| PORT-01 | ACHIEVED | `examples/farsight-ui-consumer/` workspace package; `@farsight/ui: workspace:*` in `package.json:13`; `build:treeshake` exit 0; no xyflow/recharts in Button-only bundle (226 kB vs 753 kB full); `index.css` CSS order locked (tailwindcss → theme.css → xyflow/dist/style.css → @source); browser visual checkpoint APPROVED |
| PORT-02 | ACHIEVED | `packages/ui/CONSUMER.md` updated; `npm run check:attw` exits 0 (bundler GREEN, no InternalResolutionError); `publint` "All good!" (zero suggestions); `check-directives.sh` 84/84 pass; attw limitation resolved by 260529-oj4 |

---

## Independent Gate Results

### Gate 1: vitest run (packages/ui)

**Command:** `cd packages/ui && npx vitest run`
**Result:** 24 files passed | 2 skipped (26 total); 116 tests passed | 23 todo (139 total); 0 failures
**Notes:** 2 skipped files are xyflow-dependent smoke entries (expected per D-09; jsdom canvas limitation noted in output). `HTMLCanvasElement.getContext() not implemented` warnings are benign jsdom noise. No module-not-found errors — import-safe invariant holds.

### Gate 2: tsc --noEmit

**Command:** `cd packages/ui && npx tsc --noEmit -p tsconfig.json`
**Result:** exit 0 — clean (no output)

### Gate 3: check-imports.sh

**Command:** `bash packages/ui/scripts/check-imports.sh`
**Result:** `PASS [CORE-01/04]: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src`
**Notes:** Framework-agnostic constraint holds across all Phase-4 files. The `dangerouslySetInnerHTML` found in `src/components/ui/chart.tsx:96` is pre-existing (Phase-2 port, commit `3fab918`) and is NOT in any Phase-4 file; Phase-4 files (datasets/pipelines/agents) are all clean on this check.

### Gate 4: check-directives.sh

**Command:** `bash packages/ui/scripts/check-directives.sh`
**Result:** `PASS: 84 'use client' file(s) in dist/ (expected >= 84)` — threshold updated from 62 to 84 in commit `36161c3` to match actual Phase-4 dist count.

### Gate 5: Barrel completeness

All required Phase-4 exports confirmed in `src/index.ts`:

| Export | Line | Status |
|--------|------|--------|
| `DatasetList` | 102 | PRESENT |
| `DatasetDetail` | 104 | PRESENT |
| `DatasetSearch` | 107 | PRESENT |
| `DatasetRecords` | 106 | PRESENT |
| `datasetKeys` + 5 hooks | 99 | PRESENT |
| `WorkflowList` | 113 | PRESENT |
| `WorkflowCanvas` | 115 | PRESENT |
| `WorkflowRunView` | 117 | PRESENT |
| `workflowKeys` + 6 hooks | 110 | PRESENT |
| `CanvasFlow` | 127 | PRESENT |
| `autoLayout` | 138 | PRESENT |
| `AgentChatView` | 144 | PRESENT |
| `AgentMessage` | 146 | PRESENT |
| `agentKeys` + 2 hooks | 141 | PRESENT |

No barrel-export-trap omissions found.

### Gate 6: Framework-agnostic spot check

**Command:** `grep -rn "next/|@clerk/nextjs/server|useRouter|apiFetch|dangerouslySetInnerHTML" packages/ui/src/`
**Result:** Only match is `chart.tsx:96` (pre-existing Phase-2 component, not modified in Phase 4). All Phase-4 files (hooks/datasets/pipelines/agents/canvas-kit) are clean.

### Gate 7: xyflow CSS import — no dist/style.css in package source

**Command:** `grep -rn "dist/style.css" packages/ui/src/`
**Result:** exit 1 (no matches) — PASS. The canvas-kit and workflow-canvas files contain no xyflow CSS import as required by D-09.

### Gate 8: PORT-01 tree-shake proof

**Command:** `cd examples/farsight-ui-consumer && pnpm run build:treeshake`
**Result:** exit 0 — `dist-treeshake/assets/treeshake-*.js` = 226 kB (vs 753 kB full build). `! grep -rEi "xyflow|react-flow|recharts" dist-treeshake/assets/` = PASS. Button-only bundle excludes xyflow and recharts.

### Gate 9: publint

**Command:** `cd packages/ui && npx publint`
**Result:** exit 0. One non-blocking suggestion: package publishes internal tests/config files (can use `pkg.files` to scope). No blocking issues.

### Gate 10: @arethetypeswrong/cli (attw)

**Command (original):** `npx @arethetypeswrong/cli --pack packages/ui` (from repo root)
**Exit code (original):** 1

**Resolved by 260529-oj4:** Added `files` allowlist + `check:attw` script using `pnpm pack` + `--profile esm-only --exclude-entrypoints theme.css styles/globals.css`. `npm run check:attw` now exits 0 with bundler profile green. See CONSUMER.md § Package Validation.

**Command (updated):** `npm run check:attw` (in packages/ui)
**Exit code:** 0

Root causes fixed:
- attw 0.18.2 had a tarball parsing bug (`data[0].filename` crash); upgraded to 0.18.3.
- `zod` was bundled into `dist/node_modules` via transitive dep chain (`@farsight/sdk` → `@farsight/contracts`), causing `farsight-error.d.ts` to emit relative paths to `dist/node_modules` that attw saw as InternalResolutionError. Fixed by externalizing `zod` in `tsdown.config.ts neverBundle`.
- `dist/node_modules` (dagre/graphlib/lodash) excluded from tarball via `!dist/node_modules` in `files` field.

---

## attw Assessment

`npm run check:attw` exits 0 — all profiles for the target consumer are green.

**What the check covers:**

| Profile | Status | Reason |
|---------|--------|--------|
| `bundler` (main `.`) | GREEN | The only consumer profile that matters per project constraint ("framework-agnostic React consumed by a Vite/React apps/web"). |
| `node16 (from ESM)` | GREEN (ESM) | ESM-only package correctly identified. |
| `node10`, `node16-CJS` | ignored (by design) | Library is deliberately ESM-only, `moduleResolution: "bundler"`, `platform: "browser"`. CJS support is not a project requirement. `--profile esm-only` excludes these. |
| `./theme.css`, `./styles/globals.css` | excluded (by design) | CSS subpath exports have no `.d.ts` — excluded via `--exclude-entrypoints theme.css styles/globals.css`. |

**The check uses `pnpm pack`** (not `npm pack`) so that `publishConfig.exports` is applied — the tarball attw reads contains the real `dist/index.d.ts`. No `--ignore-rules` flags are used; the exit-0 is earned by a genuinely clean dist.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/src/hooks/use-datasets.ts` | datasetKeys + 5 hooks | VERIFIED | 152 lines; real SDK wiring; D-02 guard at line 45 |
| `packages/ui/src/hooks/use-workflows.ts` | workflowKeys + 6 hooks | VERIFIED | Real SDK wiring; `enabled:!!orgSlug&&!!projectSlug` guard |
| `packages/ui/src/hooks/use-agents.ts` | agentKeys + 2 hooks | VERIFIED | 2s polling; `client.agents.messages/submit` wiring |
| `packages/ui/src/components/datasets/dataset-list.tsx` | DatasetList with DataTable + ConfirmDialog | VERIFIED | 200+ lines; DataTable columns for Farsight shape; ConfirmDialog delete |
| `packages/ui/src/components/datasets/dataset-detail.tsx` | DatasetDetail with Tabs | VERIFIED | Tabs for Records + Search; back button via `onNavigate` |
| `packages/ui/src/components/datasets/dataset-records.tsx` | DatasetRecords DataTable | VERIFIED | three-branch loading/error/empty |
| `packages/ui/src/components/datasets/dataset-search.tsx` | DatasetSearch discriminated union | VERIFIED | Branches on `backend: vectorize/ai_search/none` at lines 138–175 |
| `packages/ui/src/components/pipelines/workflow-canvas.tsx` | WorkflowCanvas (real, not stub) | VERIFIED | CanvasFlow + adapter + save/run mutations; NODE_TYPES at module scope |
| `packages/ui/src/components/pipelines/workflow-list.tsx` | WorkflowList card list | VERIFIED | onNavigate/onCreateWorkflow props; no next/* |
| `packages/ui/src/components/pipelines/workflow-run-view.tsx` | WorkflowRunView | VERIFIED | aria-live; status copy; Dismiss button |
| `packages/ui/src/components/pipelines/nodes/source-node.tsx` | SourceNode | VERIFIED | chart-1 accent; no hex |
| `packages/ui/src/components/pipelines/nodes/transform-node.tsx` | TransformNode | VERIFIED | chart-2 accent |
| `packages/ui/src/components/pipelines/nodes/sink-node.tsx` | SinkNode | VERIFIED | chart-3 accent |
| `packages/ui/src/components/canvas-kit/canvas-flow.tsx` | CanvasFlow | VERIFIED | ReactFlowProvider + ReactFlow wrapper; no CSS import |
| `packages/ui/src/components/canvas-kit/auto-layout.ts` | autoLayout (dagre) | VERIFIED | pure function; no hooks |
| `packages/ui/src/components/pipelines/pipeline-adapter.ts` | toFlowNode + toDefinition + validatePipelineGraph re-export | VERIFIED | schemaVersion: 1 literal enforced |
| `packages/ui/src/components/pipelines/node-ids.ts` | NODE_IDS constants | VERIFIED | 3 verified Farsight NodeId strings |
| `packages/ui/src/components/agents/agent-chat-view.tsx` | AgentChatView (real, not stub) | VERIFIED | role="log" aria-live; Ctrl+Enter; polling; three-branch |
| `packages/ui/src/components/agents/agent-message.tsx` | AgentMessage role-based | VERIFIED | user/assistant/system variants; React text nodes only (no XSS) |
| `packages/ui/src/index.ts` | All Phase-4 exports registered | VERIFIED | Lines 98–146 contain all datasets/workflows/canvas-kit/agents exports |
| `examples/farsight-ui-consumer/` | Full PORT-01 Vite app | VERIFIED | workspace:* resolved; tree-shake proof executed; CSS order locked |
| `packages/ui/CONSUMER.md` | Consumer guide + copy runbook | VERIFIED | 187 lines; 6 sections; all required topics present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dataset-list.tsx` | `use-datasets.ts` | `useDatasetsQueryOptions` import | WIRED | Line 16 of `dataset-list.tsx` |
| `use-datasets.ts` | `@farsight/sdk` | `client.datasets.list/get/records/delete/search` | WIRED | Lines 49, 71, 94, 116, 139 |
| `workflow-canvas.tsx` | `use-workflows.ts` | `useWorkflowQueryOptions/useUpdateWorkflowMutation/useRunWorkflowMutation` | WIRED | Lines 33–36 |
| `workflow-canvas.tsx` | `pipeline-adapter.ts` | `toFlowNode/toDefinition/validatePipelineGraph` | WIRED | Line 26; used at lines 98, 179, 183 |
| `use-workflows.ts` | `@farsight/sdk` | `client.workflows.list/get/create/update/run/remove` | WIRED | Lines 48, 70, 91, 121, 148, 164 |
| `agent-chat-view.tsx` | `use-agents.ts` | `useAgentMessagesQueryOptions/useSubmitAgentMessage` | WIRED | Line 29 |
| `use-agents.ts` | `@farsight/sdk` | `client.agents.messages/submit` | WIRED | Lines 58, 83 |
| `examples/farsight-ui-consumer/package.json` | `packages/ui` | `@farsight/ui: workspace:*` | WIRED | `package.json:13` |
| `examples/farsight-ui-consumer/src/index.css` | `@farsight/ui/theme.css` | `@import "@farsight/ui/theme.css"` | WIRED | Line 2; import order matches D-09 lock |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `DatasetList` | `data` (datasets array) | `useDatasetsQueryOptions` → `client.datasets.list` | Real API call (mocked in tests; live in production) | FLOWING |
| `DatasetSearch` | `searchMutation.data` | `useSearchDatasetMutation` → `client.datasets.search` | Real API call with discriminated union return | FLOWING |
| `WorkflowCanvas` | `workflow` (with definition) | `useWorkflowQueryOptions` → `client.workflows.get` | Real API call; adapter maps to xyflow state | FLOWING |
| `AgentChatView` | `messages` | `useAgentMessagesQueryOptions` → `client.agents.messages` (2s poll) | Real API call | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vitest suite (no module-not-found) | `cd packages/ui && npx vitest run` | 24 passed, 2 skipped, 116 passed, 23 todo | PASS |
| tsc clean | `npx tsc --noEmit -p tsconfig.json` | exit 0 | PASS |
| no next/* imports | `bash scripts/check-imports.sh` | PASS [CORE-01/04] | PASS |
| use client threshold | `bash scripts/check-directives.sh` | 84/84 | PASS |
| tree-shake: Button-only no xyflow | `pnpm run build:treeshake && ! grep xyflow dist-treeshake/assets/` | exit 0; no matches | PASS |
| publint | `npx publint` | exit 0 (1 non-blocking suggestion) | PASS |
| attw bundler profile | `npm run check:attw` (packages/ui) | exit 0; bundler: GREEN; node16-ESM: GREEN; node10/CJS: ignored (esm-only profile); CSS: excluded | PASS (resolved by 260529-oj4) |

### Probe Execution

No probe scripts declared for this phase. Step 7c: SKIPPED (no `scripts/*/tests/probe-*.sh` for Phase 4).

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DSET-01 | 04-02 | Browse datasets list/detail + RAG search on Farsight datasets contracts | SATISFIED | `use-datasets.ts` + 4 dataset components; barrel registered; tests green |
| PIPE-01 | 04-03, 04-04 | Pipelines canvas + run views on workflows/pipeline contracts; edges visible; CSS order locked | SATISFIED | canvas-kit + WorkflowCanvas + adapter + no CSS import in source; visual APPROVED |
| AGNT-01 | 04-05 | Agents chat surface (R-04 reconciled): submit + poll messages | SATISFIED | `use-agents.ts` polling + `AgentChatView`; barrel registered |
| PORT-01 | 04-01, 04-06 | External Vite app consuming workspace:* resolves, applies tokens, renders canvases | SATISFIED | `examples/farsight-ui-consumer` built + tree-shake proved + visual APPROVED |
| PORT-02 | 04-06 | Consumer-setup README + Farsight copy runbook | SATISFIED | `CONSUMER.md` updated with Package Validation section; `npm run check:attw` exits 0 (bundler GREEN); publint "All good!"; copy runbook present; attw limitation resolved by 260529-oj4 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/ui/chart.tsx` | 96 | `dangerouslySetInnerHTML` | INFO | Pre-existing Phase-2 component (commit `3fab918`); not modified in Phase 4; unrelated to Phase-4 surfaces |
| `examples/farsight-ui-consumer/src/App.tsx` | 88,94 | Comment referencing dev `_test*` bypass; note about production wiring | INFO | Intentional dev-mode mechanism documented in CONSUMER.md; not a stub — production path is documented |

No TBD/FIXME/XXX debt markers found in any Phase-4-modified source files. No unresolved stub throws or null-return components in production paths.

---

## Human Verification Required

### 1. Live-Endpoint Round-Trip UAT

**Test:** Mount the Vite consumer (or a local apps/web build) with a real Clerk session and `VITE_API_BASE_URL=https://api.farsght.com`. Navigate to the dataset list, trigger a RAG search, open or create a workflow in WorkflowCanvas and click Run, and open AgentChatView and send a message.
**Expected:** Each surface completes its contract call with real data. DatasetList shows actual datasets. RAG search returns a discriminated-union result. WorkflowCanvas Run returns a `runId` and WorkflowRunView shows "Run queued". AgentChatView delivers a message reply within ~2s of polling.
**Why human:** Requires a live Clerk session + deployed api.farsght.com endpoints; cannot run in jsdom or without credentials. D-03 explicitly defers this to manual UAT. Tracked in `04-VALIDATION.md` Manual-Only table.

### 2. Physical Farsight Monorepo Copy

**Test:** Follow the CONSUMER.md "Farsight Monorepo Copy Runbook" — run `cp -r packages/ui ~/Projects/farsight-platform/packages/ui`, edit `farsight-platform/pnpm-workspace.yaml`, run `pnpm install`, add `@farsight/ui: workspace:*` to apps/web, add CSS imports, wrap App root, then run `pnpm list react -r`.
**Expected:** `pnpm list react -r` shows exactly one React version. apps/web renders at least one @farsight/ui component without an "invalid hook call" error. `FarsightProvider` mounts successfully with Clerk `useAuth` / `useOrganization` in the apps/web context.
**Why human:** D-06 explicitly defers the physical copy to a documented manual step. The runbook is the deliverable; the actual copy requires filesystem operations and workspace wiring in the separate Farsight repo.

---

## Overall Phase Verdict

**PASS-WITH-LIMITATIONS**

All five Phase-4 requirements (DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02) are delivered with full automated evidence and where applicable human-approved visual confirmation. The status is `human_needed` due to two intentionally deferred items (live-endpoint round-trip per D-03; physical monorepo copy per D-06) that were never in-scope for automated verification — they are documented in `04-VALIDATION.md` and `04-CONTEXT.md` as manual-UAT-only.

The single packaging limitation (attw exit 1) is pre-existing from Phase 1 (CSS subpath exports with no `.d.ts`; node10/CJS profiles not supported by design) and does not affect the bundler-profile consumer that `apps/web` will be. `publint` exits 0 and the Vite consumer renders correctly.

No blocking defects found. No debt markers (TBD/FIXME/XXX) in Phase-4 files. All CI guards pass at their updated thresholds.

---

*Verified: 2026-05-29T17:22:00Z*
*Verifier: Claude (gsd-verifier)*
