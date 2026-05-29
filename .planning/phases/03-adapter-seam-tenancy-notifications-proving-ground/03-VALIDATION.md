---
phase: 3
slug: adapter-seam-tenancy-notifications-proving-ground
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.7` + `@testing-library/react` `^16.3.2` (jsdom) |
| **Config file** | `packages/ui/vitest.config.ts` (existing) |
| **Quick run command** | `cd packages/ui && npx vitest run` |
| **Full suite command** | `cd packages/ui && npx vitest run && npx tsc --noEmit -p tsconfig.json && bash scripts/check-imports.sh` |
| **Estimated runtime** | ~10s (vitest) + ~few s (tsc + import guard) |

Mock pattern: wrap hook/component renders in a test `<FarsightProvider>` with a mock client built via the SDK's supported `CreateApiClientOptions.fetchImpl` (inject a fetch that returns fixtures). Follow existing `__tests__/characterization/` + `__tests__/a11y/` patterns.

---

## Sampling Rate

- **After every task commit:** `cd packages/ui && npx vitest run` (~10s)
- **After every plan wave:** full suite (`vitest run` + `tsc --noEmit` + `check-imports.sh`)
- **Before `/gsd:verify-work`:** full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

> Task IDs bind during planning (`{padded_phase}-{plan}-{task}`). The requirement→behavior→command rows below are authoritative; the planner maps each to a task.

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| DATA-01 | `<FarsightProvider>` renders children; `useTenant()` returns `{userId,orgId,orgSlug,role,projectSlug?}`; throws outside provider | unit | `npx vitest run __tests__/provider/farsight-provider.test.tsx` | ❌ W0 |
| DATA-02 | `createApiClient` constructed with Clerk `getToken` + `baseUrl`; exposed via context | unit (mock SDK) | `npx vitest run __tests__/client/create-client.test.ts` | ❌ W0 |
| DATA-03 | Query keys include tenant slugs; provider `key` change resets cache | unit | `npx vitest run __tests__/hooks/use-notifications.test.tsx` | ❌ W0 |
| DATA-03 | webhooks query disabled when `projectSlug` null | unit | `npx vitest run __tests__/hooks/use-webhooks.test.tsx` | ❌ W0 |
| DATA-04 | `isFarsightError`/`matchCode`/`toFarsightError` normalize; `ApiClientSchemaError` → `kind:'schema'` | unit | `npx vitest run __tests__/errors/farsight-error.test.ts` | ❌ W0 |
| DATA-05 | Multi-org cache bleed: switch org → distinct keys → no bleed (cleared) | integration | `npx vitest run __tests__/integration/multi-org-cache.test.tsx` | ❌ W0 |
| DATA-06 | Rename a `@farsight/contracts` field → tsc fails at hook call site | type-check | `npx tsc --noEmit -p tsconfig.json` | ✅ |
| DATA-06 | `useMarkReadMutation` optimistic update rolls back on error | unit | `npx vitest run __tests__/hooks/use-notifications.test.tsx` | ❌ W0 |
| NOTIF-01 | `<NotificationBell>` badge = unreadCount | unit | `npx vitest run __tests__/components/notification-bell.test.tsx` | ❌ W0 |
| NOTIF-01 | `<NotificationInbox>` empty/loading/error states | unit | `npx vitest run __tests__/components/notification-inbox.test.tsx` | ❌ W0 |
| NOTIF-01 | `<NotificationPreferences>` updates + success | unit | `npx vitest run __tests__/components/notification-preferences.test.tsx` | ❌ W0 |
| NOTIF-02 | Signing secret shown once in reveal modal, gone after dismiss | unit | `npx vitest run __tests__/components/webhook-secret-reveal.test.tsx` | ❌ W0 |
| NOTIF-02 | Health badge derived from failureCount/lastSuccess/lastFailure | unit | `npx vitest run __tests__/components/webhook-health-badge.test.tsx` | ❌ W0 |
| NOTIF-02 | Delete / rotate-secret gated by ConfirmDialog | unit | `npx vitest run __tests__/components/webhook-list.test.tsx` | ❌ W0 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Key Validation Signals (the load-bearing proofs)

1. **DATA-06 end-to-end type flow:** `tsc --noEmit` green; rename a field in `@farsight/contracts/.../routes.ts` → `tsc --noEmit` fails at the hook call site. Proves contract→hook→prop type chain. [deterministic]
2. **DATA-03/05 multi-org cache bleed (success criterion 2):** render provider `key=org-a`, populate cache; switch to `key=org-b`; assert `queryClient.getQueryData([... org-a ...])` is undefined. The most important tenancy correctness test.
3. **DATA-04 code branching:** hook throws `ApiClientError({status:403, code:'rbac.forbidden'})` → `<ErrorState>` rendered + provider `onError` called with that code.
4. **NOTIF-02 secret-shown-once (D-14):** create/rotate modal shows full secret; after dismiss, secret text is absent from DOM (only prefix remains).
5. **CI import guard:** `scripts/check-imports.sh` stays green — no `next/*` / `@clerk/nextjs/server` introduced.

---

## Wave 0 Requirements

All Phase-3 test files are new. Wave 0 must create:

- [ ] `packages/ui/__tests__/provider/farsight-provider.test.tsx` — DATA-01
- [ ] `packages/ui/__tests__/client/create-client.test.ts` — DATA-02
- [ ] `packages/ui/__tests__/hooks/use-notifications.test.tsx` — DATA-03, DATA-06 (optimistic)
- [ ] `packages/ui/__tests__/hooks/use-webhooks.test.tsx` — DATA-03 (disabled when no project)
- [ ] `packages/ui/__tests__/errors/farsight-error.test.ts` — DATA-04
- [ ] `packages/ui/__tests__/integration/multi-org-cache.test.tsx` — DATA-03 + DATA-05 (critical)
- [ ] `packages/ui/__tests__/components/{notification-bell,notification-inbox,notification-preferences,webhook-secret-reveal,webhook-health-badge,webhook-list}.test.tsx` — NOTIF-01/02
- [ ] Shared fixtures + mock-`fetchImpl` helper for `<FarsightProvider>` test wrapper

**Open items the planner must resolve (from RESEARCH open questions):** (a) how Helm's workspace resolves `@farsight/sdk`/`@farsight/contracts` from `~/Projects/farsight-platform` — Wave 0 verifies; (b) whether `--color-warning` exists in `src/styles/theme.css` (severity color fallback); (c) "Load more" button vs `useInfiniteQuery` for pagination.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live round-trip against real Farsight API (token attach, org switch, real notifications/webhooks) | DATA-01/02, NOTIF-01/02 | Requires live Clerk session + deployed endpoints; not reproducible in jsdom | Carried to Phase-4 consumer integration / manual UAT against `api.farsght.com` |
| Focus-ring visibility + keyboard traversal on new surfaces | CORE-05 (inherited) | Visual | Manual a11y pass at consumer integration |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
