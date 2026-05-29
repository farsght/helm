/**
 * Tests for <DatasetList> — DSET-01.
 *
 * Wave-0: All render/interaction tests are it.todo stubs. Wave-0 only requires
 * the imports to resolve (import-safe invariant). Live tests are promoted in
 * Plan 04-02 once the full DatasetList implementation ships.
 *
 * Test strategy: pre-seed the QueryClient cache directly (setQueryData) for data
 * states — mirrors the webhook-list.test.tsx fixture+QC seeding pattern.
 */
import { describe, it } from "vitest"
import { DatasetList } from "../../src/components/datasets/dataset-list"
import { datasetKeys } from "../../src/hooks/use-datasets"

// Suppress unused import warning — these are live imports proving the import-safe invariant.
void DatasetList
void datasetKeys

describe("DatasetList — DSET-01", () => {
  it.todo("renders table rows from mock QueryClient data (seeded via setQueryData)")

  it.todo("shows EmptyState when items array is empty")

  it.todo("shows EmptyState when projectSlug is null (D-02 no-project guard)")

  it.todo("shows ErrorState on query error")

  it.todo("delete row click opens ConfirmDialog (never confirm())")
})
