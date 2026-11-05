"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs"
import { DetailSkeleton } from "../page/detail-skeleton"
import { ErrorState } from "../page/error-state"
import { useDatasetQueryOptions } from "../../hooks/use-datasets"
import { DatasetRecords } from "./dataset-records"
import { DatasetSearch } from "./dataset-search"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatasetDetailProps = {
  datasetId: string
  backHref?: string
  /** Called when user navigates — consumer owns routing. */
  onNavigate?: (href: string) => void
  className?: string
}

// ─── Status badges ─────────────────────────────────────────────────────────────

type VectorizeStatus = "none" | "provisioning" | "ready" | "error" | "deleted"
type SearchBackend = "none" | "vectorize" | "ai_search"

function VectorizeStatusBadge({ status }: { status: VectorizeStatus }) {
  if (status === "none") {
    return <Badge variant="secondary" className="text-xs">None</Badge>
  }
  if (status === "ready") {
    return <Badge variant="outline" className="text-xs text-primary bg-primary/10 border-primary/30">Ready</Badge>
  }
  if (status === "provisioning") {
    return (
      <Badge variant="outline" className="text-xs text-[var(--color-chart-4)] bg-[var(--color-chart-4)]/10 border-[var(--color-chart-4)]/30">
        Provisioning
      </Badge>
    )
  }
  if (status === "error") {
    return <Badge variant="outline" className="text-xs text-destructive bg-destructive/10 border-destructive/30">Error</Badge>
  }
  if (status === "deleted") {
    return <Badge variant="secondary" className="text-xs line-through text-muted-foreground">Deleted</Badge>
  }
  return null
}

function SearchBackendBadge({ backend }: { backend: SearchBackend }) {
  if (backend === "none") return <Badge variant="secondary" className="text-xs">Keyword search</Badge>
  if (backend === "vectorize") return <Badge variant="outline" className="text-xs text-primary border-primary/30">Vector search</Badge>
  if (backend === "ai_search") return <Badge variant="outline" className="text-xs text-[var(--color-chart-2)] border-[var(--color-chart-2)]/30">AI search</Badge>
  return null
}

// ─── DatasetDetail ─────────────────────────────────────────────────────────────

export function DatasetDetail({ datasetId, backHref, onNavigate, className }: DatasetDetailProps) {
  const queryOptions = useDatasetQueryOptions(datasetId)
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)

  if (isLoading) return <DetailSkeleton />

  if (isError) {
    return (
      <ErrorState
        title="Could not load dataset"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  const dataset = data

  if (!dataset) return null

  return (
    <div data-slot="dataset-detail" className={cn("p-8 space-y-6", className)}>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        onClick={() => onNavigate?.(backHref ?? "/datasets")}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to datasets
      </Button>

      {/* Metadata card */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium">{dataset.name}</h2>
        {dataset.description && (
          <p className="text-sm text-muted-foreground mt-1">{dataset.description}</p>
        )}

        <Separator className="my-4" />

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kind</span>
            <Badge variant="outline" className="capitalize text-xs">{dataset.kind}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Search</span>
            <SearchBackendBadge backend={dataset.searchBackend} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Vectorize</span>
            <VectorizeStatusBadge status={dataset.vectorizeStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Records</span>
            <span className="text-xs tabular-nums">{dataset.recordCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Created</span>
            <span className="text-xs text-muted-foreground">
              {new Date(dataset.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Records + Search */}
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
        <TabsContent value="records" className="mt-4">
          <DatasetRecords datasetId={datasetId} />
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <DatasetSearch datasetId={datasetId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
