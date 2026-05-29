/**
 * @farsight/ui — webhook query hooks.
 *
 * Provides queryOptions factory (project-scope guarded per D-02) and
 * five mutation hooks: create, update (optimistic enable-toggle per D-08),
 * delete, and rotateSecret (all server-confirmed except enable-toggle).
 *
 * No "use client" — hook files do not carry the directive; the component that calls them does.
 *
 * NOTE: The @farsight/sdk ApiClient type infers methods as no-arg when the
 * `apiRoutes as const satisfies ApiRoutesManifest` loses generic precision.
 * Calls that pass args are cast via `(fn as AnyFn)({...})` — the runtime
 * implementation is correct; this is a known TS inference limitation in the SDK.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  WebhookEndpoint,
  WebhookEndpointListResponse,
  WebhookEndpointCreateResponse,
} from "@farsight/contracts"
import { useFarsightContext } from "../provider/farsight-provider"

// ─── Key factory (D-13 — LOCKED) ──────────────────────────────────────────────

export const webhookKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["webhooks", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...webhookKeys.all(orgSlug, projectSlug), "list"] as const,
}

// ─── Type helper for SDK call workaround ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for the webhook list.
 *
 * Per D-02 (LOCKED): query is DISABLED when projectSlug is absent.
 * Per D-13 (LOCKED): query key is namespaced by ['webhooks', orgSlug, projectSlug].
 */
export function useWebhooksQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug  // D-02 guard
  return queryOptions({
    queryKey: webhookKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: (): Promise<WebhookEndpointListResponse> =>
      (client.webhooks.list as AnyFn)({
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
 * Optimistic enable/disable toggle mutation (D-08 — LOCKED).
 *
 * onMutate: cancel in-flight queries → snapshot → apply optimistic update.
 * onError: rollback to snapshot.
 * onSettled: invalidate to sync with server.
 *
 * Note: Only enabled field gets the optimistic treatment; eventTypes updates
 * go through the same path but are less common.
 */
export function useUpdateWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { enabled?: boolean; eventTypes?: string[] }
    }): Promise<WebhookEndpoint> =>
      (client.webhooks.update as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
        body,
      }),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      })
      const listKey = webhookKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? "")
      const prev = qc.getQueryData(listKey)
      // Optimistic update for enable/disable toggle
      if (body.enabled !== undefined) {
        qc.setQueryData(listKey, (old: unknown) => {
          if (!old || typeof old !== "object") return old
          const data = old as WebhookEndpointListResponse
          return {
            ...data,
            endpoints: data.endpoints.map((e) =>
              e.id === id ? { ...e, enabled: body.enabled! } : e,
            ),
          }
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      const listKey = webhookKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? "")
      if (ctx?.prev) qc.setQueryData(listKey, ctx.prev)
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

/**
 * Server-confirmed create mutation (D-08).
 * signingSecret is returned once in the response — caller must surface it immediately.
 */
export function useCreateWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { url: string; eventTypes: string[] }): Promise<WebhookEndpointCreateResponse> =>
      (client.webhooks.create as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug! },
        body,
      }),
    // No onMutate — server-confirmed; signingSecret is one-time from response
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

/**
 * Server-confirmed delete mutation (D-08).
 * ConfirmDialog-gated in WebhookList.
 */
export function useDeleteWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      (client.webhooks.delete as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
      }),
    // No onMutate — server-confirmed
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

/**
 * Server-confirmed rotate-secret mutation (D-08).
 * New signingSecret is returned once — caller must surface it immediately.
 * ConfirmDialog-gated in WebhookList.
 */
export function useRotateWebhookSecretMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string): Promise<WebhookEndpointCreateResponse> =>
      (client.webhooks.rotateSecret as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
      }),
    // No onMutate — server-confirmed; signingSecret is one-time from response
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}
