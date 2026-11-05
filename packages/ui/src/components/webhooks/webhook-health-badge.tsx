import * as React from "react"
import { CheckCircle2, AlertCircle, CircleOff } from "lucide-react"
import type { WebhookEndpoint } from "@farsight/contracts"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"

// ─── Health derivation (D-15 — locked) ────────────────────────────────────────

export function deriveHealth(endpoint: WebhookEndpoint): "Healthy" | "Failing" | "Disabled" {
  if (!endpoint.enabled) return "Disabled"
  if (
    endpoint.failureCount > 0 ||
    (endpoint.lastFailureAt && endpoint.lastSuccessAt &&
      endpoint.lastFailureAt > endpoint.lastSuccessAt)
  ) return "Failing"
  return "Healthy"
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const HEALTH_CLASS: Record<string, string> = {
  Healthy: "text-primary bg-primary/10 border-primary/20",
  Failing: "text-destructive bg-destructive/10 border-destructive/20",
  Disabled: "text-muted-foreground",
}

const HEALTH_VARIANT: Record<string, "outline" | "secondary"> = {
  Healthy: "outline",
  Failing: "outline",
  Disabled: "secondary",
}

const HEALTH_ICON: Record<string, React.ElementType> = {
  Healthy: CheckCircle2,
  Failing: AlertCircle,
  Disabled: CircleOff,
}

// ─── Component ────────────────────────────────────────────────────────────────

export type WebhookHealthBadgeProps = {
  endpoint: WebhookEndpoint
  className?: string
}

export function WebhookHealthBadge({ endpoint, className }: WebhookHealthBadgeProps) {
  const status = deriveHealth(endpoint)
  const Icon = HEALTH_ICON[status]

  return (
    <Badge
      variant={HEALTH_VARIANT[status]}
      className={cn("text-xs h-5 gap-1", HEALTH_CLASS[status], className)}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  )
}
