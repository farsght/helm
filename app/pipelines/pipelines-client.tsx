"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar as CalendarIcon, GitFork, Loader2, Plus, Tag, Text as TextIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { apiFetch } from "@/lib/api";

type Pipeline = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  lastRunAt: string | null;
  createdAt: string;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "archived") return "destructive";
  return "secondary";
}

export function PipelinesClient() {
  const router = useRouter();
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((d) => setPipelines(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onDelete = React.useCallback(async (id: number) => {
    if (!confirm("Delete this pipeline?")) return;
    try {
      await apiFetch(`/api/pipelines/${id}`, { method: "DELETE" });
      setPipelines((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pipeline deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, []);

  const handleNew = async () => {
    setCreating(true);
    try {
      const p = await apiFetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Pipeline" }),
      });
      router.push(`/pipelines/${p.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const columns = React.useMemo<ColumnDef<Pipeline>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" label="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { label: "Name", placeholder: "Search pipelines...", variant: "text", icon: TextIcon },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" label="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)} className="capitalize">
          {row.original.status}
        </Badge>
      ),
      meta: {
        label: "Status",
        variant: "select",
        icon: Tag,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Archived", value: "archived" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "lastRunAt",
      accessorKey: "lastRunAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Run" label="Last Run" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.lastRunAt ? new Date(row.original.lastRunAt).toLocaleString() : "Never"}
        </span>
      ),
      meta: { label: "Last Run", variant: "date", icon: CalendarIcon },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" label="Created" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>
      ),
      meta: { label: "Created", variant: "date", icon: CalendarIcon },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); onDelete(row.original.id); }}
          aria-label="Delete pipeline"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ], [onDelete]);

  const pageCount = Math.max(1, Math.ceil(pipelines.length / 10));
  const { table } = useDataTable({
    data: pipelines,
    columns,
    pageCount,
    initialState: { sorting: [{ id: "createdAt", desc: true }], pagination: { pageIndex: 0, pageSize: 10 } },
    getRowId: (row) => String(row.id),
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipelines</h1>
          <p className="text-muted-foreground mt-1">Visual data transformation pipelines — source, transform, and promote data.</p>
        </div>
        <Button onClick={handleNew} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New Pipeline
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitFork className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-medium mb-2">No pipelines yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
              Create a pipeline to transform dataset rows into CRM records, segments, or other datasets.
            </p>
            <Button onClick={handleNew} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable table={table} onRowClick={(row) => router.push(`/pipelines/${row.original.id}`)}>
          <DataTableToolbar table={table} />
        </DataTable>
      )}
    </div>
  );
}
