"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { DataGrid } from "@/components/data-grid/data-grid";
import { DataGridFilterMenu } from "@/components/data-grid/data-grid-filter-menu";
import { DataGridKeyboardShortcuts } from "@/components/data-grid/data-grid-keyboard-shortcuts";
import { DataGridRowHeightMenu } from "@/components/data-grid/data-grid-row-height-menu";
import { getDataGridSelectColumn } from "@/components/data-grid/data-grid-select-column";
import { DataGridSortMenu } from "@/components/data-grid/data-grid-sort-menu";
import { DataGridViewMenu } from "@/components/data-grid/data-grid-view-menu";
import { useWindowSize } from "@/hooks/use-window-size";
import { useDataGrid } from "@/hooks/use-data-grid";
import { getFilterFn } from "@/lib/data-grid-filters";
import { apiFetch } from "@/lib/api";

import { DataGridActionBar } from "./data-grid-action-bar";

export type ListRow = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const typeOptions = [
  { label: "Static", value: "static" },
  { label: "Dynamic", value: "dynamic" },
];

interface DataGridListsProps {
  data: ListRow[];
  onDataChange?: (data: ListRow[]) => void;
}

export function DataGridLists({ data, onDataChange }: DataGridListsProps) {
  const windowSize = useWindowSize();
  const filterFn = React.useMemo(() => getFilterFn<ListRow>(), []);

  const columns = React.useMemo<ColumnDef<ListRow>[]>(
    () => [
      getDataGridSelectColumn<ListRow>({ enableRowMarkers: true }),
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        minSize: 260,
        filterFn,
        meta: {
          label: "Name",
          cell: { variant: "short-text" },
        },
        cell: ({ row }) => (
          <Link
            href={`/lists/${row.original.id}`}
            className="text-[#266DF0] hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        minSize: 320,
        filterFn,
        meta: {
          label: "Description",
          cell: { variant: "long-text" },
        },
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        minSize: 140,
        filterFn,
        meta: {
          label: "Type",
          cell: { variant: "select", options: typeOptions },
        },
      },
      {
        id: "memberCount",
        accessorKey: "memberCount",
        header: "Members",
        minSize: 120,
        filterFn,
        meta: {
          label: "Members",
          cell: { variant: "number", min: 0, step: 1 },
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        minSize: 180,
        filterFn,
        meta: {
          label: "Created",
          cell: { variant: "date" },
        },
      },
    ],
    [filterFn],
  );

  const onRowsDelete = React.useCallback(
    async (rowsToDelete: ListRow[]) => {
      const ids = rowsToDelete.map((r) => r.id);
      if (!confirm(`Delete ${ids.length} list${ids.length === 1 ? "" : "s"}?`))
        return;
      try {
        await Promise.all(
          ids.map((id) =>
            apiFetch(`/api/lists/${id}`, { method: "DELETE" }),
          ),
        );
        onDataChange?.(data.filter((l) => !ids.includes(l.id)));
        toast.success(
          `${ids.length} list${ids.length === 1 ? "" : "s"} deleted`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to delete: ${msg}`);
      }
    },
    [data, onDataChange],
  );

  const { table, tableMeta, ...dataGridProps } = useDataGrid({
    data,
    columns,
    onRowsDelete,
    getRowId: (row) => String(row.id),
    initialState: {
      columnPinning: { left: ["select"] },
    },
    enableSearch: true,
  });

  const onDelete = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No lists selected");
      return;
    }
    const rowIndices = selectedRows.map((row) => row.index);
    tableMeta.onRowsDelete?.(rowIndices);
    table.toggleAllRowsSelected(false);
  }, [table, tableMeta]);

  const height = Math.max(400, windowSize.height - 220);
  const selectedCellCount = tableMeta.selectionState?.selectedCells.size ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="flex items-center gap-2 self-end"
      >
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
      <DataGridActionBar
        table={table}
        tableMeta={tableMeta}
        selectedCellCount={selectedCellCount}
        onDelete={onDelete}
      />
    </div>
  );
}
