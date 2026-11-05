"use client"

/**
 * NotificationInbox — full-page paginated notification list.
 *
 * Per D-12: shares useNotificationsQueryOptions with NotificationBell (same key when before=undefined).
 * Per D-12: "Load more" uses manual before cursor (newest-first, cursor = last createdAt).
 * Per D-11: loading → ListSkeleton; error → ErrorState with retry; empty → EmptyState.
 * Per D-08: mark-read is optimistic with rollback; mark-all-read is optimistic.
 */
import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { Button } from "../ui/button"
import { ErrorState } from "../page/error-state"
import { EmptyState } from "../page/empty-state"
import { ListSkeleton } from "../page/list-skeleton"
import { NotificationItem } from "./notification-item"
import {
  useNotificationsQueryOptions,
  useMarkAllReadMutation,
  useMarkReadMutation,
} from "../../hooks/use-notifications"

// ─── Props ─────────────────────────────────────────────────────────────────────

export type NotificationInboxProps = {
  /** Callback called when a notification with an href is clicked. Consumer owns routing. */
  onNavigate?: (href: string) => void
  /**
   * Polling interval in ms. Set to `false` to disable polling.
   * Defaults to 10_000 (D-07).
   */
  interval?: number | false
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationInbox({ onNavigate, interval }: NotificationInboxProps) {
  // Pagination cursor: undefined = first page; string = cursor from previous page
  const [before, setBefore] = React.useState<string | undefined>(undefined)

  const queryOptions = useNotificationsQueryOptions({ interval, before })
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)
  const markReadMutation = useMarkReadMutation()
  const markAllReadMutation = useMarkAllReadMutation()

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.notifications ?? []
  const hasMore = data?.hasMore ?? false

  function handleLoadMore() {
    if (notifications.length > 0) {
      const last = notifications[notifications.length - 1]
      setBefore(last.createdAt)
    }
  }

  function handleMarkAllRead() {
    markAllReadMutation.mutate()
  }

  return (
    <div data-slot="notification-inbox" className="p-8">
      {/* Heading row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Notifications</h2>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Three-branch: loading / error / empty / data */}
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : isError ? (
        <ErrorState
          title="Could not load notifications"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="No notifications yet."
          icon={Bell}
        />
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border bg-card">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={onNavigate}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={handleLoadMore}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  )
}
