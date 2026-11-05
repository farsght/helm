/**
 * DataGrid characterization tests — pin the hook's default internal state.
 *
 * These tests are CHARACTERIZATION tests: they assert what the code actually does,
 * not what we wish it would do. If behavior changes, these tests fail intentionally.
 *
 * getBoundingClientRect is mocked to avoid jsdom virtual-row failures:
 * @tanstack/react-virtual uses element measurements that return 0 in jsdom.
 */

import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeAll } from "vitest";
import { useDataGrid } from "../../src/hooks/use-data-grid";

// Mock getBoundingClientRect to give react-virtual something to work with
// (jsdom returns zeros by default, which breaks virtualizer initialization)
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    height: 500,
    width: 1000,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 500,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

// Minimal valid props for useDataGrid
const minimalProps = {
  columns: [],
  data: [] as Record<string, unknown>[],
};

describe("useDataGrid — characterization: default state initialization", () => {
  it("initializes without throwing with empty columns and data", () => {
    expect(() => {
      renderHook(() => useDataGrid(minimalProps));
    }).not.toThrow();
  });

  it("returns a table object with getState method", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.table).toBeDefined();
    expect(typeof result.current.table.getState).toBe("function");
  });

  it("initial sorting is an empty array", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    // sorting is a top-level return value from the hook
    const tableState = result.current.table.getState();
    expect(tableState.sorting).toEqual([]);
  });

  it("initial rowSelection is an empty object", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    const tableState = result.current.table.getState();
    expect(tableState.rowSelection).toEqual({});
  });

  it("initial columnFilters is an empty array", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    const tableState = result.current.table.getState();
    expect(tableState.columnFilters).toEqual([]);
  });

  it("initial focusedCell is null", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.focusedCell).toBeNull();
  });

  it("initial editingCell is null", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.editingCell).toBeNull();
  });

  it("initial contextMenu is closed with x=0 y=0", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.contextMenu.open).toBe(false);
    expect(result.current.contextMenu.x).toBe(0);
    expect(result.current.contextMenu.y).toBe(0);
  });

  it("initial rowHeight defaults to 'short'", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.rowHeight).toBe("short");
  });

  it("initial pasteDialog is closed", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.pasteDialog.open).toBe(false);
    expect(result.current.pasteDialog.rowsNeeded).toBe(0);
  });

  it("initial cellSelectionMap is null when no cells are selected", () => {
    const { result } = renderHook(() => useDataGrid(minimalProps));
    expect(result.current.cellSelectionMap).toBeNull();
  });
});
