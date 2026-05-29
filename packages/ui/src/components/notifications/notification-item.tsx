/**
 * NotificationItem — single notification row.
 *
 * Presentational component — no hooks, no "use client" needed.
 * Used in both NotificationBell popover and NotificationInbox list.
 *
 * Per D-12: click marks read + calls onNavigate(href) if href is non-null.
 * Per UI-SPEC §3: severity → Lucide icon + token color; unread dot; relative timestamp.
 */
import * as React from "react"
import {
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import type { InAppNotification } from "@farsight/contracts"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"

// ─── Severity → icon / color mappings ─────────────────────────────────────────

const SEVERITY_ICON: Record<string, LucideIcon> = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}

const SEVERITY_CLASS: Record<string, string> = {
  error: "text-destructive",
  warning: "text-[var(--color-chart-4)]",
  success: "text-primary",
  info: "text-muted-foreground",
}

// ─── Relative timestamp ────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return "yesterday"
  return `${diffDay}d ago`
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export type NotificationItemProps = {
  notification: InAppNotification
  onNavigate?: (href: string) => void
  onMarkRead?: (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationItem({
  notification,
  onNavigate,
  onMarkRead,
}: NotificationItemProps) {
  const isUnread = notification.readAt === null
  const severity = notification.severity ?? null
  const SeverityIcon: LucideIcon = (severity ? SEVERITY_ICON[severity] : null) ?? Bell
  const severityClass = (severity ? SEVERITY_CLASS[severity] : null) ?? "text-muted-foreground"

  function handleClick() {
    if (isUnread) {
      onMarkRead?.(notification.id)
    }
    if (notification.href) {
      onNavigate?.(notification.href)
    }
  }

  return (
    <button
      type="button"
      data-slot="notification-item"
      className={cn(
        "w-full text-left flex items-start gap-2 px-4 py-3 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
        isUnread ? "bg-muted/30" : "bg-transparent",
      )}
      onClick={handleClick}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
      )}

      {/* Severity icon */}
      <SeverityIcon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", severityClass)} />

      {/* Content block */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm truncate",
            isUnread ? "font-medium" : "font-normal",
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.body}
          </p>
        )}
        <Badge variant="outline" className="text-[10px] h-4 mt-1 lowercase">
          {notification.category}
        </Badge>
      </div>

      {/* Timestamp */}
      <time
        className="text-xs text-muted-foreground flex-shrink-0 ml-2 mt-0.5"
        dateTime={notification.createdAt}
      >
        {formatRelativeTime(notification.createdAt)}
      </time>
    </button>
  )
}
