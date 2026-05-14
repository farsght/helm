"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Database,
  FileSpreadsheet,
  Plus,
  Sheet,
  Trash2,
  Upload,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { PageHeader, ConfirmDialog } from "@/components/page";

type DatasetRow = {
  id: number;
  name: string;
  description: string | null;
  source: string;
  rowCount: number;
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

  React.useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => setDatasets(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Fetch datasets error:", err))
      .finally(() => setLoading(false));
  }, []);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f && !uploadName) {
      setUploadName(f.name.replace(/\.csv$/i, ""));
    }
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

  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const onDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await apiFetch(`/api/datasets/${id}`, { method: "DELETE" });
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dataset deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete: ${msg}`);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Datasets" description="Staging workspace for raw data. Import, inspect, transform, then promote into prospects or segments." />
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
              Upload a CSV to get started. You'll be able to browse, filter, and
              edit rows before promoting them.
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((ds) => (
            <Card
              key={ds.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/datasets/${ds.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{ds.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {ds.description || "No description"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(ds.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="secondary">{sourceLabel(ds.source)}</Badge>
                  <span className="text-muted-foreground tabular-nums">
                    {ds.rowCount.toLocaleString()} rows
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Source picker */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Dataset</DialogTitle>
            <DialogDescription>
              Choose a source. Only CSV is wired up for now — the rest are
              coming soon.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 py-2">
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
                <src.icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    {src.title}
                    {!src.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Soon
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {src.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV upload */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            setFile(null);
            setUploadName("");
            setUploadDescription("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
            <DialogDescription>
              We'll infer column types from the first 100 rows. Header row required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., Q1 Trade Show Leads"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-desc">Description</Label>
              <Textarea
                id="ds-desc"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional notes about this dataset"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onUpload}
              disabled={!file || uploading || !uploadName}
            >
              {uploading ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this dataset?"
        description="This will permanently delete the dataset and all its rows. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
