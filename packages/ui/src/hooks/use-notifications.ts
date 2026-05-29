/**
 * @farsight/ui — notification query hooks.
 *
 * STUB: Placeholder created by Plan 03-01. Plan 03-02 replaces with real implementation.
 * Exports key factories and hook signatures for test scaffolding.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
  list: (userId: string, query?: { before?: string; limit?: number; unread?: boolean }) =>
    [...notificationKeys.all(userId), "list", query ?? {}] as const,
}

export function useNotificationsQueryOptions(opts?: {
  interval?: number | false
  before?: string
  limit?: number
  unread?: boolean
}) {
  const { client, tenant } = useFarsightContext()
  return queryOptions({
    queryKey: notificationKeys.list(tenant.userId, {
      before: opts?.before,
      limit: opts?.limit,
      unread: opts?.unread,
    }),
    queryFn: () =>
      client.notifications.list({
        query: {
          before: opts?.before,
          limit: opts?.limit,
          unread: opts?.unread !== undefined ? (String(opts.unread) as "true" | "false") : undefined,
        },
      }),
    refetchInterval: opts?.interval ?? 10_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  })
}

export function useMarkReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.notifications.markRead({ params: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all(tenant.userId) })
      const prev = qc.getQueryData(notificationKeys.list(tenant.userId))
      qc.setQueriesData(
        { queryKey: notificationKeys.all(tenant.userId) },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old
          const data = old as { unreadCount: number; notifications: Array<{ id: string; readAt: string | null }> }
          return {
            ...data,
            unreadCount: Math.max(0, data.unreadCount - 1),
            notifications: data.notifications.map((n) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
          }
        },
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.list(tenant.userId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all(tenant.userId) }),
  })
}

export function useMarkAllReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => client.notifications.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.all(tenant.userId) })
      const prev = qc.getQueryData(notificationKeys.list(tenant.userId))
      qc.setQueriesData(
        { queryKey: notificationKeys.all(tenant.userId) },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old
          const data = old as { notifications: Array<{ readAt: string | null }> }
          return {
            ...data,
            unreadCount: 0,
            notifications: data.notifications.map((n) => ({
              ...n,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
          }
        },
      )
      return { prev }
    },
    onError: (_err, _ctx, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.list(tenant.userId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all(tenant.userId) }),
  })
}
