"use client"

import { Controls } from "@xyflow/react"

export function CanvasControls() {
  return (
    <div aria-label="Canvas controls">
      <Controls showZoom showFitView showInteractive={false} />
    </div>
  )
}
