---
phase: 4
slug: contract-gated-surfaces-monorepo-port
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `04-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.7` + `@testing-library/react` (jsdom) — existing `packages/ui/vitest.config.ts` |
| **Quick run command** | `cd packages/ui && npx vitest run` |
| **Full suite command** | `cd packages/ui && npx vitest run && npx tsc --noEmit -p tsconfig.json && bash scripts/check-imports.sh && bash scripts/check-directives.sh` |
| **Port-readiness** | `cd packages/ui && npm run build && npx publint && npx @arethetypeswrong/cli packages/ui` + the `examples/` Vite app builds & renders |

Mock pattern (per Phase 3): wrap renders in a test `<FarsightProvider>` with a mocked `createApiClient({ fetchImpl })` returning contract-shaped fixtures.

---

## Per-Requirement Verification Map

| Req | Behavior | Test Type | Automated Command | File |
|-----|----------|-----------|-------------------|------|
| DSET-01 | `useDatasetsQueryOptions` returns typed Dataset list via mocked fetch; `enabled:!!projectSlug` guard | unit | `npx vitest run __tests__/hooks/use-datasets.test.ts` | W0 |
| DSET-01 | `useSearchDataset` calls `.../search`, returns discriminated union (backend: vectorize/none/ai_search) | unit | same | W0 |
| DSET-01 | `<DatasetList>` renders rows / EmptyState / ErrorState; RAG result renderer branches on `backend` | component | `npx vitest run __tests__/components/datasets.test.tsx` | W0 |
| PIPE-01 | `useWorkflow` fetches workflow + PipelineDefinition via mocked fetch | unit | `npx vitest run __tests__/hooks/use-workflows.test.ts` | W0 |
| PIPE-01 | `<WorkflowCanvas>` renders nodes+edges in jsdom (render-smoke); xyflow↔PipelineDefinition adapter round-trips | smoke | `npx vitest run __tests__/smoke/workflow-canvas.smoke.test.tsx` | W0 |
| PIPE-01 | `useRunWorkflow` calls `.../run`, returns run id | unit | `npx vitest run __tests__/hooks/use-workflows.test.ts` | W0 |
| PIPE-01 | xyflow CSS import order correct + edges visually render | visual (manual) | `examples/farsight-ui-consumer` in a browser | PORT-01 app |
| AGNT-01 | `useAgentMessagesQueryOptions` polls messages (paused off-tab) via mocked fetch | unit | `npx vitest run __tests__/hooks/use-agents.test.ts` | W0 |
| AGNT-01 | `useSubmitAgentMessage` calls POST submit | unit | same | W0 |
| AGNT-01 | `<AgentChatView>` renders user/assistant message list + composer (chat surface, per R-04) | component | `npx vitest run __tests__/components/agents.test.tsx` | W0 |
| DSET/PIPE/AGNT | rename a `@farsight/contracts` field → tsc error at hook call site (end-to-end type flow) | type-check | `npx tsc --noEmit -p tsconfig.json` | existing |
| PORT-01 | `import { Button }` → built bundle has NO xyflow/recharts chunks (tree-shaking) | build | `cd examples/farsight-ui-consumer && npm run build` + inspect `dist/assets/` | PORT-01 build |
| PORT-01 | tokens apply via `@source` (R-05 fix) + canvas edges render in the Vite app | visual (manual) | browser render of the Vite app | PORT-01 app |
| PORT-02 | `publint` exits 0 on Phase-4 dist | packaging | `cd packages/ui && npm run build && npx publint` | existing |
| PORT-02 | `@arethetypeswrong/cli` exits 0 | types | `npx @arethetypeswrong/cli packages/ui` | existing |
| PORT-02 | consumer-setup README + Farsight copy runbook exist + cover peers/@source/xyflow-order/provider | doc | file presence + section grep | W0/doc |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Key Validation Signals (load-bearing proofs)

1. **PORT-01 (the milestone payoff):** the `examples/` Vite app builds and renders in a real browser — tokens apply (R-05 `@source` fix works), a canvas surface shows visible edges (xyflow CSS order correct), and importing only `Button` produces a bundle with no xyflow/Recharts. This is the "consumable outside Helm" proof.
2. **PIPE-01 canvas binding:** `<WorkflowCanvas>` renders a mocked `PipelineDefinition` as xyflow nodes+edges (jsdom smoke); the bidirectional adapter assembles a valid `PipelineDefinition` on save (`client.workflows.update`) and `run` returns a run id. Reuse the contract's `validatePipelineGraph()`.
3. **DSET-01 RAG search:** search renders `backend`-discriminated results (vectorize matches with scores; none/ai_search branches), `enabled:!!projectSlug` prevents no-project queries.
4. **AGNT-01 chat (R-04):** chat view renders message history from `client.agents.messages`, submit posts via `client.agents.submit`, polling paused off-tab; scoped to a consumer-provided `agentDefinitionId` (no enumeration).
5. **End-to-end type flow:** `tsc --noEmit` clean; renaming a contract field breaks the hook call site.
6. **CI guards stay green:** `check-imports.sh` (no `next/*` introduced by the decoupled ports), `check-directives.sh`.

---

## Wave 0 Requirements

- [ ] `packages/ui/__tests__/hooks/use-datasets.test.ts` — DSET-01
- [ ] `packages/ui/__tests__/hooks/use-workflows.test.ts` — PIPE-01
- [ ] `packages/ui/__tests__/hooks/use-agents.test.ts` — AGNT-01
- [ ] `packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx` — PIPE-01 xyflow render-smoke
- [ ] `packages/ui/__tests__/components/datasets.test.tsx` — DSET-01
- [ ] `packages/ui/__tests__/components/agents.test.tsx` — AGNT-01 chat
- [ ] (pipelines component coverage folds into the smoke + hook tests)
- [ ] `examples/farsight-ui-consumer/` — scaffold the PORT-01 Vite workspace (workspace:* → built dist; own `@source` per R-05)
- [ ] Shared test fixtures for dataset/workflow/agent contract shapes (+ mock `fetchImpl` helper, reuse Phase-3 `__tests__/helpers/`)

**Open items the planner resolves (from RESEARCH open questions):** (a) concrete Farsight NodeId strings for the pipeline MVP node subset (registry not in contracts — check `apps/api/src/` or use documented placeholders); (b) whether the Helm root needs `pnpm-workspace.yaml` `examples/*` entry; (c) agent surface = chat (R-04, confirmed).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Vite app real-browser render (tokens + canvas edges + tree-shake) | PORT-01 | Needs a real browser/build, not jsdom | `cd examples/farsight-ui-consumer && npm run build && npm run preview` |
| Live round-trip vs `api.farsght.com` (real Clerk session) | DSET/PIPE/AGNT | Needs live auth + deployed endpoints | Carried to manual UAT / actual Farsight `apps/web` port |
| Physical copy into Farsight monorepo + apps/web consumption | PORT-02 | Deliberately deferred (runbook provided) | Follow the PORT-02 copy runbook manually |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
