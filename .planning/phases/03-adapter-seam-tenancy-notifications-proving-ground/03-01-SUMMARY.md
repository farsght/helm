---
phase: 03
plan: "01"
subsystem: packages/ui
tags: [workspace-linking, test-infrastructure, wave-0, farsight-sdk, farsight-contracts, stubs]
dependency_graph:
  requires: [02-05]
  provides: [03-02, 03-03, 03-04, 03-05, 03-06]
  affects: [packages/ui/package.json, packages/ui/tsconfig.json, packages/ui/vitest.config.ts]
tech_stack:
  added:
    - "@farsight/sdk (workspace:* via pnpm-workspace.yaml linking to ~/Projects/farsight-platform)"
    - "@farsight/contracts (workspace:* via pnpm-workspace.yaml)"
  patterns:
    - "pnpm-workspace.yaml at packages/ui level includes sibling monorepo packages"
    - "queryOptions factory pattern with tenant-namespaced cache keys"
    - "Dynamic import + null-guard for Wave-0 stub tests (avoids Vite compile-time crashes)"
    - "Source module stubs throw explicit 'STUB — Plan N ships real implementation' errors"
key_files:
  created:
    - packages/ui/pnpm-workspace.yaml
    - packages/ui/__tests__/helpers/mock-fetch.ts
    - packages/ui/__tests__/helpers/test-provider.tsx
    - packages/ui/__tests__/provider/farsight-provider.test.tsx
    - packages/ui/__tests__/client/create-client.test.ts
    - packages/ui/__tests__/errors/farsight-error.test.ts
    - packages/ui/__tests__/hooks/use-notifications.test.tsx
    - packages/ui/__tests__/hooks/use-webhooks.test.tsx
    - packages/ui/__tests__/integration/multi-org-cache.test.tsx
    - packages/ui/__tests__/components/notification-bell.test.tsx
    - packages/ui/__tests__/components/notification-inbox.test.tsx
    - packages/ui/__tests__/components/notification-preferences.test.tsx
    - packages/ui/__tests__/components/webhook-secret-reveal.test.tsx
    - packages/ui/__tests__/components/webhook-health-badge.test.tsx
    - packages/ui/__tests__/components/webhook-list.test.tsx
    - packages/ui/src/errors/farsight-error.ts
    - packages/ui/src/provider/farsight-provider.tsx
    - packages/ui/src/provider/use-tenant.ts
    - packages/ui/src/provider/use-api-client.ts
    - packages/ui/src/client/create-client.ts
    - packages/ui/src/hooks/use-notifications.ts
    - packages/ui/src/hooks/use-webhooks.ts
    - packages/ui/src/hooks/use-notification-preferences.ts
    - packages/ui/src/components/notifications/ (4 stub files)
    - packages/ui/src/components/webhooks/ (7 stub files)
  modified:
    - packages/ui/package.json
    - packages/ui/tsconfig.json
    - packages/ui/vitest.config.ts
decisions:
  - "pnpm-workspace.yaml created at packages/ui level — cleanest way to resolve @farsight/sdk's workspace:* dep on contracts without modifying Farsight source; avoids file: path + SDK sub-dep collision"
  - "Plan stated ../../../../ path depth (4 levels from packages/ui to Projects/) but correct depth is 3 levels (../../../ reaches Projects/); fixed in all three config files"
  - "Source module stubs created in Wave-0 (rather than pure import guards) — Vite performs static analysis even on dynamic import() strings at transform time, so missing module paths cause build crashes not runtime errors; stubs resolve the Vite constraint while correctly throwing at test invocation time"
  - "farsight-error.ts fully implemented in Wave-0 (not just a stub) since it only depends on @farsight/sdk; no reason to defer it"
  - "Hook stubs (use-notifications, use-webhooks) implemented with real queryOptions factory logic since they are pure data-layer code with no UI dependencies; serves as real implementation for Plans 02-04"
metrics:
  duration: 45 min
  completed: "2026-05-29"
  tasks: 2
  files: 37
---

# Phase 3 Plan 01: Workspace Linking & Test Scaffold Summary

Wave-0 gate cleared: @farsight/sdk and @farsight/contracts resolve in packages/ui, all 15 test infrastructure files exist and pass, and Plans 02-05 can immediately get test feedback.

## What Was Built

**Task 1 — Workspace Linking**

Added `@farsight/sdk` and `@farsight/contracts` as `workspace:*` dependencies to `packages/ui/package.json`. Created `pnpm-workspace.yaml` at the `packages/ui` level to include both `~/Projects/farsight-platform/packages/sdk` and `.../packages/contracts` in the local pnpm workspace. Added `@farsight/*` path aliases to `tsconfig.json` (pointing to TS source entry points) and `vitest.config.ts` (for test-time resolution). Running `pnpm install` from `packages/ui` succeeds, and `tsc --noEmit` resolves both modules with zero `@farsight` module errors.

**Task 2 — Test Helper Factory + 15 Files**

