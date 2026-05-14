"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { ArrowLeft, Database, Download, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/data-grid/data-grid";
import { DataGridFilterMenu } from "@/components/data-grid/data-grid-filter-menu";
import { DataGridKeyboardShortcuts } from "@/components/data-grid/data-grid-keyboard-shortcuts";
import { DataGridRowHeightMenu } from "@/components/data-grid/data-grid-row-height-menu";
import { getDataGridSelectColumn } from "@/components/data-grid/data-grid-select-column";
import { DataGridSortMenu } from "@/components/data-grid/data-grid-sort-menu";
import { DataGridViewMenu } from "@/components/data-grid/data-grid-view-menu";
import { VariantMenu } from "@/components/data-grid/variant-menu";
import { useDataGrid } from "@/hooks/use-data-grid";
import { useWindowSize } from "@/hooks/use-window-size";
import { getFilterFn } from "@/lib/data-grid-filters";
import { apiFetch } from "@/lib/api";
import type { CellVariant } from "@/lib/data-grid-coercion";
import type { CellOpts, CellUpdate } from "@/types/data-grid";

type DatasetColumn = {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean";
  sample?: string;
};

type DatasetMeta = {
  id: number;
  name: string;
  description: string | null;
  source: string;
  rowCount: number;
  columnSchemaJson: DatasetColumn[] | null;
};

type DatasetRowRecord = {
  id: number;
  rowJson: Record<string, unknown>;
  externalId: string | null;
};

type GridRow = Record<string, unknown> & { __rowId: number };

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

function schemaTypeToVariant(type: DatasetColumn["type"]): CellVariant {
  switch (type) {
    case "number": return "number";
    case "date": return "date";
    case "boolean": return "checkbox";
    default: return "short-text";
  }
}

function variantToSchemaType(variant: CellVariant): DatasetColumn["type"] {
  switch (variant) {
    case "number": return "number";
    case "date": return "date";
    case "checkbox": return "boolean";
    default: return "string";
  }
}

function buildColumns(
  schema: DatasetColumn[],
  variantsRef: React.RefObject<Record<string, CellVariant>>,
  rowsRef: React.RefObject<GridRow[]>,
  onApplyRef: React.RefObject<(colKey: string, newVariant: CellVariant, newData: GridRow[]) => void>,
): ColumnDef<GridRow>[] {
  const filterFn = getFilterFn<GridRow>();
  return [
    getDataGridSelectColumn<GridRow>({ enableRowMarkers: true }),
    ...schema.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: (ctx: HeaderContext<GridRow, unknown>) => (
        <VariantMenu<GridRow>
          header={ctx.header}
          table={ctx.table}
          label={col.label}
          columnId={col.key}
          variant={variantsRef.current[col.key] ?? "short-text"}
          data={rowsRef.current}
          rowIdKey="__rowId"
          onApply={(newVariant, newData) =>
            onApplyRef.current(col.key, newVariant, newData)
          }
        />
      ),
      minSize: col.type === "number" ? 120 : 180,
      filterFn,
      meta: {
        label: col.label,
        cell: { variant: variantsRef.current[col.key] ?? schemaTypeToVariant(col.type) } as CellOpts,
      },
    })),
  ];
}

