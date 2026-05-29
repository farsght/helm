/**
 * @farsight/ui — notification preferences hooks.
 *
 * Provides queryOptions factory and mutation hook for user notification preferences.
 * Preferences are user-scoped (userId-namespaced keys).
 *
 * No "use client" — hook files do not carry the directive; the component that calls them does.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import type { NotificationPreferencesUpdateBody, NotificationPreferencesResponse } from "@farsight/contracts"
import { useFarsightContext } from "../provider/farsight-provider"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Key factory ──────────────────────────────────────────────────────────────

export const preferenceKeys = {
  all: (userId: string) => ["notificationPreferences", userId] as const,
  get: (userId: string) => [...preferenceKeys.all(userId), "get"] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for notification preferences.
 * staleTime: 60s — preferences change infrequently.
 * enabled: requires a valid userId.
 */
export function useNotificationPreferencesQuery() {
  const { client, tenant } = useFarsightContext()
  return queryOptions({
    queryKey: preferenceKeys.get(tenant.userId),
    queryFn: (): Promise<NotificationPreferencesResponse> =>
      (client.me.getNotificationPreferences as AnyFn)(),
    staleTime: 60_000,
    enabled: !!tenant.userId,
  })
}

/**
 * Server-confirmed mutation for updating notification preferences.
 * NOT optimistic — the UI awaits server confirmation before updating.
 * Mutation errors surface as toast in the component (D-11, T-03-09).
 * onSettled: invalidates all preference keys for the current user.
 */
export function useUpdateNotificationPreferences() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NotificationPreferencesUpdateBody) =>
      (client.me.updateNotificationPreferences as AnyFn)({ body }),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: preferenceKeys.all(tenant.userId) }),
  })
}
