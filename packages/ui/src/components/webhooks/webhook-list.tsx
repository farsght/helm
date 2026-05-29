"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Webhook, FolderOpen, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { WebhookEndpoint } from "@farsight/contracts"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Badge } from "../ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { CardGridSkeleton } from "../page/card-grid-skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { ConfirmDialog } from "../page/confirm-dialog"
import { WebhookHealthBadge } from "./webhook-health-badge"
import {
  useWebhooksQueryOptions,
  useDeleteWebhookMutation,
  useUpdateWebhookMutation,
} from "../../hooks/use-webhooks"
import { useTenant } from "../../provider/use-tenant"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookListProps = {
  /** Called when user clicks "Add webhook" (opens create modal — Plan 05). */
  onAddWebhook?: () => void
  /**
   * Called when user confirms "Rotate signing secret".
   * Plan 05 provides the actual modal; the list calls this prop with the id
   * and an onSuccess callback that receives the new signing secret.
   */
  onRotateSecret?: (id: string, onSuccess: (secret: string) => void) => void
  className?: string
}

// ─── Last-activity helper ─────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── WebhookEndpointRow ───────────────────────────────────────────────────────

type WebhookEndpointRowProps = {
  endpoint: WebhookEndpoint
  onToggleEnabled: (id: string, enabled: boolean) => void
  onDeleteClick: (endpoint: WebhookEndpoint) => void
  onRotateClick: (id: string) => void
}

function WebhookEndpointRow({
  endpoint,
  onToggleEnabled,
  onDeleteClick,
  onRotateClick,
}: WebhookEndpointRowProps) {
  // Derive last-activity text
  let activityText = "No activity yet"
  if (endpoint.lastSuccessAt && endpoint.lastFailureAt) {
    // Show the most recent one
    if (endpoint.lastSuccessAt > endpoint.lastFailureAt) {
      activityText = `Last success: ${formatRelativeTime(endpoint.lastSuccessAt)}`
    } else {
      activityText = `Last failure: ${formatRelativeTime(endpoint.lastFailureAt)}`
    }
  } else if (endpoint.lastSuccessAt) {
    activityText = `Last success: ${formatRelativeTime(endpoint.lastSuccessAt)}`
  } else if (endpoint.lastFailureAt) {
    activityText = `Last failure: ${formatRelativeTime(endpoint.lastFailureAt)}`
  }

  return (
    <div className="flex items-start gap-4 py-3 px-4">
      {/* Left: URL, event types, last activity */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate max-w-[280px]">{endpoint.url}</p>
        <div className="flex flex-wrap gap-1">
          {endpoint.eventTypes.map((type) => (
            <Badge key={type} variant="outline" className="text-[10px]">
              {type}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs bg-muted px-1 rounded font-mono">
            {endpoint.signingSecretPrefix}&hellip;
          </code>
          <span className="text-xs text-muted-foreground">{activityText}</span>
        </div>
      </div>

      {/* Right: health badge, enable toggle, actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <WebhookHealthBadge endpoint={endpoint} />
        <Switch
          checked={endpoint.enabled}
          onCheckedChange={(checked) => onToggleEnabled(endpoint.id, checked)}
          aria-label="Enable webhook"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Webhook actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRotateClick(endpoint.id)}>
              Rotate signing secret
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteClick(endpoint)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── WebhookList ──────────────────────────────────────────────────────────────

export function WebhookList({ onAddWebhook, onRotateSecret, className }: WebhookListProps) {
  const tenant = useTenant()
  const queryOptions = useWebhooksQueryOptions()
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)
  const updateMutation = useUpdateWebhookMutation()
  const deleteMutation = useDeleteWebhookMutation()

  // Delete confirm dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<WebhookEndpoint | null>(null)

  // Rotate confirm dialog state
  const [rotateOpen, setRotateOpen] = React.useState(false)
  const [rotateTarget, setRotateTarget] = React.useState<string | null>(null)

  // D-02: no project selected — render EmptyState, do NOT call the query
  if (!tenant.projectSlug) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project to manage its webhooks."
        icon={FolderOpen}
      />
    )
  }

  // D-11: three-branch loading / error / data
  if (isLoading) {
    return <CardGridSkeleton count={3} columns={1} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load webhooks"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  const endpoints = data?.endpoints ?? []

  if (endpoints.length === 0) {
    return (
      <EmptyState
        title="No webhooks"
        description="Register a webhook to receive real-time event notifications."
        icon={Webhook}
        action={
          <Button size="sm" onClick={onAddWebhook}>
            Add webhook
          </Button>
        }
      />
    )
  }

  function handleToggleEnabled(id: string, enabled: boolean) {
    updateMutation.mutate({ id, body: { enabled } })
  }

  function handleDeleteClick(endpoint: WebhookEndpoint) {
    setDeleteTarget(endpoint)
    setDeleteOpen(true)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        setDeleteTarget(null)
      },
      onError: () => {
        toast.error("Could not delete webhook. Try again.")
        setDeleteOpen(false)
        setDeleteTarget(null)
      },
    })
  }

  function handleRotateClick(id: string) {
    setRotateTarget(id)
    setRotateOpen(true)
  }

  function handleRotateConfirm() {
    if (!rotateTarget) return
    setRotateOpen(false)
    if (onRotateSecret) {
      onRotateSecret(rotateTarget, (_secret) => {
        setRotateTarget(null)
      })
    } else {
      setRotateTarget(null)
    }
  }

  return (
    <div data-slot="webhook-list" className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Webhooks</h2>
        <Button size="sm" onClick={onAddWebhook}>
          Add webhook
        </Button>
      </div>

      {/* Endpoint list card */}
      <div className="rounded-lg border bg-card divide-y divide-border">
        {endpoints.map((endpoint) => (
          <WebhookEndpointRow
            key={endpoint.id}
            endpoint={endpoint}
            onToggleEnabled={handleToggleEnabled}
            onDeleteClick={handleDeleteClick}
            onRotateClick={handleRotateClick}
          />
        ))}
      </div>

      {/* Delete confirm dialog (D-15) */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete webhook?"
        description={
          deleteTarget
            ? `This will permanently remove the webhook endpoint. Event delivery to ${deleteTarget.url} will stop immediately.`
            : undefined
        }
        confirmLabel="Delete webhook"
        cancelLabel="Keep webhook"
        destructive={true}
        onConfirm={handleDeleteConfirm}
      />

      {/* Rotate secret confirm dialog (D-15) */}
      <ConfirmDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        title="Rotate signing secret?"
        description="Your current secret will be invalidated immediately. Any webhook consumers using the old secret will start receiving 401 errors until they update."
        confirmLabel="Rotate secret"
        cancelLabel="Keep current"
        destructive={true}
        onConfirm={handleRotateConfirm}
      />
    </div>
  )
}
