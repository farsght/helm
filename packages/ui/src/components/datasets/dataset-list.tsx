"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Database, FolderOpen, Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ListSkeleton } from "../page/list-skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { ConfirmDialog } from "../page/confirm-dialog"
import { DataTable } from "../data-table/data-table"
import { DataTableColumnHeader } from "../data-table/data-table-column-header"
import { useDataTable } from "../../hooks/use-data-table"
import { useDatasetsQueryOptions, useDeleteDatasetMutation } from "../../hooks/use-datasets"
import { useTenant } from "../../provider/use-tenant"
import { cn } from "../../lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

// ─── Types ────────────────────────────────────────────────────────────────────

type Dataset = {
  id: string
  projectId: string
  name: string
  description?: string
  kind: "raw" | "derived" | "eval"
  searchBackend: "none" | "vectorize" | "ai_search"
  recordCount: number
  vectorizeStatus: "none" | "provisioning" | "ready" | "error" | "deleted"
  aiSearchStatus: "none" | "provisioning" | "ready" | "error" | "deleted"
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type DatasetListProps = {
  /** Called when user navigates to a dataset — consumer owns routing. */
  onNavigate?: (href: string) => void
  /** Called when user initiates dataset creation. */
  onCreateDataset?: () => void
  className?: string
}

// ─── Status badge helpers ─────────────────────────────────────────────────────

function VectorizeStatusBadge({ status }: { status: Dataset["vectorizeStatus"] }) {
  if (status === "none") {
    return (
      <Badge variant="secondary" className="text-xs">
        None
      </Badge>
    )
  }
  if (status === "ready") {
    return (
      <Badge variant="outline" className="text-xs text-primary bg-primary/10 border-primary/30">
        Ready
      </Badge>
    )
  }
  if (status === "provisioning") {
    return (
      <Badge
        variant="outline"
        className="text-xs text-[var(--color-chart-4)] bg-[var(--color-chart-4)]/10 border-[var(--color-chart-4)]/30"
      >
        Provisioning
      </Badge>
    )
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="text-xs text-destructive bg-destructive/10 border-destructive/30">
        Error
      </Badge>
    )
  }
  if (status === "deleted") {
    return (
      <Badge variant="secondary" className="text-xs line-through text-muted-foreground">
        Deleted
      </Badge>
    )
  }
  return null
}

function SearchBackendBadge({ backend }: { backend: Dataset["searchBackend"] }) {
  if (backend === "none") {
    return (
      <Badge variant="secondary" className="text-xs">
        None
      </Badge>
    )
  }
  if (backend === "vectorize") {
    return (
      <Badge variant="outline" className="text-xs text-primary border-primary/30">
        Vectorize
      </Badge>
    )
  }
  if (backend === "ai_search") {
    return (
      <Badge variant="outline" className="text-xs text-[var(--color-chart-2)] border-[var(--color-chart-2)]/30">
        AI Search
      </Badge>
    )
  }
  return null
}

// ─── DatasetList ──────────────────────────────────────────────────────────────

export function DatasetList({ onNavigate, onCreateDataset, className }: DatasetListProps) {
  const tenant = useTenant()
  const queryOptions = useDatasetsQueryOptions()
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)
  const deleteMutation = useDeleteDatasetMutation()

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Dataset | null>(null)

  // D-02: no project selected — render EmptyState, query is disabled
  if (!tenant.projectSlug) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project to view its datasets."
        icon={FolderOpen}
      />
    )
  }

  if (isLoading) return <ListSkeleton count={5} />

  if (isError) {
    return (
      <ErrorState
        title="Could not load datasets"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  const items: Dataset[] = data?.items ?? []

  if (items.length === 0) {
    return (
      <EmptyState
        title="No datasets"
        description="Create a dataset in Farsight to get started."
        icon={Database}
        action={
          onCreateDataset ? (
            <Button size="sm" onClick={onCreateDataset}>
              New dataset
            </Button>
          ) : undefined
        }
      />
    )
  }

  function handleDeleteClick(dataset: Dataset) {
    setDeleteTarget(dataset)
    setDeleteOpen(true)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        setDeleteTarget(null)
      },
      onError: () => {
        toast.error("Could not delete dataset. Try again.")
        setDeleteOpen(false)
        setDeleteTarget(null)
      },
    })
  }

  return (
    <DatasetListInner
      items={items}
      onNavigate={onNavigate}
      onDeleteClick={handleDeleteClick}
      deleteOpen={deleteOpen}
      setDeleteOpen={setDeleteOpen}
      deleteTarget={deleteTarget}
      handleDeleteConfirm={handleDeleteConfirm}
      className={className}
    />
  )
}

// ─── Inner list (receives stable data) ───────────────────────────────────────

type DatasetListInnerProps = {
  items: Dataset[]
  onNavigate?: (href: string) => void
  onDeleteClick: (dataset: Dataset) => void
  deleteOpen: boolean
  setDeleteOpen: (open: boolean) => void
  deleteTarget: Dataset | null
  handleDeleteConfirm: () => void
  className?: string
}

function DatasetListInner({
  items,
  onNavigate,
  onDeleteClick,
  deleteOpen,
  setDeleteOpen,
  deleteTarget,
  handleDeleteConfirm,
  className,
}: DatasetListInnerProps) {
  const columns = React.useMemo<ColumnDef<Dataset>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" label="Name" />
        ),
        cell: ({ row }) => (
          <button
            className="text-sm font-medium text-left hover:underline"
            onClick={() => onNavigate?.(`/datasets/${row.original.id}`)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Kind" label="Kind" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize text-xs">
            {row.original.kind}
          </Badge>
        ),
      },
      {
        id: "recordCount",
        accessorKey: "recordCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Records" label="Records" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-right block">
            {row.original.recordCount.toLocaleString()}
          </span>
        ),
      },
      {
        id: "searchBackend",
        accessorKey: "searchBackend",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Search" label="Search" />
        ),
        cell: ({ row }) => <SearchBackendBadge backend={row.original.searchBackend} />,
      },
      {
        id: "vectorizeStatus",
        accessorKey: "vectorizeStatus",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" label="Status" />
        ),
        cell: ({ row }) => <VectorizeStatusBadge status={row.original.vectorizeStatus} />,
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
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete dataset"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteClick(row.original)
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onNavigate, onDeleteClick],
  )

  const { table } = useDataTable({ data: items, columns, pageCount: -1 })

  return (
    <div data-slot="dataset-list" className={cn("space-y-4", className)}>
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Datasets</h2>
      </div>

      <DataTable table={table} />

      {/* Delete confirm dialog (T-04-02-E) */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete dataset?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}" and all its records. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete dataset"
        cancelLabel="Keep dataset"
        destructive={true}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
