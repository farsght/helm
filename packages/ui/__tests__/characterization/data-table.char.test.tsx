/**
 * Characterization tests for use-data-table.ts controlled/uncontrolled seam.
 * Tests both internal-default and controlled-override modes.
 * No NuqsTestingAdapter — the ported hook has zero nuqs.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDataTable } from "../../src/hooks/use-data-table";

describe("useDataTable — characterization", () => {
  it("Test 1: internal state default — initializes without throwing; pageIndex=0, sorting=[]", () => {
    const { result } = renderHook(() =>
      useDataTable({
        columns: [],
        data: [],
        pageCount: 0,
      }),
    );

    expect(result.current.table.getState().pagination.pageIndex).toBe(0);
    expect(result.current.table.getState().sorting).toEqual([]);
  });

  it("Test 2: internal state updates propagate — setPageIndex(1) reflects in table state", () => {
    const { result } = renderHook(() =>
      useDataTable({
        columns: [],
        data: [],
        pageCount: 5,
      }),
    );

    act(() => {
      result.current.table.setPageIndex(1);
    });

    expect(result.current.table.getState().pagination.pageIndex).toBe(1);
  });

  it("Test 3: controlled state override — pageIndex=2 when state.pagination.pageIndex=2", () => {
    const { result } = renderHook(() =>
      useDataTable({
        columns: [],
        data: [],
        pageCount: 5,
        state: { pagination: { pageIndex: 2, pageSize: 25 } },
        onStateChange: vi.fn(),
      }),
    );

    expect(result.current.table.getState().pagination.pageIndex).toBe(2);
  });

  it("Test 4: onStateChange is called when state transitions in controlled mode", () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns: [],
        data: [],
        pageCount: 5,
        state: { pagination: { pageIndex: 0, pageSize: 10 } },
        onStateChange,
      }),
    );

    act(() => {
      result.current.table.setPageIndex(1);
    });

    expect(onStateChange).toHaveBeenCalled();
    const calledWith = onStateChange.mock.calls[0][0];
    expect(calledWith.pagination).toBeDefined();
    expect(calledWith.pagination.pageIndex).toBe(1);
  });

  it("Test 5: no state prop and no onStateChange — hook is fully standalone (no errors)", () => {
    expect(() => {
      renderHook(() =>
        useDataTable({
          columns: [],
          data: [],
          pageCount: 0,
        }),
      );
    }).not.toThrow();
  });
});
