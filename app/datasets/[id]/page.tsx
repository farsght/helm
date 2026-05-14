"use client";

import * as React from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";

type DatasetMeta = {
  id: number;
  name: string;
  description: string | null;
  source: string;
  rowCount: number;
  status: string;
  columnSchemaJson: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "date" | "boolean";
    sample?: string;
  }> | null;
};

type DatasetRowRecord = {
  id: number;
  rowJson: Record<string, unknown>;
  externalId: string | null;
};

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

function renderCell(value: unknown, type: string): string {
  if (value == null) return "—";
  if (type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const datasetId = parseInt(id, 10);

  const [dataset, setDataset] = React.useState<DatasetMeta | null>(null);
  const [rows, setRows] = React.useState<DatasetRowRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch(`/api/datasets/${datasetId}?limit=500`);
        if (cancelled) return;
        setDataset(data.dataset);
        setRows(data.rows);
      } catch (err) {
        console.error("Load dataset error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const schema = dataset?.columnSchemaJson ?? [];

  const filteredRows = React.useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r.rowJson).some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [rows, search]);

  return (
    <div className="p-8">
      <Link
        href="/datasets"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Datasets
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary shrink-0" />
            <h1 className="text-3xl font-bold text-foreground truncate">
              {dataset?.name ?? (loading ? "Loading…" : `Dataset #${datasetId}`)}
            </h1>
            {dataset && (
              <Badge variant="secondary">{sourceLabel(dataset.source)}</Badge>
            )}
          </div>
          {dataset?.description && (
            <p className="text-muted-foreground mt-1">{dataset.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {dataset?.rowCount.toLocaleString() ?? 0} rows ·{" "}
            {schema.length} columns
          </p>
        </div>
      </div>

      {schema.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search rows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground tabular-nums">
            {filteredRows.length.toLocaleString()} shown
          </span>
        </div>
      )}

      <div className="overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {schema.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{col.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {col.type}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, schema.length)}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading rows…
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, schema.length)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No rows.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {schema.map((col) => (
                    <TableCell key={col.key} className="whitespace-nowrap">
                      {renderCell(row.rowJson[col.key], col.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length === 500 && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing first 500 rows. Pagination coming in v1.1.
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Button variant="outline" disabled>
          Promote to Prospects (coming soon)
        </Button>
        <Button variant="outline" disabled>
          Create List from Filter (coming soon)
        </Button>
      </div>
    </div>
  );
}
