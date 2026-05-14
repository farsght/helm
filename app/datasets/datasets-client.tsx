"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Calendar as CalendarIcon,
  Database,
  Hash,
  Plus,
  Tag,
  Text as TextIcon,
  Trash2,
  Upload,
  Sheet,
  FileSpreadsheet,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { DatasetImportWizard } from "@/components/dataset-import-wizard";
import { apiFetch } from "@/lib/api";

type DatasetRow = {
  id: number;
  name: string;
  description: string | null;
  source: string;
  rowCount: number;
  columnSchemaJson: unknown;
  status: string;
  refreshedAt: string | null;
  createdAt: string;
};

type SourceCard = {
  source: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const SOURCES: SourceCard[] = [
  {
    source: "csv",
    title: "Upload CSV",
    description: "Drop a CSV file. We'll infer column types automatically.",
    icon: Upload,
    enabled: true,
  },
  {
    source: "google_sheets",
    title: "Google Sheets",
    description: "Connect a sheet for one-time import or scheduled sync.",
    icon: Sheet,
    enabled: false,
  },
  {
    source: "hubspot_contacts",
    title: "HubSpot Contacts",
    description: "Import contacts from HubSpot. OAuth required.",
    icon: FileSpreadsheet,
    enabled: false,
  },
  {
    source: "hubspot_companies",
    title: "HubSpot Companies",
    description: "Import companies from HubSpot. OAuth required.",
    icon: FileSpreadsheet,
    enabled: false,
  },
  {
    source: "webhook",
    title: "Webhook",
    description: "Push rows in from any external system via API.",
    icon: Webhook,
    enabled: false,
  },
];

function sourceLabel(source: string): string {
  switch (source) {
    case "csv": return "CSV";
    case "google_sheets": return "Google Sheets";
    case "hubspot_contacts": return "HubSpot Contacts";
    case "hubspot_companies": return "HubSpot Companies";
    case "webhook": return "Webhook";
    case "manual": return "Manual";
    default: return source;
  }
}

function columnCount(row: DatasetRow): number {
  if (!row.columnSchemaJson) return 0;
  try {
    const arr = Array.isArray(row.columnSchemaJson)
      ? row.columnSchemaJson
      : JSON.parse(row.columnSchemaJson as string);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

function DataTableDatasets({ data, onDataChange }: { data: DatasetRow[]; onDataChange: (d: DatasetRow[]) => void }) {
  const router = useRouter();

  const onDelete = React.useCallback(async (id: number) => {
    if (!confirm("Delete this dataset and all its rows?")) return;
    try {
      await apiFetch(`/api/datasets/${id}`, { method: "DELETE" });
      onDataChange(data.filter((d) => d.id !== id));
      toast.success("Dataset deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete: ${msg}`);
    }
  }, [data, onDataChange]);

  const columns = React.useMemo<ColumnDef<DatasetRow>[]>(() => [
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
      meta: { label: "Name", placeholder: "Search datasets...", variant: "text", icon: TextIcon },
      enableColumnFilter: true,
    },
    {
      id: "source",
      accessorKey: "source",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Source" label="Source" />,
      cell: ({ row }) => <Badge variant="secondary">{sourceLabel(row.original.source)}</Badge>,
      meta: {
        label: "Source",
        variant: "select",
        icon: Tag,
        options: [
          { label: "CSV", value: "csv" },
          { label: "Manual", value: "manual" },
          { label: "Webhook", value: "webhook" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "rowCount",
      accessorKey: "rowCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rows" label="Rows" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.rowCount.toLocaleString()}</span>,
      meta: { label: "Rows", variant: "number", icon: Hash },
    },
    {
      id: "columns",
      accessorFn: (row) => columnCount(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Columns" label="Columns" />,
      cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{columnCount(row.original)}</span>,
      meta: { label: "Columns", variant: "number", icon: Hash },
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
          aria-label="Delete dataset"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ], [onDelete]);

  const pageCount = Math.max(1, Math.ceil(data.length / 10));

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    getRowId: (row) => String(row.id),
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DataTable table={table} onRowClick={(row) => router.push(`/datasets/${row.original.id}`)}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function DatasetsClient() {
  const [datasets, setDatasets] = React.useState<DatasetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => setDatasets(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Fetch datasets error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Datasets</h1>
          <p className="text-muted-foreground mt-1">
            Staging workspace for raw data. Import, inspect, transform, then promote into prospects or segments.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Dataset
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : datasets.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              No datasets yet
            </CardTitle>
            <CardDescription>
              Upload a CSV to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTableDatasets data={datasets} onDataChange={setDatasets} />
      )}

      {/* Source picker */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Dataset</DialogTitle>
            <DialogDescription>
              Choose a source. Only CSV is wired up for now — the rest are coming soon.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {SOURCES.map((src) => (
              <button
                key={src.source}
                disabled={!src.enabled}
                onClick={() => {
                  if (src.source === "csv") { setAddOpen(false); setUploadOpen(true); }
                }}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
              >
                <src.icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    {src.title}
                    {!src.enabled && <Badge variant="secondary" className="text-xs">Soon</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{src.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV upload wizard (Step 1 drop → Step 2 preview → Step 3 import → Step 4 done) */}
      <DatasetImportWizard
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onImported={(created) => {
          // Optimistically add to the list so users see it before navigation
          setDatasets((prev) => [
            { ...(created as unknown as DatasetRow) },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}
