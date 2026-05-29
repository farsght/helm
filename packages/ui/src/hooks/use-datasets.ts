/**
 * @farsight/ui — dataset query hooks.
 *
 * Provides queryOptions factories (project-scope guarded per D-02) and
 * mutation hooks: delete (server-confirmed) and search (stateless POST).
 *
 * No "use client" — hook files do not carry the directive; the component that calls them does.
 *
 * NOTE: The @farsight/sdk ApiClient type infers methods as no-arg when the
 * `apiRoutes as const satisfies ApiRoutesManifest` loses generic precision.
 * Calls that pass args are cast via `(fn as AnyFn)({...})` — the runtime
 * implementation is correct; this is a known TS inference limitation in the SDK.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

// ─── Key factory (D-13 — LOCKED) ──────────────────────────────────────────────

export const datasetKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["datasets", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, id: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), id] as const,
  records: (orgSlug: string, projectSlug: string, id: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), id, "records"] as const,
}

// ─── Type helper for SDK call workaround ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for the dataset list.
 *
 * Per D-02 (LOCKED): query is DISABLED when orgSlug or projectSlug is absent.
 * Per D-13 (LOCKED): query key is namespaced by ['datasets', orgSlug, projectSlug].
 */
export function useDatasetsQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug  // D-02 guard — NEVER omit
  return queryOptions({
    queryKey: datasetKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: () =>
      (client.datasets.list as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}

/**
 * Returns a queryOptions object for a single dataset.
 *
 * Per D-02: disabled when orgSlug, projectSlug, or id is absent.
 */
export function useDatasetQueryOptions(id: string, opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug && !!id  // D-02 guard
  return queryOptions({
    queryKey: datasetKeys.detail(tenant.orgSlug ?? "", tenant.projectSlug ?? "", id),
    queryFn: () =>
      (client.datasets.get as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
          id,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}

/**
 * Returns a queryOptions object for paginated dataset records.
 *
 * Per D-02: disabled when orgSlug, projectSlug, or id is absent.
 */
export function useDatasetRecordsQueryOptions(id: string, opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug && !!id  // D-02 guard
  return queryOptions({
    queryKey: datasetKeys.records(tenant.orgSlug ?? "", tenant.projectSlug ?? "", id),
    queryFn: () =>
      (client.datasets.records as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
          id,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}

/**
 * Server-confirmed delete mutation.
 * ConfirmDialog-gated in DatasetList.
 * onSettled invalidates datasetKeys.all to refresh the list.
 */
export function useDeleteDatasetMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      (client.datasets.delete as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
          id,
        },
      }),
    // No onMutate — server-confirmed
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: datasetKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

/**
 * RAG search mutation (stateless POST — no cache invalidation).
 * Branches on discriminated union backend ('vectorize' | 'none' | 'ai_search').
 */
export function useSearchDatasetMutation() {
  const { client, tenant } = useFarsightContext()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { query: string; topK?: number } }) =>
      (client.datasets.search as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
          id,
        },
        body,
      }),
    // No invalidation — search is stateless
  })
}
