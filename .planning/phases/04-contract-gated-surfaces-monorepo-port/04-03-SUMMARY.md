---
phase: 04-contract-gated-surfaces-monorepo-port
plan: "03"
subsystem: ui
tags: [xyflow, react-flow, dagre, canvas, pipelines, farsight-contracts, pipeline-definition]

requires:
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: 04-01 established @farsight/contracts types, FarsightProvider seam, packages/ui structure

provides:
  - canvas-kit: CanvasFlow (ReactFlowProvider + ReactFlow wrapper), CanvasBackground, CanvasControls, CanvasMiniMap, CanvasPanel, CanvasInspector, CanvasPalette (keyboard + drag), autoLayout (dagre)
  - pipeline-adapter: toFlowNode() + toDefinition() bidirectional PipelineDefinition↔xyflow adapter with schemaVersion:1 literal enforcement
  - node-ids: NODE_IDS constants (3 verified Farsight NodeId strings) + nodeTypeFor() classifier
  - Re-export of validatePipelineGraph from @farsight/contracts

affects: [04-04-pipelines-surface, PORT-01-vite-consumer]

tech-stack:
  added: []
  patterns:
    - "canvas-kit: domain-neutral xyflow shell — no CSS import, no next/*, all token-based colors"
    - "PipelineDefinition adapter: toFlowNode/toDefinition pure fns; schemaVersion always literal 1"
    - "NodeId constants file: verified registry strings, nodeTypeFor prefix classifier"
    - "auto-layout: verbatim dagre port (pure fn, no hooks, no browser deps)"

key-files:
  created:
    - packages/ui/src/components/canvas-kit/canvas-flow.tsx
    - packages/ui/src/components/canvas-kit/canvas-background.tsx
    - packages/ui/src/components/canvas-kit/canvas-controls.tsx
    - packages/ui/src/components/canvas-kit/canvas-minimap.tsx
    - packages/ui/src/components/canvas-kit/canvas-panel.tsx
    - packages/ui/src/components/canvas-kit/canvas-inspector.tsx
    - packages/ui/src/components/canvas-kit/canvas-palette.tsx
    - packages/ui/src/components/canvas-kit/auto-layout.ts
    - packages/ui/src/components/canvas-kit/index.ts
    - packages/ui/src/components/pipelines/pipeline-adapter.ts
    - packages/ui/src/components/pipelines/node-ids.ts
  modified: []

key-decisions:
  - "canvas-kit has no @xyflow/react CSS import (D-09 / Pitfall 5) — consumer global CSS owns it"
  - "toDefinition meta Pick excludes schemaVersion to prevent callers overriding the literal 1"
  - "NodeId cast as branded type in toDefinition to satisfy contracts schema type-check"
  - "Re-export validatePipelineGraph from @farsight/contracts — not hand-rolled"
  - "CanvasPalette items are button elements (keyboard-accessible) not div[draggable] (a11y)"

patterns-established:
  - "canvas-kit token pattern: stroke/fill via CSS vars (var(--color-border), var(--color-primary), var(--color-chart-N))"
  - "pure utility files (auto-layout.ts, pipeline-adapter.ts, node-ids.ts) have NO use client directive"

requirements-completed: [PIPE-01]

duration: 18min
completed: 2026-05-29
---

# Phase 04 Plan 03: Canvas-Kit Primitives & Pipeline Adapter Summary

**xyflow canvas-kit (8 components + auto-layout) + PipelineDefinition↔xyflow adapter extracted from Helm into framework-agnostic packages/ui, with verified Farsight NodeId constants and no CSS side-effect imports**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-29T21:05:00Z
- **Completed:** 2026-05-29T21:23:00Z
- **Tasks:** 2
- **Files created:** 11

## Accomplishments

- canvas-kit directory created with 9 files: CanvasFlow (ReactFlowProvider + ReactFlow wrapper), CanvasBackground (dots + var(--color-border)), CanvasControls, CanvasMiniMap (var(--color-muted)), CanvasPanel (thin Panel wrapper), CanvasInspector (slide-in right panel), CanvasPalette (keyboard a11y + drag), auto-layout.ts (verbatim dagre port), index.ts barrel
- pipeline-adapter.ts: toFlowNode() maps FPipelineNode→xyflow Node; toDefinition() maps xyflow state→PipelineDefinition with schemaVersion: 1 literal (Pitfall 2 mitigated), edges always 'main' port; validatePipelineGraph re-exported from @farsight/contracts
- node-ids.ts: NODE_IDS with 3 verified Farsight NodeId strings (core.source.manual@1.0.0, core.transform.set@1.0.0, core.sink.dataset@1.0.0) + nodeTypeFor() prefix classifier with dev-mode warning on unknown IDs

## Task Commits

