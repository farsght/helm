"use client"

import { Loader2, CheckCircle2, XCircle, X } from "lucide-react"
import { Button } from "../ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type RunResult = {
  runId: string
  status: "accepted" | "running" | "completed" | "failed" | string
}

export type WorkflowRunViewProps = {
  runResult: RunResult | null
  onDismiss: () => void
}

// ─── Status config ────────────────────────────────────────────────────────────

function getStatusConfig(status: string): {
  label: string
  icon: React.ReactNode
} {
  switch (status) {
    case "accepted":
      return {
        label: "Run queued",
        icon: <Loader2 className="h-4 w-4 animate-spin text-[var(--color-chart-4)]" />,
      }
    case "running":
      return {
        label: "Run in progress",
        icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
      }
    case "completed":
      return {
        label: "Run completed",
        icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
      }
    case "failed":
      return {
        label: "Run failed",
        icon: <XCircle className="h-4 w-4 text-destructive" />,
      }
    default:
      return {
        label: status,
        icon: null,
      }
  }
}

// ─── WorkflowRunView ──────────────────────────────────────────────────────────

/**
 * Inline status card shown below the WorkflowCanvas toolbar after "Run pipeline" is triggered.
 * Returns null when runResult is null (hidden state).
 */
export function WorkflowRunView({ runResult, onDismiss }: WorkflowRunViewProps) {
  if (!runResult) return null

  const { label, icon } = getStatusConfig(runResult.status)

  return (
    <div className="border rounded-md bg-card px-4 py-2 flex items-center gap-2">
      {/* Status icon */}
      {icon}

      {/* Status text with aria-live for screen reader announcements */}
      <p className="text-sm">
        <span aria-live="polite">{label}</span>
        <span className="font-mono text-xs text-muted-foreground ml-2">
          ID: {runResult.runId}
        </span>
      </p>

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss run status"
        className="ml-auto"
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
