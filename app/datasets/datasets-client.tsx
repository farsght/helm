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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { ConfirmDialog, EmptyState, PageHeader } from "@/components/page";
import { useDataTable } from "@/hooks/use-data-table";
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
    description: "Drop a CSV file. We’ll infer column types automatically.",
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

function DataTableDatasets({
  data,
  onDeleteRequest,
}: {
  data: DatasetRow[];
  onDeleteRequest: (id: number) => void;
}) {
  const router = useRouter();

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
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(row.original.id);
          }}
          aria-label="Delete dataset"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ], [onDeleteRequest]);

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
  const router = useRouter();
  const [datasets, setDatasets] = React.useState<DatasetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadName, setUploadName] = React.useState("");
  const [uploadDescription, setUploadDescription] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => setDatasets(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Fetch datasets error:", err))
      .finally(() => setLoading(false));
  }, []);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f && !uploadName) setUploadName(f.name.replace(/\.csv$/i, ""));
  };

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", uploadName || file.name);
      if (uploadDescription) form.append("description", uploadDescription);
      const res = await fetch("/api/datasets", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      const created: DatasetRow = await res.json();
      toast.success(`Imported ${created.rowCount} rows`);
      setUploadOpen(false);
      setAddOpen(false);
      setFile(null);
      setUploadName("");
      setUploadDescription("");
      router.push(`/datasets/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to import: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await apiFetch(`/api/datasets/${id}`, { method: "DELETE" });
      setDatasets((prev) => prev.filter((dataset) => dataset.id !== id));
      toast.success("Dataset deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete: ${msg}`);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        className="mb-6"
        title="Datasets"
        description="Staging workspace for raw data. Import, inspect, transform, then promote into prospects or segments."
        actions={(
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        )}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : datasets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState
              icon={Database}
              title="No datasets yet"
              description="Upload a CSV to get started."
              action={(
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first dataset
                </Button>
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <DataTableDatasets data={datasets} onDeleteRequest={setDeleteId} />
      )}

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
                  if (src.source === "csv") {
                    setAddOpen(false);
                    setUploadOpen(true);
                  }
                }}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border"
              >
                <src.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {src.title}
                    {!src.enabled && <Badge variant="secondary" className="text-xs">Soon</Badge>}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{src.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => {
        setUploadOpen(open);
        if (!open) {
          setFile(null);
          setUploadName("");
          setUploadDescription("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
            <DialogDescription>
              We’ll infer column types from the first 100 rows. Header row required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
              {file && <p className="text-sm text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-name">Name</Label>
              <Input id="ds-name" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g., Q1 Trade Show Leads" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-desc">Description</Label>
              <Textarea id="ds-desc" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Optional notes about this dataset" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={onUpload} disabled={!file || uploading || !uploadName}>
              {uploading ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete this dataset?"
        description="This will permanently delete the dataset and all its rows. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
