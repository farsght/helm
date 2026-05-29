// packages/ui/src/components/page/detail-skeleton.tsx
// Re-implemented from scratch using MIT Skeleton primitive only — NOT from shadcn.io Pro (D-13)
import * as React from "react"
import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"

type DetailSkeletonProps = React.ComponentProps<"div">

function DetailSkeleton({ className, ...props }: DetailSkeletonProps) {
  return (
    <div
      data-slot="detail-skeleton"
      className={cn("space-y-6", className)}
      {...props}
    >
      {/* Header block: title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {/* Body area: main content + optional sidebar */}
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <div className="w-48 shrink-0 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  )
}

export { DetailSkeleton }
