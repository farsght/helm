"use client"

/**
 * NotificationBell — bell icon button with unread badge + popover of recent notifications.
 *
 * Per D-12: shares useNotificationsQueryOptions with NotificationInbox (same query key = deduplicated fetch).
 * Per D-07: polling 10s, paused when tab is hidden (enforced in the hook, not here).
 * Per D-11: query failure → inline ErrorState (no retry in compact bell); loading → 3 skeleton rows.
 * Per UI-SPEC §1: unread badge aria-live="polite"; "Mark all read" shown only when unreadCount > 0.
 */
import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ScrollArea } from "../ui/scroll-area"
import { Skeleton } from "../ui/skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { NotificationItem } from "./notification-item"
import { useNotificationsQueryOptions, useMarkReadMutation, useMarkAllReadMutation } from "../../hooks/use-notifications"
import { cn } from "../../lib/utils"

// ─── Props ─────────────────────────────────────────────────────────────────────

export type NotificationBellProps = {
  /** Callback called when a notification with an href is clicked. Consumer owns routing. */
  onNavigate?: (href: string) => void
  /**
   * Polling interval in ms. Set to `false` to disable polling.
   * Defaults to 10_000 (D-07).
   */
  interval?: number | false
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell({ onNavigate, interval }: NotificationBellProps) {
  const queryOptions = useNotificationsQueryOptions({ interval })
  const { data, isLoading, isError } = useQuery(queryOptions)
  const markReadMutation = useMarkReadMutation()
  const markAllReadMutation = useMarkAllReadMutation()

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.notifications ?? []

  function handleMarkAllRead() {
    markAllReadMutation.mutate()
  }

  return (
    <div data-slot="notification-bell" className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            {/* Unread badge with live region for screen readers */}
            <span
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] font-medium flex items-center justify-center",
                unreadCount === 0 && "hidden",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-xs h-auto py-1 px-2"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <ErrorState
              title="Could not load notifications"
              className="py-8"
            />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No notifications"
              icon={Bell}
              className="py-8"
            />
          ) : (
            <ScrollArea className="max-h-96">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={onNavigate}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