function exportCsv(schema: DatasetColumn[], rows: GridRow[]) {
  const headers = schema.map((c) => c.label);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      schema.map((c) => {
        const v = r[c.key];
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dataset.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function DatasetDetailClient({ id }: { id: string }) {
  const datasetId = parseInt(id, 10);
  const [dataset, setDataset] = React.useState<DatasetMeta | null>(null);
  const [rows, setRows] = React.useState<GridRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [variants, setVariants] = React.useState<Record<string, CellVariant>>({});
  const LIMIT = 100;

  const windowSize = useWindowSize();

  const load = React.useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const offset = pg * LIMIT;
      const data = await apiFetch(`/api/datasets/${datasetId}?limit=${LIMIT}&offset=${offset}`);
      setDataset(data.dataset);
      setTotal(data.dataset.rowCount);
      const gridRows: GridRow[] = (data.rows as DatasetRowRecord[]).map((r) => ({
        __rowId: r.id,
        ...r.rowJson,
      }));
      setRows(gridRows);
      // Initialize variants from schema
      const schema: DatasetColumn[] = data.dataset.columnSchemaJson ?? [];
      setVariants((prev) => {
        const next: Record<string, CellVariant> = {};
        for (const col of schema) {
          // Keep existing overrides, fall back to schema type
          next[col.key] = prev[col.key] ?? schemaTypeToVariant(col.type);
        }
        return next;
      });
    } catch (err) {
      console.error("Load dataset error:", err);
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  React.useEffect(() => { load(page); }, [load, page]);

  const schema = dataset?.columnSchemaJson ?? [];

  // Stable refs so header render functions never go stale
  const variantsRef = React.useRef(variants);
  variantsRef.current = variants;

  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  const onApplyVariant = React.useCallback(
    async (colKey: string, newVariant: CellVariant, newData: GridRow[]) => {
      // Update local state
      setRows(newData);
      setVariants((prev) => ({ ...prev, [colKey]: newVariant }));

      // Persist updated columnSchemaJson
      const currentSchema = dataset?.columnSchemaJson ?? [];
      const updatedSchema = currentSchema.map((col) =>
        col.key === colKey ? { ...col, type: variantToSchemaType(newVariant) } : col
      );
      try {
        await apiFetch(`/api/datasets/${datasetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnSchemaJson: updatedSchema }),
        });
        setDataset((prev) => prev ? { ...prev, columnSchemaJson: updatedSchema } : prev);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to save column type: ${msg}`);
      }
    },
    [datasetId, dataset]
  );

  const onApplyRef = React.useRef(onApplyVariant);
  onApplyRef.current = onApplyVariant;

  const columns = React.useMemo(
    () => buildColumns(schema, variantsRef, rowsRef, onApplyRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema, variants]
  );

  const onDataUpdate = React.useCallback(async (updates: CellUpdate | CellUpdate[]) => {
    const arr = Array.isArray(updates) ? updates : [updates];
    for (const u of arr) {
      const row = rows[u.rowIndex];
      if (!row) continue;
      const rowId = row.__rowId as number;
      try {
        await apiFetch(`/api/datasets/${datasetId}/rows/${rowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: u.columnId, value: u.value }),
        });
        setRows((prev) =>
          prev.map((r, i) => (i === u.rowIndex ? { ...r, [u.columnId]: u.value } : r))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to save: ${msg}`);
      }
    }
  }, [rows, datasetId]);

  const onRowAdd = React.useCallback(async () => {
    try {
      const res = await apiFetch(`/api/datasets/${datasetId}/rows`, { method: "POST" });
      const newRow: GridRow = { __rowId: res.id, ...res.rowJson };
      setRows((prev) => [...prev, newRow]);
      setTotal((t) => t + 1);
      return { rowIndex: rows.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to add row: ${msg}`);
      return null;
    }
  }, [datasetId, rows.length]);

  const onRowsDelete = React.useCallback(async (rowsToDelete: GridRow[]) => {
    const ids = rowsToDelete.map((r) => r.__rowId as number);
    if (!confirm(`Delete ${ids.length} row${ids.length === 1 ? "" : "s"}?`)) return;
    try {
      await apiFetch(`/api/datasets/${datasetId}/rows`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setRows((prev) => prev.filter((r) => !ids.includes(r.__rowId as number)));
      setTotal((t) => t - ids.length);
      toast.success(`${ids.length} row${ids.length === 1 ? "" : "s"} deleted`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to delete: ${msg}`);
    }
  }, [datasetId]);

  const { table, tableMeta, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange: setRows,
    onRowAdd,
    onRowsDelete,
    getRowId: (row) => String(row.__rowId),
    initialState: { columnPinning: { left: ["select"] } },
    enableSearch: true,
    meta: {
      onDataUpdate,
    },
  });

  const height = Math.max(400, windowSize.height - 280);
  const pageCount = Math.ceil(total / LIMIT);

  if (loading && !dataset) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-4">
      <Link href="/datasets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Datasets
      </Link>

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary shrink-0" />
            <h1 className="text-3xl font-bold text-foreground truncate">
              {dataset?.name ?? `Dataset #${datasetId}`}
            </h1>
            {dataset && <Badge variant="secondary">{sourceLabel(dataset.source)}</Badge>}
          </div>
          {dataset?.description && (
            <p className="text-muted-foreground mt-1">{dataset.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {total.toLocaleString()} rows · {schema.length} columns
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => exportCsv(schema, rows)}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => onRowAdd()}>
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>
      </div>

      <div role="toolbar" aria-orientation="horizontal" className="flex items-center gap-2 self-end">
        <DataGridKeyboardShortcuts enableSearch enableRowsDelete />
        <DataGridFilterMenu table={table} align="end" />
        <DataGridSortMenu table={table} align="end" />
        <DataGridRowHeightMenu table={table} align="end" />
        <DataGridViewMenu table={table} align="end" />
      </div>

      <DataGrid
        {...dataGridProps}
        table={table}
        tableMeta={tableMeta}
        height={height}
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {pageCount} ({total.toLocaleString()} total rows)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
