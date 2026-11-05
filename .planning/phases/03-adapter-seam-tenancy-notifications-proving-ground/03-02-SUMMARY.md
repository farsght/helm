---
phase: 03
plan: "02"
subsystem: packages/ui
tags: [farsight-provider, adapter-seam, react-context, tanstack-query, clerk-react, farsight-sdk, tokens, barrel-export]
dependency_graph:
  requires: [03-01]
  provides: [03-03, 03-04, 03-05, 03-06]
  affects:
    - packages/ui/src/provider/farsight-provider.tsx
    - packages/ui/src/provider/use-tenant.ts
    - packages/ui/src/provider/use-api-client.ts
    - packages/ui/src/client/create-client.ts
    - packages/ui/src/errors/farsight-error.ts
    - packages/ui/src/lib/tokens.ts
    - packages/ui/src/index.ts
    - packages/ui/vitest.setup.ts
tech_stack:
  added:
    - "@clerk/react (useAuth/useOrganization) — already declared optional peer; now imported in provider"
    - "QueryCache/MutationCache (from @tanstack/react-query) — cross-cutting error interception (D-10)"
  patterns:
    - "FarsightProvider wraps @farsight/sdk createApiClient with Clerk getToken; exposes ApiClient + TenantContext via React.createContext"
    - "Injectable QueryClient (useMemo) with QueryCache/MutationCache onError for auth.*/rbac.* codes"
    - "_testClient escape hatch: provider uses real Clerk hooks in production, test-injected client in tests"
    - "vi.mock('@clerk/react') in vitest.setup.ts — global mock enables provider tests without ClerkProvider"
    - "Named exports only, no defaults (Phase 1/2 invariant)"
key_files:
  created: []
  modified:
    - packages/ui/src/provider/farsight-provider.tsx
    - packages/ui/src/provider/use-tenant.ts
    - packages/ui/src/provider/use-api-client.ts
    - packages/ui/src/client/create-client.ts
    - packages/ui/src/errors/farsight-error.ts
    - packages/ui/src/lib/tokens.ts
    - packages/ui/src/index.ts
    - packages/ui/vitest.setup.ts
decisions:
  - "vi.mock('@clerk/react') added to vitest.setup.ts (Rule 3 fix) — real useAuth/useOrganization calls throw without ClerkProvider; global mock returns null/safe defaults so _testClient tests drive the tenant context"
  - "farsight-error.ts stub comment removed; file promoted to documented production module (already fully implemented in Wave-0)"
  - "D-03 consumer key remount documented in JSDoc on FarsightProvider.projectSlug prop — library does NOT auto-remount; apps/web keys on orgSlug:projectSlug"
  - "tokens.warning = 'var(--color-chart-4)' added to tokens.color (amber, --color-chart-4 resolves in theme.css)"
metrics:
  duration: 30 min
  completed: "2026-05-29"
  tasks: 2
  files: 8
---

# Phase 3 Plan 02: FarsightProvider Seam Foundation Summary

Real FarsightProvider context with Clerk + @farsight/sdk + injectable QueryClient + cross-cutting error mapping; all Wave-0 DATA-01/02/04/05 tests green.

## What Was Built

**Task 1 — farsight-error.ts (already implemented) + tokens.warning**

`farsight-error.ts` was confirmed fully implemented in Wave-0 (4 helpers + 2 types). The stub comment was removed and JSDoc extended with the ErrorCode catalog. One concrete addition:

- `tokens.color.warning = 'var(--color-chart-4)'` — amber token added per D-09 / PATTERNS.md. Used by `notification-item.tsx` severity coloring in Plan 03-03.

**Task 2 — FarsightProvider real implementation + provider stubs + barrel exports**

Replaced the Wave-0 stub (which required `_testClient` and threw in production) with the real Clerk-based provider:

