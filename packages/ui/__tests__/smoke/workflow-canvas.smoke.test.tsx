/**
 * Smoke tests for <WorkflowCanvas> — PIPE-01.
 *
 * Wave-0: All tests are it.todo stubs. Wave-0 only requires the import to resolve
 * (import-safe invariant). Live render-smoke tests are promoted in Plan 04-04 once
 * the xyflow canvas implementation ships.
 *
 * jsdom note: xyflow renders to SVG in a real browser. In jsdom, assert DOM
 * presence of .react-flow container + .react-flow__node elements rather than
 * SVG path geometry. Edge visibility requires real-browser testing in the Vite app.
 */
import { WorkflowCanvas } from "../../src/components/pipelines/workflow-canvas"

describe("WorkflowCanvas smoke — PIPE-01", () => {
  it.todo("renders .react-flow container in DOM when mounted with a valid wfSlug")

  it.todo(
    "WorkflowCanvas with 2 seeded nodes yields 2 .react-flow__node elements in DOM",
  )

  it.todo(
    "pipeline adapter toDefinition round-trip — xyflow nodes→PipelineDefinition→nodes preserves node count",
  )
})

// Verify the module exports a function (import-safe invariant check)
describe("WorkflowCanvas module scaffold", () => {
  it("WorkflowCanvas is a function (import resolves)", () => {
    expect(typeof WorkflowCanvas).toBe("function")
  })
})
