/**
 * @farsight/ui — webhook query hooks.
 *
 * STUB: Placeholder created by Plan 03-01. Plan 03-02 replaces with real implementation.
 * Exports key factories and hook signatures for test scaffolding.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"
import type { WebhookEndpoint } from "@farsight/contracts"

export const webhookKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["webhooks", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...webhookKeys.all(orgSlug, projectSlug), "list"] as const,
}

export function useWebhooksQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug
  return queryOptions({
    queryKey: webhookKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: () =>
      client.webhooks.list({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}

export function useCreateWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { url: string; eventTypes: string[] }) =>
      client.webhooks.create({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug! },
        body,
      }),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

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
    }) =>
      client.webhooks.update({
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
          const data = old as { endpoints: WebhookEndpoint[] }
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

export function useDeleteWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      client.webhooks.delete({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
      }),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}

export function useRotateWebhookSecretMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      client.webhooks.rotateSecret({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
      }),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}
