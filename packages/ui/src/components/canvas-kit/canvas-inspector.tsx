"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "../../lib/utils"

export type CanvasInspectorProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function CanvasInspector({ open, onClose, title, children }: CanvasInspectorProps) {
  return (
    <div
      className={cn(
        "absolute right-0 top-0 w-80 h-full bg-card border-l shadow-sm z-10 transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full"
      )}
      aria-hidden={!open}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {title && (
          <h3 className="text-base font-medium truncate">{title}</h3>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close inspector"
          onClick={onClose}
          className="ml-auto flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="h-[calc(100%-57px)]">
        <div className="p-4">{children}</div>
      </ScrollArea>
    </div>
  )
}
