"use client"

import { MiniMap } from "@xyflow/react"

export function CanvasMiniMap() {
  return (
    <MiniMap
      nodeColor="var(--color-muted)"
      maskColor="var(--color-background, hsl(var(--background)))"
      className="border rounded-lg"
    />
  )
}
