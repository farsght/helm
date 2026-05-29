"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

export type PaletteItem = {
  type: string
  label: string
  kind: "source" | "transform" | "sink"
  description?: string
}

export type CanvasPaletteProps = {
  items: PaletteItem[]
  onAddNode?: (type: string) => void
}

const KIND_ACCENT: Record<PaletteItem["kind"], string> = {
  source: "bg-[var(--color-chart-1)]",
  transform: "bg-[var(--color-chart-2)]",
  sink: "bg-[var(--color-chart-3)]",
}

export function CanvasPalette({ items, onAddNode }: CanvasPaletteProps) {
  return (
    <div
      className="absolute left-0 top-1/4 z-10 bg-card border rounded-r-lg shadow-sm p-2 space-y-1"
      role="toolbar"
      aria-label="Node palette"
    >
      {items.map((item) => (
        <button
          key={item.type}
          type="button"
          draggable
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left",
            "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "cursor-grab active:cursor-grabbing"
          )}
          aria-label={`Add ${item.label} node`}
          onDragStart={(event) => {
            const payload = JSON.stringify({
              kind: item.kind,
              type: item.type,
              label: item.label,
            })
            event.dataTransfer.setData("application/farsight-palette", payload)
            event.dataTransfer.effectAllowed = "move"
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onAddNode?.(item.type)
            }
          }}
        >
          {/* Kind accent dot */}
          <span
            className={cn("h-2 w-2 rounded-full flex-shrink-0", KIND_ACCENT[item.kind])}
            aria-hidden="true"
          />
          <span className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">{item.label}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground block truncate">
                {item.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
