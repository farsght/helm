"use client";

import type { ColumnDef } from "@tanstack/react-table";
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

import { DataGridActionBar } from "../../components/data-grid-action-bar";

export type ListMemberRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
};

interface DataGridListMembersProps {
  listId: number;
  data: ListMemberRow[];
  onDataChange?: (data: ListMemberRow[]) => void;
}

export function DataGridListMembers({
  listId,
  data,
  onDataChange,
}: DataGridListMembersProps) {
  const windowSize = useWindowSize();
  const filterFn = React.useMemo(() => getFilterFn<ListMemberRow>(), []);

  const columns = React.useMemo<ColumnDef<ListMemberRow>[]>(
    () => [
      getDataGridSelectColumn<ListMemberRow>({ enableRowMarkers: true }),
      {
        id: "firstName",
        accessorKey: "firstName",
        header: "First Name",
        minSize: 160,
        filterFn,
        meta: { label: "First Name", cell: { variant: "short-text" } },
      },
      {
        id: "lastName",
        accessorKey: "lastName",
        header: "Last Name",
        minSize: 160,
        filterFn,
        meta: { label: "Last Name", cell: { variant: "short-text" } },
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        minSize: 240,
        filterFn,
        meta: { label: "Email", cell: { variant: "short-text" } },
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        minSize: 200,
        filterFn,
        meta: { label: "Title", cell: { variant: "short-text" } },
      },
      {
        id: "company",
        accessorKey: "company",
        header: "Company",
        minSize: 200,
        filterFn,
        meta: { label: "Company", cell: { variant: "short-text" } },
      },
    ],
    [filterFn],
  );

  const onRowsDelete = React.useCallback(
    async (rowsToDelete: ListMemberRow[]) => {
      const ids = rowsToDelete.map((r) => r.id);
      if (
        !confirm(
          `Remove ${ids.length} member${ids.length === 1 ? "" : "s"} from this list?`,
        )
      )
        return;
      try {
        await Promise.all(
          ids.map((prospectId) =>
            fetch(`/api/lists/${listId}/members`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prospectId }),
            }),
          ),
        );
        onDataChange?.(data.filter((m) => !ids.includes(m.id)));
        toast.success(
          `${ids.length} member${ids.length === 1 ? "" : "s"} removed`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to remove: ${msg}`);
      }
    },
    [data, listId, onDataChange],
  );

  const { table, tableMeta, ...dataGridProps } = useDataGrid({
    data,
    columns,
    onRowsDelete,
    getRowId: (row) => String(row.id),
    initialState: { columnPinning: { left: ["select"] } },
    enableSearch: true,
  });

  const onDelete = React.useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No members selected");
      return;
    }
    const rowIndices = selectedRows.map((row) => row.index);
    tableMeta.onRowsDelete?.(rowIndices);
    table.toggleAllRowsSelected(false);
  }, [table, tableMeta]);

  const height = Math.max(400, windowSize.height - 260);
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

export async function fetchListMembers(
  listId: number,
): Promise<ListMemberRow[]> {
  return apiFetch(`/api/lists/${listId}/members`);
}
