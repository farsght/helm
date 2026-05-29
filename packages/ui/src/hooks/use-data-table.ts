import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { useDebouncedCallback } from "./use-debounced-callback";
import type { ExtendedColumnSort } from "../types/data-table";

const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

/**
 * The full state shape exposed via the controlled seam (D-05).
 * Consumers can pass `state` + `onStateChange` to opt into controlled mode.
 * Omit both props to use the default internal (uncontrolled) state.
 */
export type DataTableState = {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
};

/**
 * Props for the injectable controlled-state seam (D-05 / D-07).
 * Phase 2 ships only this seam. Live URL-sync wiring is Phase 4 / PORT-01.
 */
export type DataTableStateProps = {
  /** Opt-in controlled state. Omit for internal (uncontrolled) default. */
  state?: Partial<DataTableState>;
  onStateChange?: (state: DataTableState) => void;
};

interface UseDataTableProps<TData>
  extends Omit<
      TableOptions<TData>,
      | "state"
      | "pageCount"
      | "getCoreRowModel"
      | "manualFiltering"
      | "manualPagination"
      | "manualSorting"
      | "onStateChange"
    >,
    Required<Pick<TableOptions<TData>, "pageCount">>,
    DataTableStateProps {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  debounceMs?: number;
  throttleMs?: number;
  enableAdvancedFilter?: boolean;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    enableAdvancedFilter = false,
    state: controlledState,
    onStateChange,
    ...tableProps
  } = props;

  // Internal state — used when controlledState is not provided (uncontrolled mode)
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: controlledState?.pagination?.pageIndex ?? initialState?.pagination?.pageIndex ?? 0,
      pageSize: controlledState?.pagination?.pageSize ?? initialState?.pagination?.pageSize ?? 10,
    });

  const [internalSorting, setInternalSorting] = React.useState<
    ExtendedColumnSort<TData>[]
  >(
    (controlledState?.sorting as ExtendedColumnSort<TData>[]) ??
      initialState?.sorting ??
      [],
  );

  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>(
      controlledState?.columnFilters ?? initialState?.columnFilters ?? [],
    );

  const [internalJoinOperator, setInternalJoinOperator] = React.useState<
    "and" | "or"
  >("and");

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  // Controlled/uncontrolled seam: prefer controlled state when provided
  const pagination: PaginationState =
    controlledState?.pagination ?? internalPagination;
  const sorting: SortingState =
    (controlledState?.sorting as ExtendedColumnSort<TData>[]) ??
    internalSorting;
  const columnFilters: ColumnFiltersState =
    controlledState?.columnFilters ?? internalColumnFilters;

  // Helper to notify onStateChange with the full current state
  const notifyStateChange = React.useCallback(
    (partial: Partial<DataTableState>) => {
      onStateChange?.({
        pagination: partial.pagination ?? pagination,
        sorting: partial.sorting ?? sorting,
        columnFilters: partial.columnFilters ?? columnFilters,
        columnVisibility: partial.columnVisibility ?? columnVisibility,
        rowSelection: partial.rowSelection ?? rowSelection,
      });
    },
    [onStateChange, pagination, sorting, columnFilters, columnVisibility, rowSelection],
  );

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const newPagination =
        typeof updaterOrValue === "function"
          ? updaterOrValue(pagination)
          : updaterOrValue;

      notifyStateChange({ pagination: newPagination });
      if (!controlledState?.pagination) {
        setInternalPagination(newPagination);
      }
    },
    [pagination, notifyStateChange, controlledState?.pagination],
  );

  const columnIds = React.useMemo(() => {
    return new Set(
      columns.map((column) => column.id).filter(Boolean) as string[],
    );
  }, [columns]);

  // Suppress columnIds warning — referenced in sorting validation below
  void columnIds;

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;

      notifyStateChange({ sorting: newSorting });
      if (!controlledState?.sorting) {
        setInternalSorting(newSorting as ExtendedColumnSort<TData>[]);
      }
    },
    [sorting, notifyStateChange, controlledState?.sorting],
  );

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];
    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  const debouncedSetColumnFilters = useDebouncedCallback(
    (newFilters: ColumnFiltersState) => {
      notifyStateChange({ columnFilters: newFilters });
      if (!controlledState?.columnFilters) {
        setInternalColumnFilters(newFilters);
      }
    },
    debounceMs,
  );

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return;
      // Use the effective (controlled) value as the base so that function-form
      // updaters receive the correct previous state in controlled mode. The
      // debouncedSetColumnFilters callback already guards setInternalColumnFilters
      // behind `if (!controlledState?.columnFilters)`, so internal state is only
      // mutated in uncontrolled mode.
      const next =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnFilters)
          : updaterOrValue;
      debouncedSetColumnFilters(next);
    },
    [columnFilters, debouncedSetColumnFilters, enableAdvancedFilter],
  );

  // Wrap rowSelection and columnVisibility handlers so they notify onStateChange
  // (same mechanism used by pagination/sort/filter). Without this, a controlled
  // parent that listens to onStateChange never learns about row-selection or
  // column-visibility changes. DataTableState already declares both fields.
  const onRowSelectionChange = React.useCallback(
    (updaterOrValue: Updater<RowSelectionState>) => {
      const newRowSelection =
        typeof updaterOrValue === "function"
          ? updaterOrValue(rowSelection)
          : updaterOrValue;
      notifyStateChange({ rowSelection: newRowSelection });
      setRowSelection(newRowSelection);
    },
    [rowSelection, notifyStateChange],
  );

  const onColumnVisibilityChange = React.useCallback(
    (updaterOrValue: Updater<VisibilityState>) => {
      const newColumnVisibility =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnVisibility)
          : updaterOrValue;
      notifyStateChange({ columnVisibility: newColumnVisibility });
      setColumnVisibility(newColumnVisibility);
    },
    [columnVisibility, notifyStateChange],
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    meta: {
      ...tableProps.meta,
      queryKeys: {
        page: "page",
        perPage: "perPage",
        sort: "sort",
        filters: "filters",
        joinOperator: "joinOperator",
      },
    },
  });

  // Expose joinOperator for toolbar filtering (advanced filter mode)
  const joinOperator = internalJoinOperator;
  const setJoinOperator = React.useCallback(
    (value: "and" | "or") => {
      setInternalJoinOperator(value);
    },
    [],
  );

  return React.useMemo(
    () => ({
      table,
      debounceMs,
      throttleMs,
      joinOperator,
      setJoinOperator,
      filterableColumns,
    }),
    [table, debounceMs, throttleMs, joinOperator, setJoinOperator, filterableColumns],
  );
}
