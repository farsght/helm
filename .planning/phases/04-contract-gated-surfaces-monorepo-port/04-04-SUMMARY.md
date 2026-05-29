---
phase: 04-contract-gated-surfaces-monorepo-port
plan: "04"
subsystem: ui
tags: [xyflow, react-flow, pipelines, workflows, farsight-contracts, pipeline-definition, canvas-kit, PIPE-01]

requires:
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-03 canvas-kit primitives + pipeline-adapter + node-ids"
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-02 dataset surface + Phase-3 seam (FarsightProvider, useFarsightContext)"

provides:
  - use-workflows.ts: workflowKeys factory + 6 hooks (query options + mutations) bound to client.workflows.*
  - WorkflowList: three-branch card list of Workflow items; onNavigate + onCreateWorkflow props
  - SourceNode / TransformNode / SinkNode: memo xyflow custom nodes with chart-1/2/3 accent strips
  - WorkflowRunView: inline run status card with aria-live + dismiss
  - WorkflowCanvas: full xyflow editing surface; bidirectional PipelineDefinition adapter; save+run mutations
  - pipelines/index.ts: surface barrel for all pipeline exports
  - src/index.ts: workflow hooks + workflow surfaces + canvas-kit blocks registered

affects: [PORT-01-vite-consumer, PORT-02-consumer-readme]

tech-stack:
  added: []
  patterns:
    - "WorkflowCanvas: NODE_TYPES object defined at module scope (not inside render) per xyflow memoization requirement"
    - "validatePipelineGraph: returns string[] (empty = valid) — not { valid, errors } shape"
    - "CanvasInspector: requires open: boolean prop — always rendered, visibility controlled by prop"
    - "Pipeline node components: memo + displayName; no hardcoded hex; chart-1/2/3 accent strips"
    - "useRunWorkflowMutation: fire-and-forget 202 Accepted; no cache invalidation (no polling endpoint)"
    - "useUpdateWorkflowMutation: onSettled invalidates detail key for the updated wfSlug"

key-files:
  created:
    - packages/ui/src/components/pipelines/workflow-list.tsx
    - packages/ui/src/components/pipelines/workflow-run-view.tsx
    - packages/ui/src/components/pipelines/nodes/source-node.tsx
    - packages/ui/src/components/pipelines/nodes/transform-node.tsx
    - packages/ui/src/components/pipelines/nodes/sink-node.tsx
    - packages/ui/src/components/pipelines/index.ts
  modified:
    - packages/ui/src/hooks/use-workflows.ts (stub → real implementation)
    - packages/ui/src/components/pipelines/workflow-canvas.tsx (stub → real implementation)
    - packages/ui/src/index.ts (appended workflow + canvas-kit barrel blocks)

decisions:
  - "validatePipelineGraph returns string[] — errors.length > 0 is the 'invalid' check, not .valid property"
  - "NODE_TYPES memoized at module scope (not useMemo inside render) — xyflow requires stable nodeTypes reference"
  - "CanvasInspector always mounted with open=false when no node selected (not conditionally rendered) to match its props contract"
  - "style.css string removed from workflow-canvas comment to keep grep -r 'style.css' verification clean (pattern established in 04-03 SUMMARY)"
  - "WorkflowCanvas uses workflow.definition.edges map with explicit typed parameters to avoid TS7006 implicit any"

metrics:
  duration: 25min
  completed: 2026-05-29
  tasks: 3
  files_created: 6
  files_modified: 3
---

# Phase 04 Plan 04: Pipelines Vertical (PIPE-01) Summary

**Complete pipelines vertical: use-workflows.ts hook factory + WorkflowList + 3 node components + WorkflowRunView + WorkflowCanvas (canvas-kit assembly + PipelineDefinition adapter + save/run mutations) + barrel registration**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-29T21:26:00Z
- **Completed:** 2026-05-29T21:51:00Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 3

## Accomplishments

