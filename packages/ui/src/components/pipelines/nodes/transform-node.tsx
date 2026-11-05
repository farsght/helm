"use client"

import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import { cn } from "../../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineNodeData = {
  type: string
  parameters: Record<string, unknown>
  name?: string
  disabled: boolean
}

type TransformNodeProps = {
  data: PipelineNodeData
  selected?: boolean
}

// ─── TransformNode ────────────────────────────────────────────────────────────

/**
 * xyflow custom node for Farsight transform-type pipeline nodes (core.transform.*).
 * Accent strip: bg-[var(--color-chart-2)] (chart token 2).
 * No hardcoded hex colors — all colors are CSS token references.
 */
export const TransformNode = memo(({ data, selected }: TransformNodeProps) => (
  <div
    className={cn(
      "relative rounded-lg border-2 bg-card w-[200px] shadow-sm transition-all",
      "border-border",
      selected && "ring-2 ring-primary",
      data.disabled && "opacity-50 pointer-events-none"
    )}
  >
    {/* Accent strip — transform = chart-2 */}
    <div className="h-1 rounded-t-lg bg-[var(--color-chart-2)]" />

    {/* Target handle (input — left side) */}
    <Handle
      type="target"
      position={Position.Left}
      className="!bg-primary !border-primary"
    />

    {/* Node body */}
    <div className="p-2">
      <div className="text-xs font-medium truncate">{data.name ?? "Transform"}</div>
      <code className="text-[10px] text-muted-foreground font-mono truncate block">
        {data.type}
      </code>
    </div>

    {/* Source handle (output — right side) */}
    <Handle
      type="source"
      position={Position.Right}
      className="!bg-primary !border-primary"
    />
  </div>
))

TransformNode.displayName = "TransformNode"
