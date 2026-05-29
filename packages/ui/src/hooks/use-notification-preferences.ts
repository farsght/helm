/**
 * @farsight/ui — notification preferences hooks.
 *
 * STUB: Placeholder created by Plan 03-01. Plan 03-02 replaces with real implementation.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

export const notificationPreferenceKeys = {
  all: (userId: string) => ["notificationPreferences", userId] as const,
  detail: (userId: string) => [...notificationPreferenceKeys.all(userId), "detail"] as const,
}

export function useNotificationPreferencesQueryOptions() {
  const { client, tenant } = useFarsightContext()
  return queryOptions({
    queryKey: notificationPreferenceKeys.detail(tenant.userId),
    queryFn: () => client.me.getNotificationPreferences(),
    staleTime: 60_000,
  })
}

export function useUpdateNotificationPreferencesMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) =>
      client.me.updateNotificationPreferences({ body }),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: notificationPreferenceKeys.all(tenant.userId) }),
  })
}
