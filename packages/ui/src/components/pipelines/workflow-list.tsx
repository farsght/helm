"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Workflow, FolderOpen } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ListSkeleton } from "../page/list-skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { useWorkflowsQueryOptions } from "../../hooks/use-workflows"
import { useTenant } from "../../provider/use-tenant"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowListProps = {
  /** Called when user navigates to a pipeline canvas (e.g. /pipelines/:wfSlug). */
  onNavigate?: (href: string) => void
  /** Called when user clicks "New pipeline" CTA. */
  onCreateWorkflow?: () => void
  className?: string
}

// ─── WorkflowList ─────────────────────────────────────────────────────────────

export function WorkflowList({
  onNavigate,
  onCreateWorkflow,
  className,
}: WorkflowListProps) {
  const tenant = useTenant()
  const queryOpts = useWorkflowsQueryOptions()
  const { data, isLoading, isError, refetch } = useQuery(queryOpts)

  // D-02: no project selected — render EmptyState, query is disabled
  if (!tenant.projectSlug) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project to view its pipelines."
        icon={FolderOpen}
      />
    )
  }

  if (isLoading) {
    return <ListSkeleton count={3} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load pipelines"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  // Workflows list — shape: { items: Workflow[] } or { workflows: Workflow[] }
  // The contract returns a list; handle either property name defensively.
  const workflows =
    (data as { items?: unknown[]; workflows?: unknown[] } | undefined)?.items ??
    (data as { items?: unknown[]; workflows?: unknown[] } | undefined)?.workflows ??
    []

  if (workflows.length === 0) {
    return (
      <EmptyState
        title="No pipelines"
        description="Create a pipeline to automate your data workflows."
        icon={Workflow}
        action={
          <Button size="sm" onClick={onCreateWorkflow}>
            New pipeline
          </Button>
        }
      />
    )
  }

  return (
    <div data-slot="workflow-list" className={cn("p-8", className)}>
      {/* Heading row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Pipelines</h2>
        <Button size="sm" onClick={onCreateWorkflow}>
          New pipeline
        </Button>
      </div>

      {/* List card */}
      <div className="rounded-lg border bg-card divide-y divide-border">
        {(workflows as Array<{
          id: string
          slug: string
          name: string
          active: boolean
          activeVersion: number | null
        }>).map((wf) => (
          <div
            key={wf.id}
            className="flex items-center justify-between px-4 py-2 gap-4"
          >
            {/* Left: name + slug */}
            <div>
              <p className="text-sm font-medium">{wf.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{wf.slug}</p>
            </div>

            {/* Right: badge, version, open button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge
                variant={wf.active ? "outline" : "secondary"}
                className={wf.active ? "text-primary border-primary/30" : ""}
              >
                {wf.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                v{wf.activeVersion ?? "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate?.(`/pipelines/${wf.slug}`)}
                aria-label="Open pipeline canvas"
              >
                <Workflow className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
