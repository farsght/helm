"use client"

import { Background, BackgroundVariant } from "@xyflow/react"

export function CanvasBackground() {
  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={16}
      color="var(--color-border)"
    />
  )
}
