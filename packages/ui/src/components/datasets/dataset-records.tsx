"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Database } from "lucide-react"
import { DataTable } from "../data-table/data-table"
import { DataTableSkeleton } from "../data-table/data-table-skeleton"
import { DataTableColumnHeader } from "../data-table/data-table-column-header"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { useDataTable } from "../../hooks/use-data-table"
import { useDatasetRecordsQueryOptions } from "../../hooks/use-datasets"
import { cn } from "../../lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

// ─── Types ────────────────────────────────────────────────────────────────────

type NormalizedRecord = {
  id: string
  datasetId?: string
  createdAt: string
  [key: string]: unknown
}

// ─── DatasetRecords ────────────────────────────────────────────────────────────

export function DatasetRecords({ datasetId, className }: { datasetId: string; className?: string }) {
  const queryOptions = useDatasetRecordsQueryOptions(datasetId)
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)

  if (isLoading) {
    return <DataTableSkeleton columnCount={2} rowCount={5} withPagination={false} />
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load records"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  const records: NormalizedRecord[] = data?.items ?? []

  if (records.length === 0) {
    return (
      <EmptyState
        title="No records"
        description="This dataset has no records yet."
        icon={Database}
      />
    )
  }

  return <DatasetRecordsTable records={records} className={className} />
}

// ─── Inner table (receives stable data) ──────────────────────────────────────

function DatasetRecordsTable({ records, className }: { records: NormalizedRecord[]; className?: string }) {
  const columns = React.useMemo<ColumnDef<NormalizedRecord>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" label="ID" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" label="Created" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  )

  const { table } = useDataTable({ data: records, columns, pageCount: -1 })

  return (
    <div data-slot="dataset-records" className={cn("", className)}>
      <DataTable table={table} />
    </div>
  )
}
