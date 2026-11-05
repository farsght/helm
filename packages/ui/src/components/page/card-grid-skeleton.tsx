// packages/ui/src/components/page/card-grid-skeleton.tsx
// Re-implemented from scratch using MIT Skeleton primitive only — NOT from shadcn.io Pro (D-13)
import * as React from "react"
import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"

const TITLE_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5", "w-2/3"] as const
const BODY_WIDTHS = ["w-full", "w-5/6", "w-full", "w-4/5", "w-full", "w-5/6"] as const
const COLS = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
} as const

type CardGridSkeletonProps = React.ComponentProps<"div"> & {
  /** Number of skeleton cards to render. @default 6 */
  count?: number
  /** Grid column count on sm+ breakpoint. @default 2 */
  columns?: keyof typeof COLS
}

function CardGridSkeleton({ count = 6, columns = 2, className, ...props }: CardGridSkeletonProps) {
  return (
    <div
      data-slot="card-grid-skeleton"
      className={cn("overflow-hidden rounded-lg border bg-card", className)}
      {...props}
    >
      <div className={cn("grid grid-cols-1 gap-px bg-border", COLS[columns])}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-3 bg-card p-4">
            <Skeleton className="h-24 w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className={cn("h-4", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className={cn("h-3", BODY_WIDTHS[i % BODY_WIDTHS.length])} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { CardGridSkeleton }