- `FarsightProvider`: calls `useAuth()` + `useOrganization()` from `@clerk/react` to derive `userId`, `orgSlug`, `orgId`, `role`. Builds the SDK client via `createApiClient({ baseUrl, getToken })` in a `useMemo`. Accepts `_testClient`/`_testUserId`/`_testOrgSlug` props as a test escape hatch.
- `QueryClient` is injectable (passes prop through) or constructed fresh via `useMemo` with `QueryCache`/`MutationCache` `onError` handlers that fire the consumer's `onError` prop for `auth.*` and `rbac.*` codes (D-10).
- `useFarsightContext()` null-check helper exported for all surface hooks.
- `useTenant()` and `useApiClient()` — stubs promoted to clean implementations with no behavior change.
- `create-client.ts` — JSDoc added; `ApiClientError` and `ApiClientSchemaError` now exported as values (not type-only) so consumers can `instanceof`-check them without importing from `@farsight/sdk` directly.
- `src/index.ts` — "Provider & adapter seam (Phase 3)" section added with all new public exports registered.

**Deviation (Rule 3): Clerk mock added to vitest.setup.ts**

`useAuth()` throws `@clerk/react: useAuth can only be used within the <ClerkProvider />` when called outside a ClerkProvider. The existing test infrastructure uses `_testClient`/`_testUserId`/`_testOrgSlug` props to bypass Clerk data — but the real provider calls Clerk hooks unconditionally before reading those props (React hooks cannot be called conditionally). Fix: added `vi.mock('@clerk/react')` to `vitest.setup.ts` returning safe null defaults. All 19 test files continue to pass; the mock is transparent to tests that don't care about Clerk.

## Test Results

```
19 test files passed (19/19)
67 real tests passed
23 .todo stubs (unchanged from Wave-0)
check-imports.sh: PASS — no next/*, @clerk/nextjs/server, alert(), confirm()
```

Key test suites verified by this plan:
- `__tests__/errors/farsight-error.test.ts` — 5 tests (DATA-04) ✓
- `__tests__/provider/farsight-provider.test.tsx` — 3 tests (DATA-01) ✓
- `__tests__/client/create-client.test.ts` — 3 tests (DATA-02) ✓
- `__tests__/integration/multi-org-cache.test.tsx` — 2 tests (DATA-05) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Clerk mock required in vitest.setup.ts**
- **Found during:** Task 2 — first test run after implementing real Clerk hooks
- **Issue:** `useAuth()` and `useOrganization()` throw when called outside `<ClerkProvider>`. React hooks cannot be conditionally skipped. The test infrastructure uses `_testClient` props but the provider must call the hooks first.
- **Fix:** Added `vi.mock('@clerk/react')` to `packages/ui/vitest.setup.ts` with null-safe defaults. Tests continue using `_testClient`/`_testUserId`/`_testOrgSlug` to drive the tenant context.
- **Files modified:** `packages/ui/vitest.setup.ts`
- **Commit:** 5582732

## Known Stubs

The following source files are intentional Wave-0 placeholders that throw errors when instantiated. Plans 03-03 and 03-04 replace them:

| File | Stub reason | Plan that ships real implementation |
|------|-------------|-------------------------------------|
| `src/components/notifications/*.tsx` (4 files) | Throw "STUB" | Plan 03-03 |
| `src/components/webhooks/*.tsx` (7 files) | Throw "STUB" | Plan 03-04 |

## Threat Flags

None — this plan adds no new network endpoints, auth paths, or file access patterns beyond those in the plan's threat model. The `getToken` callback is passed by reference to the SDK; it is never stored in React state or the QueryClient cache (T-03-02 mitigated).

## Self-Check: PASSED

Files verified present:
- packages/ui/src/provider/farsight-provider.tsx ✓ (uses useAuth, useMemo client, QueryCache/MutationCache)
- packages/ui/src/lib/tokens.ts ✓ (warning: 'var(--color-chart-4)')
- packages/ui/src/index.ts ✓ (FarsightProvider, useTenant, matchCode all registered)
- packages/ui/vitest.setup.ts ✓ (vi.mock('@clerk/react'))

Commits verified:
- 5b4f0cd (Task 1: tokens.warning) ✓
- 5582732 (Task 2: FarsightProvider seam) ✓
