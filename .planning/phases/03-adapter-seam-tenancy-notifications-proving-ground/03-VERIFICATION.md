---
phase: 03-adapter-seam-tenancy-notifications-proving-ground
verified: 2026-05-29T13:00:00Z
status: passed
score: 8/8
overrides_applied: 2
overrides:
  - must_have: "tenant context includes projectId; typed SDK client attaches org header on every request"
    reason: "CONTEXT.md R-01/D-01/D-06 explicitly supersede the ROADMAP SC1 wording before any planning began. projectSlug (not projectId) is the correct axis per Farsight's slug-addressed routes. No org header is correct — org reaches API via Clerk JWT claims and path slugs. Both decisions are locked design choices documented in 03-CONTEXT.md."
    accepted_by: "scott3jensen@gmail.com"
    accepted_at: "2026-05-29T12:35:00Z"
  - must_have: "error discriminated on the type URI per RFC-7807"
    reason: "CONTEXT.md R-02/D-09 explicitly supersede the ROADMAP SC3 / REQUIREMENTS.md DATA-04 wording. The Farsight contracts use a namespaced code string (auth.*/rbac.*/validation.*/etc.), not a type URI. The implementation correctly branches on code per the actual contract. Reconciliation documented before planning began."
    accepted_by: "scott3jensen@gmail.com"
    accepted_at: "2026-05-29T12:35:00Z"
re_verification:
  previous_status: human_needed
  previous_score: 8/8
  gaps_closed:
    - "Component behavioral render tests were it.todo stubs (23 total across 6 files) — all 6 files promoted to real render/behavior assertions; suite now 106 passed / 0 todo / 0 failed"
    - "WebhookSecretReveal secret-absent-from-DOM after close (VALIDATION.md Key Signal #4 / D-14) now asserted by a real passing test"
    - "NotificationBell badge count, 9+ cap, and aria-live assertions now real and passing"
    - "NotificationInbox loading/error/empty/Load-more states now real and passing"
    - "NotificationPreferences 3-row, security-locked, toast assertions now real and passing"
    - "WebhookHealthBadge deriveHealth derivation assertions now real and passing"
    - "WebhookList ConfirmDialog gating and unconfirmed-toggle assertions now real and passing"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Live round-trip: mount FarsightProvider with real Clerk session against api.farsght.com; notifications and webhooks endpoints return real data"
    addressed_in: "Phase 4"
    evidence: "03-VALIDATION.md Manual-Only Verifications: 'Carried to Phase-4 consumer integration / manual UAT against api.farsght.com'. Cannot execute in jsdom — this is a library, not a running app."
---

# Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground — Verification Report

**Phase Goal:** A consumer can mount `<FarsightProvider>` once and get a typed, org/project-scoped data layer that round-trips against a real Farsight backend — proven by a fully working notifications inbox, preferences, and outbound-webhooks management surface on the live `/me/notifications`, `/me/notification-preferences`, and webhooks endpoints, with optimistic updates and loading/error/empty states wired through the hook shape.
**Verified:** 2026-05-29T13:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (commit 0e61e8a promoted all 6 component test files from it.todo stubs to real render/behavior assertions)

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | `<FarsightProvider>` supplies injectable QueryClient + Clerk client + tenant context; SDK attaches bearer token | VERIFIED | `farsight-provider.tsx`: `useAuth()` + `useOrganization()` derive tenant; `createApiClient({ getToken })` wired in `useMemo`; `QueryClient` injectable via prop with `QueryCache/MutationCache onError`. No org header (correct per D-06). Uses `projectSlug` not `projectId` (correct per D-01). ROADMAP SC1 wording superseded by CONTEXT.md R-01/D-01/D-06. |
| SC2 | Switching orgs shows no cross-tenant data — query keys namespaced; multi-org test passes | VERIFIED | `multi-org-cache.test.tsx` — 2 passing tests. `notificationKeys.list(userId)` and `webhookKeys.list(orgSlug, projectSlug)` verified. Cache-bleed test: org-b `QueryClient` has no org-a data. |
| SC3 | RFC-7807 error renders as typed error with `code` discriminant; renaming a `@farsight/contracts` field causes compile error | VERIFIED | `farsight-error.ts`: `FarsightError {kind:'api', code, status, message}` + `FarsightSchemaError {kind:'schema'}` + `toFarsightError/isFarsightError/matchCode`. Discriminates on `code` string (per R-02 — not `type` URI). 5 passing tests. `tsc --noEmit` exits 0. |
| SC4 | User can view notifications inbox, edit preferences, and manage webhooks with optimistic updates and loading/error/empty states | VERIFIED | All 6 component files exist and are substantive. 43 component tests passing (6 files, 0 todo). Hook tests pass (12 tests). Key Signal #4 (D-14 secret-absent-after-close) passes as a real DOM assertion. |

