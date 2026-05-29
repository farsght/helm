// 04-01 import-safe stub. Fleshed out in 04-02 (DSET-01).
//
// No "use client" — hook files do not carry the directive; only components do.

// ─── Key factory (LOCKED shape) ───────────────────────────────────────────────

export const datasetKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["datasets", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, datasetId: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), datasetId] as const,
  records: (orgSlug: string, projectSlug: string, datasetId: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), datasetId, "records"] as const,
}

// ─── Placeholder hooks (throwing stubs) ─────────────────────────────────────

/** Stub — implemented in 04-02. */
export function useDatasetsQueryOptions(): never {
  throw new Error("useDatasetsQueryOptions: stub — implemented in 04-02 (DSET-01)")
}

/** Stub — implemented in 04-02. */
export function useDatasetQueryOptions(): never {
  throw new Error("useDatasetQueryOptions: stub — implemented in 04-02 (DSET-01)")
}

/** Stub — implemented in 04-02. */
export function useDatasetRecordsQueryOptions(): never {
  throw new Error("useDatasetRecordsQueryOptions: stub — implemented in 04-02 (DSET-01)")
}

/** Stub — implemented in 04-02. */
export function useSearchDatasetMutation(): never {
  throw new Error("useSearchDatasetMutation: stub — implemented in 04-02 (DSET-01)")
}

/** Stub — implemented in 04-02. */
export function useDeleteDatasetMutation(): never {
  throw new Error("useDeleteDatasetMutation: stub — implemented in 04-02 (DSET-01)")
}