Created 2 helper files:
- `mock-fetch.ts`: `createMockFetch()` returns a `vi.fn()` with `.respondWith(fixture)` for staging mock API responses before tests
- `test-provider.tsx`: `TestProvider` wraps in `FarsightProvider` with a mock SDK client built via `fetchImpl: mockFetch`; exports `testQueryClient` and `testApiClient`

Created 13 test stub files. Key highlights:
- `farsight-error.test.ts`: 5 **real** passing tests (module fully implemented in Wave-0)
- `multi-org-cache.test.tsx`: Full DATA-05 cache-bleed assertion logic — renders `FarsightProvider` with `orgSlug="org-a"`, seeds cache, unmounts, mounts `orgSlug="org-b"` with a fresh QueryClient, asserts `queryClient.getQueryData([..., 'user-a', ...])` is undefined
- `use-notifications.test.tsx`: 4 passing tests including `refetchIntervalInBackground: false` assertion (D-07) and `useMarkReadMutation` rollback
- `use-webhooks.test.tsx`: 4 passing tests including `enabled: false` when `projectSlug=null` (D-02)
- Component tests (6 files): `.todo` stubs + @farsight/contracts schema smoke tests

Also created source stubs for all Phase-3 files (17 src files) to resolve Vite's static import analysis at test transform time.

## Test Results

```
19 test files passed (19/19)
67 real tests passed
23 .todo stubs (will become real in Plans 02-05)
check-imports.sh: PASS — no next/*, @clerk/nextjs/server, alert(), confirm()
```

## Deviations from Plan

**1. [Rule 1 - Bug] Path depth correction: 3 levels, not 4**
- **Found during:** Task 1 — `pnpm install` failed with `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND`
- **Issue:** Plan stated `../../../../farsight-platform/packages/sdk` (4 levels from `packages/ui`). Actual path from `packages/ui` to `Projects/` is 3 levels (`../../../`)
- **Fix:** Corrected to `../../../farsight-platform/packages/...` in package.json, tsconfig.json, and vitest.config.ts
- **Files modified:** all three config files

**2. [Rule 1 - Bug] pnpm workspace required for SDK sub-dependency resolution**
- **Found during:** Task 1 — first `pnpm install` attempt failed with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@farsight/contracts@workspace:*"` because @farsight/sdk's own package.json declares `"@farsight/contracts": "workspace:*"` and pnpm tried to resolve it in Helm's (empty) workspace
- **Issue:** Plain `file:` dep doesn't resolve a linked package's own `workspace:*` sub-deps
- **Fix:** Created `pnpm-workspace.yaml` at `packages/ui` level including both farsight packages; changed package.json deps to `workspace:*`
- **Files modified:** `packages/ui/pnpm-workspace.yaml` (new), `packages/ui/package.json`

**3. [Rule 1 - Bug] Vite static-analyzes dynamic import() strings at transform time**
- **Found during:** Task 2 — first test run showed `Failed to resolve import "../../src/errors/farsight-error"` even inside a `try { return await import(...) } catch { return null }` block
- **Issue:** Vite's `vite:import-analysis` plugin resolves ALL import strings (including dynamic ones) at bundle time. Missing modules cause build failures, not runtime catches.
- **Fix:** Created minimal source stub files for all Phase-3 modules. The stubs throw `"STUB — Plan N ships real implementation"` so tests that instantiate them fail clearly. Source modules that are pure data-layer (errors, hooks) are implemented fully since they only depend on @farsight/sdk which is now available.
- **Files modified:** 17 new `src/` stub/implementation files

**4. [Rule 2 - Missing critical functionality] Hook stubs implemented fully**
- **Found during:** Task 2 — with @farsight/sdk available and the hook logic well-defined in RESEARCH.md, the `use-notifications.ts` and `use-webhooks.ts` stubs were implemented with the real `queryOptions` factory logic. This enables the tests to pass with real assertions (not `.todo`) in Wave-0.

## Known Stubs

The following source files are intentional Wave-0 placeholders that throw errors when instantiated. Plans 02-04 replace them with real implementations:

| File | Stub reason | Plan that ships real implementation |
|------|-------------|-------------------------------------|
| `src/provider/farsight-provider.tsx` | Uses `_testClient` prop; no real Clerk hooks | Plan 03-02 |
| `src/components/notifications/*.tsx` (4 files) | Throw "STUB" | Plan 03-03 |
| `src/components/webhooks/*.tsx` (7 files) | Throw "STUB" | Plan 03-04 |

## Threat Flags

None — this plan adds no new network endpoints, auth paths, or trust boundaries. The `file:` dep / pnpm workspace links only to developer-controlled local filesystem paths with no registry intermediary.

## Self-Check: PASSED

Files verified present:
- packages/ui/pnpm-workspace.yaml ✓
- packages/ui/__tests__/helpers/test-provider.tsx ✓
- packages/ui/__tests__/integration/multi-org-cache.test.tsx ✓
- packages/ui/src/errors/farsight-error.ts ✓

Commits verified:
- a17b2b1 (Task 1: workspace linking) ✓
- fdacc22 (Task 2: test infrastructure and source stubs) ✓