**Score:** 8/8 requirements verified (2 overrides applied for known ROADMAP wording vs contract reconciliations; third override from prior verification retired — the todo-stub gap is closed)

---

### Required Artifacts — Level 1/2/3/4

| Artifact | Status | Evidence |
|----------|--------|---------|
| `packages/ui/src/provider/farsight-provider.tsx` | VERIFIED | Exists, substantive (185 lines), wired: `useAuth`+`useOrganization` → tenant, `createApiClient({getToken})`, `QueryCache`/`MutationCache onError`, exported in barrel |
| `packages/ui/src/provider/use-tenant.ts` | VERIFIED | Exists, exports `useTenant()`, throws outside provider, wired via `FarsightContext` import |
| `packages/ui/src/provider/use-api-client.ts` | VERIFIED | Exists, exports `useApiClient()`, throws outside provider |
| `packages/ui/src/client/create-client.ts` | VERIFIED | Exists, thin re-export of `createApiClient`, `ApiClientError`, `ApiClientSchemaError` from `@farsight/sdk` — no custom hand-rolling |
| `packages/ui/src/errors/farsight-error.ts` | VERIFIED | Exports `FarsightError`, `FarsightSchemaError`, `toFarsightError`, `isFarsightError`, `matchCode`. 5 passing tests. |
| `packages/ui/src/lib/tokens.ts` | VERIFIED | `warning: 'var(--color-chart-4)'` present |
| `packages/ui/src/hooks/use-notifications.ts` | VERIFIED | `notificationKeys`, `useNotificationsQueryOptions` (refetchIntervalInBackground:false), `useMarkReadMutation` + rollback, `useMarkAllReadMutation` + rollback. 4 passing hook tests. |
| `packages/ui/src/hooks/use-notification-preferences.ts` | VERIFIED | `preferenceKeys`, `useNotificationPreferencesQuery`, `useUpdateNotificationPreferences`. 4 passing hook tests. |
| `packages/ui/src/hooks/use-webhooks.ts` | VERIFIED | `webhookKeys` (`['webhooks', orgSlug, projectSlug]`), `useWebhooksQueryOptions` (disabled when projectSlug absent), 5 mutation hooks. 4 passing hook tests. |
| `packages/ui/src/components/notifications/notification-bell.tsx` | VERIFIED | `'use client'`, badge count + 9+ cap + aria-live assertions pass in `notification-bell.test.tsx` (7 passing tests). |
| `packages/ui/src/components/notifications/notification-inbox.tsx` | VERIFIED | `'use client'`, loading/error/empty/Load-more states all pass in `notification-inbox.test.tsx` (6 passing tests). |
| `packages/ui/src/components/notifications/notification-item.tsx` | VERIFIED (code) | No `'use client'` (presentational), severity icon map, `var(--color-chart-4)` for warning, unread dot, `data-slot="notification-item"` |
| `packages/ui/src/components/notifications/notification-preferences.tsx` | VERIFIED | `'use client'`, 3 rows, security `disabled={true}` + Lock icon, `toast.success`/`toast.error`. 8 passing tests in `notification-preferences.test.tsx`. |
| `packages/ui/src/components/webhooks/webhook-health-badge.tsx` | VERIFIED | `deriveHealth` pure function with D-15 logic. All 4 derivation branches (Disabled/Failing×2/Healthy) pass in `webhook-health-badge.test.tsx` (8 passing tests). |
| `packages/ui/src/components/webhooks/webhook-list.tsx` | VERIFIED | `'use client'`, D-02 no-project guard, ConfirmDialog for delete+rotate, enable toggle optimistic (no confirm). 4 passing tests in `webhook-list.test.tsx`. |
| `packages/ui/src/components/webhooks/webhook-secret-reveal.tsx` | VERIFIED | `'use client'`, `onInteractOutside={(e) => e.preventDefault()}`, `navigator.clipboard.writeText`, secret as prop. KEY SIGNAL D-14 (`secret is absent from DOM after explicit close action`) passes as a real DOM assertion. 6 passing tests. |
| `packages/ui/src/components/webhooks/webhook-create-modal.tsx` | VERIFIED (code) | `'use client'`, HTTPS validation, `matchCode('validation.*')`, `setRevealedSecret(null)` on close |
| `packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx` | VERIFIED (code) | `'use client'`, ConfirmDialog step before mutation, `setRevealedSecret(null)` on close |
| `packages/ui/src/components/webhooks/event-types-input.tsx` | VERIFIED (code) | `'use client'`, Enter/comma append, Backspace remove, max-50 validation, suggestion chips |
| `packages/ui/src/index.ts` | VERIFIED | All 35+ Phase-3 public symbols exported |
| `packages/ui/scripts/check-directives.sh` | VERIFIED | EXPECTED=62; passes at 62 |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `farsight-provider.tsx` | `@farsight/sdk` | `createApiClient({ baseUrl, getToken })` in `useMemo` | VERIFIED | Line 148: `createApiClient({ baseUrl: baseUrl ?? "", getToken: auth.getToken })` |
| `farsight-provider.tsx` | `@clerk/react` | `useAuth()` + `useOrganization()` | VERIFIED | Lines 4, 100-101 |
| `farsight-provider.tsx` | No org header | R-01: org via JWT claims | VERIFIED | `grep "X-Org"` → empty; token passed via `getToken` callback only |
| `errors/farsight-error.ts` | `@farsight/sdk` | `instanceof ApiClientError` in `toFarsightError` | VERIFIED | Lines 52, 73 |
| `hooks/use-notifications.ts` | `farsight-provider.tsx` | `useFarsightContext()` | VERIFIED | Line 16, 50 |
| `hooks/use-webhooks.ts` | `farsight-provider.tsx` | `useFarsightContext()` | VERIFIED | Line 22, 46 |
| `notification-bell.tsx` | `use-notifications.ts` | `useNotificationsQueryOptions()` | VERIFIED | Imports and calls the hook; 7 passing render tests |
| `notification-inbox.tsx` | `use-notifications.ts` | `useNotificationsQueryOptions({ interval, before })` — shared key dedup | VERIFIED | Same key as bell when `before=undefined`; 6 passing render tests |
| `webhook-list.tsx` | `use-webhooks.ts` | `useWebhooksQueryOptions()` + all 4 mutation hooks | VERIFIED | All 4 hooks imported and used; 4 passing render tests |
| `webhook-list.tsx` | `webhook-health-badge.tsx` | `<WebhookHealthBadge endpoint={endpoint}>` on each row | VERIFIED | Import + usage in row JSX |
| `webhook-create-modal.tsx` | `webhook-secret-reveal.tsx` | `revealedSecret` state → `<WebhookSecretReveal secret={revealedSecret}>` | VERIFIED | Line 169 |
| `webhook-rotate-secret-modal.tsx` | `webhook-secret-reveal.tsx` | Same pattern | VERIFIED | Line 69 |
| `src/index.ts` | all Phase-3 source files | Named re-exports, no star-exports | VERIFIED | All 35+ symbols present, format `export { X } from '...'` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `notification-bell.tsx` | `data?.notifications`, `data?.unreadCount` | `useNotificationsQueryOptions()` → `client.notifications.list` | Yes — live API call via SDK `getToken`; mock-fetch path verified by 7 passing tests | FLOWING |
| `notification-inbox.tsx` | `data?.notifications`, `data?.hasMore` | Same hook factory, shared query key | Yes; loading/error/empty/hasMore branches verified by 6 passing tests | FLOWING |
| `notification-preferences.tsx` | preferences data | `useNotificationPreferencesQuery()` → `client.me.getNotificationPreferences()` | Yes; 3-row render + toast branches verified by 8 passing tests | FLOWING |
| `webhook-list.tsx` | `data` (WebhookEndpoint[]) | `useWebhooksQueryOptions()` → `client.webhooks.list(...)` | Yes, guarded by D-02 projectSlug check; ConfirmDialog gating verified by 4 passing tests | FLOWING |
| `webhook-secret-reveal.tsx` | `secret` prop | Parent `revealedSecret` state ← `createWebhook`/`rotateSecret` mutation response | One-time from server response; DOM-absence after close verified by KEY SIGNAL D-14 test | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite | `cd packages/ui && npx vitest run` | 20 files, 106 passed, 0 todo, 0 failed | PASS |
| TypeScript clean | `cd packages/ui && npx tsc --noEmit -p tsconfig.json` | Exit 0 (no output) | PASS |
| Import guard (no next/* / @clerk/nextjs/server) | `bash packages/ui/scripts/check-imports.sh` | PASS: No forbidden imports | PASS |
| Directive guard (62 use client files) | `bash packages/ui/scripts/check-directives.sh` | PASS: 62 >= 62 | PASS |
| Component tests — all 6 files | `cd packages/ui && npx vitest run __tests__/components/` | 6 files, 43 passed, 0 todo | PASS |
| KEY SIGNAL D-14: secret absent from DOM after close | `cd packages/ui && npx vitest run __tests__/components/webhook-secret-reveal.test.tsx` | 6 passed including "secret is absent from DOM after explicit close action (KEY SIGNAL D-14)" | PASS |
| Multi-org cache bleed | `npx vitest run __tests__/integration/multi-org-cache.test.tsx` | 2 tests passed | PASS |
| DATA-04 error helpers | `npx vitest run __tests__/errors/farsight-error.test.ts` | 5 tests passed | PASS |
| D-02 webhook guard | `npx vitest run __tests__/hooks/use-webhooks.test.tsx` | 4 tests passed (includes disabled-when-no-project) | PASS |
| DATA-06 optimistic rollback | `npx vitest run __tests__/hooks/use-notifications.test.tsx` | 4 tests passed (includes rollback test) | PASS |
| FarsightProvider useTenant | `npx vitest run __tests__/provider/farsight-provider.test.tsx` | 3 tests passed | PASS |

---

### Probe Execution

No probes declared in PLAN files for this phase. Step 7c skipped.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| DATA-01 | `<FarsightProvider>` with injectable QueryClient + Clerk + tenant context | SATISFIED | Provider wired to Clerk hooks; `useTenant()` returns `{userId, orgId, orgSlug, role, projectSlug?}`; 3 passing provider tests |
| DATA-02 | Typed SDK client thin-wrap over `@farsight/contracts` + Clerk bearer token | SATISFIED | `create-client.ts` re-exports `createApiClient` from `@farsight/sdk`; no hand-rolled client; passing client tests |
| DATA-03 | `queryOptions`-factory hooks with tenant-namespaced keys; no cross-tenant bleed | SATISFIED | `notificationKeys` namespaced by `userId`; `webhookKeys` by `[orgSlug, projectSlug]`; `multi-org-cache.test.tsx` 2 passing tests |
| DATA-04 | RFC-7807 typed error; `detail` never drives control flow; `ApiClientSchemaError` distinct | SATISFIED | `FarsightError {kind:'api', code, ...}` + `FarsightSchemaError {kind:'schema'}`; 5 passing error tests; discriminates on `code` per R-02 |
| DATA-05 | Org/project tenancy remodel; no per-userId assumptions | SATISFIED | `TenantContext {userId, orgId, orgSlug, role, projectSlug?}`; webhooks disabled without projectSlug; multi-org test verifies no bleed |
| DATA-06 | Optimistic mutations with rollback; `tsc --noEmit` clean (contract→hook→prop type chain) | SATISFIED | `cancelQueries`+`setQueriesData`+rollback in both markRead/markAllRead; `tsc --noEmit` exits 0 |
| NOTIF-01 | NotificationBell + NotificationInbox + NotificationPreferences wired to live endpoints | SATISFIED | Components exist, are substantive, are wired to hooks, and all component render/state assertions pass (21 tests across 3 files, 0 todo) |
| NOTIF-02 | WebhookList + health badge + create/rotate modals; copy-once signing-secret; ConfirmDialog gates | SATISFIED | All webhook components exist and are substantive. D-14 DOM-absence assertion passes. D-15 health derivation assertions pass. ConfirmDialog gating assertions pass. (22 tests across 3 files, 0 todo) |

---

### Anti-Patterns Found

No TBD/FIXME/XXX debt markers in Phase-3 source files. No `return null` stubs in source. No forbidden imports. No `it.todo(` calls anywhere in the test suite.

| Category | Result |
|----------|--------|
| Debt markers (TBD/FIXME/XXX) in source | None found |
| Component render stubs (it.todo) | None — all 23 former stubs promoted to real passing assertions |
| Forbidden next/* / @clerk/nextjs/server imports | None (check-imports.sh PASS) |
| Missing 'use client' directives | None (check-directives.sh: 62 >= 62) |

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live round-trip against api.farsght.com — Bearer token attaches, org switch isolates cache, real notifications/webhooks data loads | Phase 4 | 03-VALIDATION.md Manual-Only Verifications: "Carried to Phase-4 consumer integration / manual UAT against api.farsght.com"; PORT-01 (Phase 4) covers verified consumer integration from an external Vite app |

---

### Human Verification Required

None. All component behavioral assertions that were previously deferred to human review have been promoted to automated passing tests. The only remaining unautomated item is the live backend round-trip, which is correctly deferred to Phase 4 consumer integration per 03-VALIDATION.md and is not a blocker for phase completion.

---

### Gaps Summary

No gaps. All 8 requirements (DATA-01 through DATA-06, NOTIF-01, NOTIF-02) have full implementation evidence and passing automated tests. The gap from the initial verification — 23 component `.todo` stubs covering badge rendering, state branches, health derivation, ConfirmDialog gating, and the D-14 secret-absent-from-DOM proof — is closed by commit 0e61e8a. The full suite is 106 passed / 0 todo / 0 failed across 20 test files.

The two remaining overrides (SC1 wording vs. projectSlug/no-org-header; SC3 wording vs. code-discriminant) are pre-approved locked design decisions documented in 03-CONTEXT.md. The third override from the initial verification (component behavioral tests were todos) is retired because the underlying gap is closed.

---

_Verified: 2026-05-29T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
