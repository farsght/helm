// packages/ui/src/components/page/list-skeleton.tsx
// Re-implemented from scratch using MIT Skeleton primitive only — NOT from shadcn.io Pro (D-13)
import * as React from "react"
import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"

const TITLE_WIDTHS = ["w-1/3", "w-2/5", "w-1/4", "w-2/5", "w-1/3"] as const
const SUBTITLE_WIDTHS = ["w-1/2", "w-2/3", "w-3/5", "w-1/2", "w-2/3"] as const

type ListSkeletonProps = React.ComponentProps<"div"> & {
  /** Number of skeleton rows to render. @default 5 */
  count?: number
}

function ListSkeleton({ count = 5, className, ...props }: ListSkeletonProps) {
  return (
    <div
      data-slot="list-skeleton"
      className={cn("divide-y divide-border rounded-lg border bg-card", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          {/* Avatar circle */}
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          {/* Title + subtitle lines */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn("h-4", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
            <Skeleton className={cn("h-3", SUBTITLE_WIDTHS[i % SUBTITLE_WIDTHS.length])} />
          </div>
        </div>
      ))}
    </div>
  )
}

export { ListSkeleton }
