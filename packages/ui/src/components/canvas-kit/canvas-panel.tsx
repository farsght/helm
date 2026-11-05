"use client"

import { Panel, type PanelPosition } from "@xyflow/react"

export type CanvasPanelProps = {
  position: PanelPosition
  children: React.ReactNode
  className?: string
}

export function CanvasPanel({ position, children, className }: CanvasPanelProps) {
  return (
    <Panel position={position} className={className}>
      {children}
    </Panel>
  )
}
