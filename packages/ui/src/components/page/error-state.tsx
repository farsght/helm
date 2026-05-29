// packages/ui/src/components/page/error-state.tsx
// Re-implemented from scratch per D-13 — NOT copied from shadcn.io
import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"

type ErrorStateProps = {
  title?: string
  description?: string
  /** Lucide icon — accepts the component type, NOT a string */
  icon?: LucideIcon
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
}

function ErrorState({
  title = "Something went wrong",
  description,
  icon: Icon,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}
    >
      {Icon && <Icon className="h-10 w-10 text-destructive/60 mb-3" />}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}

export { ErrorState }
export type { ErrorStateProps }
