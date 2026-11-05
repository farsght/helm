---
status: partial
phase: 03-adapter-seam-tenancy-notifications-proving-ground
source: [03-VERIFICATION.md]
started: 2026-05-29
updated: 2026-05-29
---

## Current Test

[awaiting test-promotion or human testing]

## Context

Phase 3 functionality is fully implemented and code-verified; all four CI gates pass
(vitest 20 files/71 tests, `tsc --noEmit` exit 0, check-imports, check-directives) and the
load-bearing correctness tests are real and green (multi-org cache bleed, FarsightError,
notification rollback/polling-pause, webhook no-project guard).

The items below are the **component-level behavioral assertions** that exist only as
`it.todo` stubs (scaffolded in Wave 0, never promoted). Each behavior IS implemented in
source — these items confirm the assertions, ideally by promoting the `.todo` tests to real
render assertions (preferred) or by manual exercise.

## Tests

### 1. NotificationBell unread badge
expected: badge renders `unreadCount`, caps at "9+", carries `aria-live="polite"`; popover lists recent items + "Mark all read"
result: [pending]
source: packages/ui/src/components/notifications/notification-bell.tsx · test: __tests__/components/notification-bell.test.tsx

### 2. NotificationInbox pagination + states
expected: paginated list with "Load more" (`before` cursor + `hasMore`); loading skeleton / `ErrorState(onRetry)` / `EmptyState` branches render correctly
result: [pending]
source: notification-inbox.tsx · test: __tests__/components/notification-inbox.test.tsx

### 3. NotificationPreferences security-row lock
expected: product + marketing toggles editable; security row `disabled` with Lock icon; optimistic save + Sonner toast on error
result: [pending]
source: notification-preferences.tsx · test: __tests__/components/notification-preferences.test.tsx

### 4. WebhookSecretReveal copy-once (KEY SIGNAL — VALIDATION.md #4)
expected: secret visible on open; modal not dismissible by outside-click; after close the signing secret is ABSENT from the DOM (only `signingSecretPrefix` remains in the list)
result: [pending]
source: webhook-secret-reveal.tsx + webhook-create-modal.tsx + webhook-rotate-secret-modal.tsx · test: __tests__/components/webhook-secret-reveal.test.tsx

### 5. WebhookHealthBadge derivation
expected: `deriveHealth()` → Disabled (enabled=false) / Failing (failureCount>0 OR lastFailureAt>lastSuccessAt) / Healthy
result: [pending]
source: webhook-health-badge.tsx · test: __tests__/components/webhook-health-badge.test.tsx

### 6. WebhookList ConfirmDialog gating
expected: ConfirmDialog on delete + rotate-secret; enable/disable toggle is optimistic with NO confirm; no-project renders EmptyState (not a fetch/error)
result: [pending]
source: webhook-list.tsx · test: __tests__/components/webhook-list.test.tsx

### 7. Live backend round-trip (true manual — Phase-4 / consumer integration)
expected: against a real Clerk session + `api.farsght.com`: Bearer token attaches, org switch isolates cache, a real notification appears via 10s polling, a webhook can be created and its secret shown once
result: [pending]
note: deliberately deferred to manual UAT / Phase-4 consumer integration per 03-VALIDATION.md § Manual-Only Verifications — cannot run in jsdom

## Summary

total: 7
passed: 6
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

Items 1–6 RESOLVED (commit `0e61e8a`): the 6 component `.todo` stubs were promoted to real
render/behavior assertions — full suite now 106 passed / 0 todo / 0 failed, re-verified `passed`.
Item 7 (live backend round-trip against api.farsght.com) remains the only pending item — genuine
manual UAT, deferred to Phase 4 consumer integration per 03-VALIDATION.md § Manual-Only.
