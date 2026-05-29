/**
 * @farsight/ui — workflow query hooks (pipelines vertical, PIPE-01).
 *
 * Provides queryOptions factory (project-scope guarded per D-02) and
 * six mutation hooks: create, update (server-confirmed — new definition version),
 * run (fire-and-forget 202 Accepted), and delete.
 *
 * No "use client" — hook files do not carry the directive; components do.
 *
 * NOTE: The @farsight/sdk ApiClient type infers methods as no-arg when the
 * `apiRoutes as const satisfies ApiRoutesManifest` loses generic precision.
 * Calls that pass args are cast via `(fn as AnyFn)({...})` — the runtime
 * implementation is correct; this is a known TS inference limitation in the SDK.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import type { PipelineDefinition } from "@farsight/contracts"
import { useFarsightContext } from "../provider/farsight-provider"

// ─── Key factory ──────────────────────────────────────────────────────────────

export const workflowKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["workflows", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, wfSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), wfSlug] as const,
}

// ─── Type helper for SDK call workaround ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for the workflow list.
 *
 * Per D-02 (LOCKED): query is DISABLED when projectSlug or orgSlug is absent.
 */
export function useWorkflowsQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug // D-02 guard
  return queryOptions({
    queryKey: workflowKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: () =>
      (client.workflows.list as AnyFn)({
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
 * Returns a queryOptions object for a single workflow with its PipelineDefinition.
 *
 * Per D-02: disabled when projectSlug, orgSlug, or wfSlug is absent.
 */
export function useWorkflowQueryOptions(wfSlug: string, opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug && !!wfSlug
  return queryOptions({
    queryKey: workflowKeys.detail(tenant.orgSlug ?? "", tenant.projectSlug ?? "", wfSlug),
    queryFn: () =>
      (client.workflows.get as AnyFn)({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
          wfSlug,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}

/**
 * Server-confirmed create mutation.
 * onSettled invalidates the full workflow list.
 */
export function useCreateWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; slug?: string; definition: PipelineDefinition }) =>
      (client.workflows.create as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug! },
        body,
      }),
    // No onMutate — server-confirmed
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: workflowKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

/**
 * Server-confirmed update mutation (PATCH definition → new immutable version).
 *
 * A new `definition` creates a new immutable PipelineDefinition version server-side.
 * onSettled invalidates the detail key for the updated wfSlug so the canvas reloads
 * the authoritative definition. No optimistic update — definition versioning is server-confirmed.
 */
export function useUpdateWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      wfSlug,
      body,
    }: {
      wfSlug: string
      body: { name?: string; definition?: PipelineDefinition; active?: boolean }
    }) =>
      (client.workflows.update as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, wfSlug },
        body,
      }),
    // No onMutate — definition version creation is server-confirmed
    onSettled: (_data, _err, vars) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(
          tenant.orgSlug ?? "",
          tenant.projectSlug ?? "",
          vars.wfSlug
        ),
      }),
  })
}

/**
 * Fire-and-forget run mutation (202 Accepted).
 *
 * Returns { runId, status: 'accepted', workflowId, version }.
 * No cache invalidation — there is no polling endpoint in Phase-4 contracts.
 * The WorkflowCanvas shows WorkflowRunView with the returned runId/status.
 */
export function useRunWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  return useMutation({
    mutationFn: (wfSlug: string) =>
      (client.workflows.run as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, wfSlug },
      }),
    // No invalidation — no polling endpoint in Phase-4 contracts
  })
}

/**
 * Server-confirmed delete mutation.
 * onSettled invalidates the full workflow list.
 */
export function useDeleteWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (wfSlug: string) =>
      (client.workflows.remove as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, wfSlug },
      }),
    // No onMutate — server-confirmed
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: workflowKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}