1. **Task 1: canvas-kit component files** - `cc30bc2` (feat)
2. **Task 2: pipeline-adapter.ts + node-ids.ts** - `eb6b62a` (feat)

**Plan metadata:** (committed below)

## Files Created

- `packages/ui/src/components/canvas-kit/canvas-flow.tsx` — ReactFlowProvider + ReactFlow wrapper, no CSS import
- `packages/ui/src/components/canvas-kit/canvas-background.tsx` — BackgroundVariant.Dots + var(--color-border)
- `packages/ui/src/components/canvas-kit/canvas-controls.tsx` — Controls with aria-label wrapper
- `packages/ui/src/components/canvas-kit/canvas-minimap.tsx` — MiniMap with var(--color-muted) nodeColor
- `packages/ui/src/components/canvas-kit/canvas-panel.tsx` — Panel position wrapper
- `packages/ui/src/components/canvas-kit/canvas-inspector.tsx` — Slide-in right panel + ScrollArea
- `packages/ui/src/components/canvas-kit/canvas-palette.tsx` — Drag + Enter/Space keyboard add-node
- `packages/ui/src/components/canvas-kit/auto-layout.ts` — Verbatim dagre port (pure fn)
- `packages/ui/src/components/canvas-kit/index.ts` — Barrel re-exporting all canvas-kit public names
- `packages/ui/src/components/pipelines/pipeline-adapter.ts` — toFlowNode + toDefinition + validatePipelineGraph re-export
- `packages/ui/src/components/pipelines/node-ids.ts` — NODE_IDS constants + nodeTypeFor()

## Decisions Made

- `schemaVersion` excluded from `toDefinition`'s `meta` Pick type so callers cannot accidentally supply it — always hardcoded as literal `1` inside the function (Pitfall 2 enforcement)
- `n.data.type` cast as `NodeId` branded type (not plain `string`) to satisfy `@farsight/contracts` Zod branded type at compile time
- `validatePipelineGraph` re-exported from `@farsight/contracts` rather than hand-rolled (see RESEARCH.md "Don't Hand-Roll")
- CanvasPalette items use `<button>` elements (not `<div draggable>`) for native keyboard accessibility per UI-SPEC a11y contract
- `style.css` warning comments removed from canvas-kit files to keep the plan's `grep -r "style.css"` verification clean (the constraint is enforced architecturally — no actual imports)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NodeId branded type cast in toDefinition**
- **Found during:** Task 2 (pipeline-adapter.ts)
- **Issue:** `n.data.type as string` failed TypeScript compilation — `PipelineNode.type` expects the Zod-branded `NodeId` type, not plain `string`
- **Fix:** Imported `NodeId` from `@farsight/contracts`; cast as `n.data.type as NodeId`
- **Files modified:** `packages/ui/src/components/pipelines/pipeline-adapter.ts`
- **Verification:** `tsc --noEmit` clean
- **Committed in:** `eb6b62a`

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript type error)
**Impact on plan:** Fix required for compilation; semantics unchanged. schemaVersion literal 1 constraint preserved exactly.

## Issues Encountered

None — plan executed cleanly after the branded-type fix.

## Verification Results

- `grep -r "style.css" packages/ui/src/components/canvas-kit/` → empty (PASS)
- `grep "schemaVersion: 1" pipeline-adapter.ts` → match (PASS)
- `grep "core.source.manual@1.0.0|core.transform.set@1.0.0|core.sink.dataset@1.0.0" node-ids.ts` → all 3 present (PASS)
- `bash packages/ui/scripts/check-imports.sh` → PASS [CORE-01/04]
- `cd packages/ui && npx tsc --noEmit -p tsconfig.json` → clean (PASS)
- `npx vitest run` → 116 passed | 23 todo — no new failures (PASS)

## Known Stubs

None — canvas-kit is infrastructure only; no data sources to wire. Note: `packages/ui/src/components/canvas-kit/index.ts` is NOT registered in `packages/ui/src/index.ts` barrel yet — that registration happens in 04-04 Task 3 per the plan.

## Threat Flags

No new threat surface introduced. All T-04-03 items from the plan's threat register are mitigated:
- T-04-03-T1: `schemaVersion: 1` literal enforced in toDefinition
- T-04-03-T2: DataTransfer accepted (same-origin only, no eval/dangerouslySetInnerHTML)
- T-04-03-T3: NODE_IDS are hardcoded constants, not user-controlled

## Next Phase Readiness

- canvas-kit primitives ready for 04-04 WorkflowCanvas assembly
- pipeline-adapter.ts ready for WorkflowCanvas save/load cycle
- node-ids.ts NODE_IDS ready for SourceNode/TransformNode/SinkNode in 04-04
- Barrel registration in `packages/ui/src/index.ts` deferred to 04-04 Task 3 (by plan design)

---
*Phase: 04-contract-gated-surfaces-monorepo-port*
*Completed: 2026-05-29*