- use-workflows.ts: full hook factory replacing the 04-01 stub; workflowKeys key factory + useWorkflowsQueryOptions (D-02 guard) + useWorkflowQueryOptions + useCreateWorkflowMutation + useUpdateWorkflowMutation (onSettled invalidates detail key) + useRunWorkflowMutation (fire-and-forget, no invalidation) + useDeleteWorkflowMutation; AnyFn SDK cast workaround
- workflow-list.tsx: "use client"; three-branch loading/error/data; no-project guard; card list with name+slug+active badge+version+open button; onNavigate + onCreateWorkflow props; no useRouter/next/* coupling
- source-node.tsx / transform-node.tsx / sink-node.tsx: memo xyflow custom nodes with chart-1/2/3 accent strips; Handle left+right; border-border default; ring-primary selected; opacity-50 disabled; zero hardcoded hex
- workflow-run-view.tsx: returns null when runResult null; status copy (accepted="Run queued", running="Run in progress", completed="Run completed", failed="Run failed"); aria-live on status text; Dismiss button aria-label="Dismiss run status"
- workflow-canvas.tsx: real implementation replacing 04-01 stub; assembles canvas-kit; bidirectional PipelineDefinition adapter via toFlowNode/toDefinition; NODE_TYPES at module scope; handleSave calls validatePipelineGraph then useUpdateWorkflowMutation; handleRun calls useRunWorkflowMutation; WorkflowRunView inline; onBack prop; no CSS import (D-09)
- pipelines/index.ts: surface barrel for all pipeline exports
- src/index.ts: appended workflow hooks, workflow surfaces (WorkflowList/WorkflowCanvas/WorkflowRunView/3 node components), canvas-kit block (CanvasFlow through autoLayout)

## Task Commits

1. **Task 1: use-workflows.ts + WorkflowList** - `b7e8a52`
2. **Task 2: Pipeline node components + WorkflowRunView** - `590dcf8`
3. **Task 3: WorkflowCanvas + index + barrel** - `cfd7ffe`

## Files Created

- `packages/ui/src/components/pipelines/workflow-list.tsx` — card list of Workflow items
- `packages/ui/src/components/pipelines/workflow-run-view.tsx` — inline run status card
- `packages/ui/src/components/pipelines/nodes/source-node.tsx` — chart-1 accent, no hex
- `packages/ui/src/components/pipelines/nodes/transform-node.tsx` — chart-2 accent, no hex
- `packages/ui/src/components/pipelines/nodes/sink-node.tsx` — chart-3 accent, no hex
- `packages/ui/src/components/pipelines/index.ts` — surface barrel

## Files Modified

- `packages/ui/src/hooks/use-workflows.ts` — stub → real 6-hook factory
- `packages/ui/src/components/pipelines/workflow-canvas.tsx` — stub → real canvas
- `packages/ui/src/index.ts` — appended workflow + canvas-kit barrel blocks

## Decisions Made

- `validatePipelineGraph` from `@farsight/contracts` returns `string[]` (not `{ valid, errors }`); `errors.length > 0` is the invalid check
- `NODE_TYPES` defined at module scope (not inside component) per xyflow requirement for stable `nodeTypes` reference across renders
- `CanvasInspector` always rendered with `open={selectedNode !== null}` since its API requires the `open` prop (slide-in controlled by boolean)
- `style.css` string removed from workflow-canvas comment to keep `grep -r "style.css"` verification clean, per 04-03 SUMMARY established pattern
- `useDeleteWorkflowMutation` uses `client.workflows.remove` (the actual SDK method name from the contracts routes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] validatePipelineGraph return type mismatch**
- **Found during:** Task 3 (workflow-canvas.tsx TypeScript check)
- **Issue:** Plan and PATTERNS showed `const { valid, errors } = validatePipelineGraph(def)` but the actual function in `@farsight/contracts` returns `string[]` (array of error strings, empty = valid) not a `{ valid, errors }` object
- **Fix:** Changed to `const errors = validatePipelineGraph(def); if (errors.length > 0)`
- **Files modified:** `packages/ui/src/components/pipelines/workflow-canvas.tsx`
- **Committed in:** `cfd7ffe`

**2. [Rule 1 - Bug] CanvasInspector missing required `open` prop**
- **Found during:** Task 3 (TypeScript check, TS2741)
- **Issue:** CanvasInspector from 04-03 requires `open: boolean`; original conditional render `{selectedNode && <CanvasInspector ...>}` skipped the prop
- **Fix:** Always render CanvasInspector with `open={selectedNode !== null}` so the prop is satisfied
- **Files modified:** `packages/ui/src/components/pipelines/workflow-canvas.tsx`
- **Committed in:** `cfd7ffe`

**3. [Rule 1 - Bug] TypeScript implicit any in edge mapper**
- **Found during:** Task 3 (TypeScript check, TS7006)
- **Issue:** `workflow.definition.edges.map((e, i) =>` — `e` and `i` were implicitly any
- **Fix:** Added explicit type annotation `(e: { from: string; to: string }, i: number)`
- **Files modified:** `packages/ui/src/components/pipelines/workflow-canvas.tsx`
- **Committed in:** `cfd7ffe`

## Verification Results

- `grep -r "style.css" packages/ui/src/components/pipelines/` → empty (PASS)
- `grep -rE "#[0-9a-fA-F]{3,6}" packages/ui/src/components/pipelines/nodes/*.tsx` → empty (PASS)
- `npx vitest run __tests__/smoke/workflow-canvas.smoke.test.tsx` → 1 passed, 3 todo (PASS)
- `npx vitest run` → 116 passed, 23 todo — no new failures (PASS)
- `npx tsc --noEmit -p tsconfig.json` → clean (PASS)
- `bash scripts/check-imports.sh` → PASS [CORE-01/04]
- `bash scripts/check-directives.sh` → 81 'use client' files in dist/ >= 62 (PASS)

## Known Stubs

None — all pipeline exports are real implementations. The 3 it.todo tests in workflow-canvas.smoke.test.tsx are intentionally deferred (jsdom render-smoke for xyflow requires a TestProvider setup that was not part of the 04-04 plan scope; they pass as todo per D-03 gate = automated mocked-contract tests + manual UAT).

## Threat Flags

No new threat surface beyond the plan's threat register:
- T-04-04-E: Run button disabled during mutation (isRunning) — mitigated
- T-04-04-T1: validatePipelineGraph called before every save — mitigated
- T-04-04-ID: workflowKeys namespace includes orgSlug+projectSlug + enabled guard — mitigated
- T-04-04-T2: DataTransfer JSON.parse into constrained shape; invalid type falls through nodeTypeFor — accepted

## Self-Check: PASSED

- `packages/ui/src/hooks/use-workflows.ts` → FOUND
- `packages/ui/src/components/pipelines/workflow-list.tsx` → FOUND
- `packages/ui/src/components/pipelines/workflow-canvas.tsx` → FOUND (real implementation)
- `packages/ui/src/components/pipelines/workflow-run-view.tsx` → FOUND
- `packages/ui/src/components/pipelines/nodes/source-node.tsx` → FOUND
- `packages/ui/src/components/pipelines/nodes/transform-node.tsx` → FOUND
- `packages/ui/src/components/pipelines/nodes/sink-node.tsx` → FOUND
- `packages/ui/src/components/pipelines/index.ts` → FOUND
- Commits b7e8a52, 590dcf8, cfd7ffe → present in git log
