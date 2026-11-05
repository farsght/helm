/**
 * Tests for useWorkflows query hooks — PIPE-01.
 *
 * Wave-0: Concrete key-factory assertions run against the import-safe stub
 * created in Plan 04-01. Deeper behaviour covered by it.todo stubs, promoted
 * to live assertions in Plan 04-04 once the full implementation ships.
 */
import { describe, expect, it } from "vitest"
import { workflowKeys } from "../../src/hooks/use-workflows"

describe("useWorkflows — PIPE-01", () => {
  it("workflowKeys.detail includes wfSlug", () => {
    const key = workflowKeys.detail("my-org", "my-project", "my-workflow")

    // Key must contain the workflow slug for cache correctness
    expect(key).toContain("my-workflow")
    expect(key).toContain("my-org")
    expect(key).toContain("my-project")
    expect(Array.isArray(key)).toBe(true)
  })

  it("workflowKeys.detail different wfSlug → different key (cache isolation)", () => {
    const keyA = workflowKeys.detail("org", "project", "wf-alpha")
    const keyB = workflowKeys.detail("org", "project", "wf-beta")
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB))
  })

  it.todo("useWorkflowsQueryOptions enabled=false when projectSlug is null (D-02 guard)")

  it.todo("useWorkflowQueryOptions fetches workflow + PipelineDefinition for a given wfSlug")

  it.todo("useRunWorkflowMutation calls POST .../run and returns { runId, status: 'accepted' }")

  it.todo("useUpdateWorkflowMutation invalidates detail cache on success (new definition version)")
})
