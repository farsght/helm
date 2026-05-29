// 04-01 import-safe stub. Fleshed out in 04-04 (PIPE-01).
//
// No "use client" — hook files do not carry the directive; only components do.

// ─── Key factory (LOCKED shape) ───────────────────────────────────────────────

export const workflowKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["workflows", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, wfSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), wfSlug] as const,
}

// ─── Placeholder hooks (throwing stubs) ─────────────────────────────────────

/** Stub — implemented in 04-04. */
export function useWorkflowsQueryOptions(): never {
  throw new Error("useWorkflowsQueryOptions: stub — implemented in 04-04 (PIPE-01)")
}

/** Stub — implemented in 04-04. */
export function useWorkflowQueryOptions(): never {
  throw new Error("useWorkflowQueryOptions: stub — implemented in 04-04 (PIPE-01)")
}

/** Stub — implemented in 04-04. */
export function useCreateWorkflowMutation(): never {
  throw new Error("useCreateWorkflowMutation: stub — implemented in 04-04 (PIPE-01)")
}

/** Stub — implemented in 04-04. */
export function useUpdateWorkflowMutation(): never {
  throw new Error("useUpdateWorkflowMutation: stub — implemented in 04-04 (PIPE-01)")
}

/** Stub — implemented in 04-04. */
export function useRunWorkflowMutation(): never {
  throw new Error("useRunWorkflowMutation: stub — implemented in 04-04 (PIPE-01)")
}

/** Stub — implemented in 04-04. */
export function useDeleteWorkflowMutation(): never {
  throw new Error("useDeleteWorkflowMutation: stub — implemented in 04-04 (PIPE-01)")
}
