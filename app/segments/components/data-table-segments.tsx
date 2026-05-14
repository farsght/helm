"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Text as TextIcon,
  Hash,
  Tag,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { apiFetch } from "@/lib/api";

export type SegmentRow = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface DataTableListsProps {
  data: SegmentRow[];
  onDataChange?: (data: SegmentRow[]) => void;
}

export function DataTableSegments({ data, onDataChange }: DataTableListsProps) {
  const router = useRouter();

  const onDeleteSegment = React.useCallback(
    async (id: number) => {
      if (!confirm("Delete this segment?")) return;
      try {
        await apiFetch(`/api/segments/${id}`, { method: "DELETE" });
        onDataChange?.(data.filter((l) => l.id !== id));
        toast.success("Segment deleted");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to delete: ${msg}`);
      }
    },
    [data, onDataChange],
  );

  const columns = React.useMemo<ColumnDef<SegmentRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" label="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
        meta: {
          label: "Name",
          placeholder: "Search segments...",
          variant: "text",
          icon: TextIcon,
        },
        enableColumnFilter: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" label="Description" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1">
            {row.original.description || "—"}
          </span>
        ),
        meta: { label: "Description", variant: "text", icon: TextIcon },
        enableColumnFilter: true,
      },
      {
        id: "type",
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" label="Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.type}
          </Badge>
        ),
        meta: {
          label: "Type",
          variant: "select",
          icon: Tag,
          options: [
            { label: "Static", value: "static" },
            { label: "Dynamic", value: "dynamic" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "memberCount",
        accessorKey: "memberCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Members" label="Members" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.memberCount}</span>
        ),
        meta: { label: "Members", variant: "number", icon: Hash },
        enableColumnFilter: true,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" label="Created" />
        ),
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <span className="text-muted-foreground">
              {d.toLocaleDateString()}
            </span>
          );
        },
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
              onDeleteSegment(row.original.id);
            }}
            aria-label="Delete segment"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 60,
      },
    ],
    [onDeleteSegment],
  );

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
    <DataTable
      table={table}
      onRowClick={(row) => router.push(`/segments/${row.original.id}`)}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
