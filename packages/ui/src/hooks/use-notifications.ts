/**
 * @farsight/ui — notification query hooks.
 *
 * Provides queryOptions factory with 10s polling (D-07) and optimistic
 * mark-read / mark-all-read mutations with rollback (D-08).
 *
 * No "use client" — hook files do not carry the directive; the component that calls them does.
 *
 * NOTE: The @farsight/sdk ApiClient type infers methods as no-arg when the
 * `apiRoutes as const satisfies ApiRoutesManifest` loses generic precision.
 * Calls that pass args are cast via `(fn as AnyFn)({...})` — the runtime
 * implementation is correct; this is a known TS inference limitation in the SDK.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import type { NotificationListResponse } from "@farsight/contracts"
import { useFarsightContext } from "../provider/farsight-provider"

// ─── Key factory ──────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
  list: (userId: string, query?: { before?: string; limit?: number; unread?: boolean }) =>
    [...notificationKeys.all(userId), "list", query ?? {}] as const,
}

// ─── Type helpers for SDK call workaround ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for the notification list.
 *
 * Per D-07:
 * - refetchInterval defaults to 10_000 (injectable via opts.interval, false = off)
 * - refetchIntervalInBackground: false — polling pauses when the tab is hidden
 * - staleTime: 5_000
 *
 * Per D-12: key is user-namespaced so NotificationBell + NotificationInbox share
 * the same TanStack query entry → single in-flight fetch, deduplicated.
 */
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
    queryFn: (): Promise<NotificationListResponse> =>
      (client.notifications.list as AnyFn)({
        query: {
          before: opts?.before,
          limit: opts?.limit,
          unread: opts?.unread !== undefined ? (String(opts.unread) as "true" | "false") : undefined,
        },
      }),
    refetchInterval: opts?.interval ?? 10_000,
    refetchIntervalInBackground: false,  // D-07: pauses when tab hidden (T-03-07)
    staleTime: 5_000,
  })
}

/**
 * Optimistic mark-read mutation (D-08).
 *
 * onMutate: cancel in-flight queries → snapshot → set readAt + decrement unreadCount.
 * onError: rollback to snapshot.
 * onSettled: invalidate to sync with server.
 */
export function useMarkReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      (client.notifications.markRead as AnyFn)({ params: { id } }),
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

/**
 * Optimistic mark-all-read mutation (D-08).
 *
 * onMutate: cancel → snapshot → set all readAt + unreadCount=0.
 * onError: rollback to snapshot.
 * onSettled: invalidate.
 */
export function useMarkAllReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      (client.notifications.markAllRead as AnyFn)(),
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
