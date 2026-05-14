## Learned User Preferences
- For targeted code fixes, the user prefers the smallest direct fix, focused verification, and a concise explanation.

## Learned Workspace Facts
- `PageHeader` owns header left/right layout through its `actions` prop; pages should pass controls through `actions` instead of wrapping `PageHeader` in an outer `flex justify-between` row.
- `DataGridContextMenu` derives its menu handlers from `tableMeta`; `DataGrid` should pass only `tableMeta`, `columns`, and `contextMenu`.
- `components/data-grid/data-grid-cell-variants.tsx` uses effect-based syncing and measurement helpers to avoid render-time `ref.current` reads that React Compiler flags.
