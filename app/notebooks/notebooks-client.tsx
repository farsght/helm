"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, Calendar as CalendarIcon, Hash, Loader2, Plus, Tag, Text as TextIcon, Trash2 } from "lucide-react";
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

type Notebook = {
  id: number;
  name: string;
  description: string | null;
  language: string;
  cellCount: number;
  createdAt: string;
};

export function NotebooksClient() {
  const router = useRouter();
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/notebooks")
      .then((r) => r.json())
      .then((d) => setNotebooks(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onDelete = React.useCallback(async (id: number) => {
    if (!confirm("Delete this notebook?")) return;
    try {
      await apiFetch(`/api/notebooks/${id}`, { method: "DELETE" });
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notebook deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, []);

  const handleNew = async () => {
    setCreating(true);
    try {
      const nb = await apiFetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Notebook" }),
      });
      router.push(`/notebooks/${nb.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const columns = React.useMemo<ColumnDef<Notebook>[]>(() => [
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
      meta: { label: "Name", placeholder: "Search notebooks...", variant: "text", icon: TextIcon },
      enableColumnFilter: true,
    },
    {
      id: "language",
      accessorKey: "language",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Language" label="Language" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className="uppercase text-xs">
          {row.original.language === "javascript" ? "JS" : row.original.language}
        </Badge>
      ),
      meta: {
        label: "Language",
        variant: "select",
        icon: Tag,
        options: [
          { label: "JavaScript", value: "javascript" },
          { label: "Python", value: "python" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "cellCount",
      accessorKey: "cellCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cells" label="Cells" />,
      cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.cellCount}</span>,
      meta: { label: "Cells", variant: "number", icon: Hash },
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
          aria-label="Delete notebook"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ], [onDelete]);

  const pageCount = Math.max(1, Math.ceil(notebooks.length / 10));
  const { table } = useDataTable({
    data: notebooks,
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
          <h1 className="text-3xl font-bold text-foreground">Notebooks</h1>
          <p className="text-muted-foreground mt-1">Runnable code notebooks for data transformation and analysis.</p>
        </div>
        <Button onClick={handleNew} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New Notebook
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : notebooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notebooks yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
              Create a notebook to write and run JavaScript code against your datasets.
            </p>
            <Button onClick={handleNew} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Notebook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable table={table} onRowClick={(row) => router.push(`/notebooks/${row.original.id}`)}>
          <DataTableToolbar table={table} />
        </DataTable>
      )}
    </div>
  );
}
