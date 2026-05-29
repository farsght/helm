---
phase: 03
plan: "04"
subsystem: packages/ui
tags: [webhooks, react-query, optimistic-mutations, tanstack-query, barrel-export, health-badge]
dependency_graph:
  requires: [03-02, 03-03]
  provides: [03-05, 03-06]
  affects:
    - packages/ui/src/hooks/use-webhooks.ts
    - packages/ui/src/components/webhooks/webhook-health-badge.tsx
    - packages/ui/src/components/webhooks/webhook-list.tsx
    - packages/ui/src/index.ts
tech_stack:
  added: []
  patterns:
    - "AnyFn cast pattern for SDK methods with lost generic precision (same as 03-03) — applied to all 5 webhook SDK calls"
    - "Explicit return type annotations (WebhookEndpointListResponse, WebhookEndpointCreateResponse) on queryFn to preserve TanStack inferred data type"
    - "D-02 no-project guard: useWebhooksQueryOptions disabled when projectSlug absent; WebhookList renders EmptyState before any query call"
    - "D-08 optimistic enable-toggle via useUpdateWebhookMutation; server-confirmed create/delete/rotateSecret"
    - "D-15 health badge derivation: Disabled(enabled=false) / Failing(failureCount>0 OR lastFailureAt>lastSuccessAt) / Healthy"
    - "ConfirmDialog gates for delete + rotate-secret; enable-toggle is unconfirmed (reversible)"
key_files:
  created: []
  modified:
    - packages/ui/src/hooks/use-webhooks.ts
    - packages/ui/src/components/webhooks/webhook-health-badge.tsx
    - packages/ui/src/components/webhooks/webhook-list.tsx
    - packages/ui/src/index.ts
decisions:
  - "AnyFn cast pattern used in use-webhooks.ts to work around SDK type inference gap — same root cause as 03-03 notification hooks; all 5 SDK calls cast via (client.webhooks.X as AnyFn)({...}) with explicit return type annotations"
  - "WebhookList inlines WebhookEndpointRow as a sub-component within the same file — no separate webhook-endpoint-row.tsx import needed for the list view (Plan 05's modal work can reference it from webhook-list.tsx)"
  - "Last-activity text uses the more recent of lastSuccessAt/lastFailureAt when both are present, falling back to the one that exists, or 'No activity yet'"
  - "Wave-0 use-webhooks.ts key factory and D-02 guard were already correct — only AnyFn cast + explicit return types added"
metrics:
  duration: 20 min
  completed: "2026-05-29"
  tasks: 2
  files: 4
---

# Phase 3 Plan 04: Webhook List Vertical Summary

Webhooks list vertical slice complete: AnyFn-typed hook factory, WebhookHealthBadge presentational component (D-15 derivation logic), and WebhookList surface with toolbar + endpoint rows + optimistic enable-toggle + ConfirmDialog delete gate + D-02 no-project guard. Barrel exports registered alongside 03-03's notification exports.

## What Was Built

**Task 1 — use-webhooks.ts hook factory (TDD: Wave-0 already GREEN)**

The Wave-0 `use-webhooks.ts` key factory and D-02 project-scope guard were already correct (all 4 tests passed). Updated to:
- Add `AnyFn` cast pattern with explicit `WebhookEndpointListResponse` / `WebhookEndpointCreateResponse` return type annotations — same pattern as 03-03's notification hook fix for the SDK generic inference gap
- `useUpdateWebhookMutation` now types the optimistic update against `WebhookEndpointListResponse` for proper type safety on the `setQueryData` call
- All five hooks exported: `useWebhooksQueryOptions`, `useCreateWebhookMutation`, `useUpdateWebhookMutation`, `useDeleteWebhookMutation`, `useRotateWebhookSecretMutation`
- `webhookKeys` factory exports with `all(orgSlug, projectSlug)` and `list(orgSlug, projectSlug)` — namespaced per D-13

**Task 2 — WebhookHealthBadge + WebhookList + barrel exports (TDD: component stubs are RED)**

**webhook-health-badge.tsx** (no `"use client"` — pure presentational):
- `deriveHealth(endpoint)` pure function (D-15 locked logic): `!enabled → Disabled`, `failureCount > 0 || lastFailureAt > lastSuccessAt → Failing`, else `Healthy`
- `HEALTH_CLASS` map: `Healthy: "text-primary bg-primary/10 border-primary/20"`, `Failing: "text-destructive bg-destructive/10 border-destructive/20"`, `Disabled: "text-muted-foreground"`
- `HEALTH_VARIANT` map: Healthy/Failing → `"outline"`, Disabled → `"secondary"`
- Badge with `text-xs h-5 gap-1`, inline icon (`CheckCircle2` / `AlertCircle` / `CircleOff` at `h-3 w-3`)
- Exports `WebhookHealthBadge` + type `WebhookHealthBadgeProps`

**webhook-list.tsx** (`"use client"` as first line):
- **D-02 no-project guard**: `if (!tenant.projectSlug)` renders `<EmptyState title="No project selected" ... icon={FolderOpen}>` — query never called
- **D-11 three-branch**: `isLoading → CardGridSkeleton count={3} columns={1}` / `isError → ErrorState(onRetry=refetch)` / `empty → EmptyState("No webhooks") + Add webhook Button`
- Toolbar: `<h2 className="text-lg font-medium">Webhooks</h2>` + `<Button size="sm">Add webhook</Button>`
- `WebhookEndpointRow` sub-component (inlined): URL truncated `max-w-[280px]`, event-type `Badge variant="outline" text-[10px]` chips, `WebhookHealthBadge`, enable `Switch` (optimistic, no confirm), `signingSecretPrefix` in `<code>` element, last-activity text, `DropdownMenu` with "Rotate signing secret" + "Delete"
- **D-08 optimistic enable-toggle**: `updateMutation.mutate({ id, body: { enabled } })` — no ConfirmDialog
- **D-15 ConfirmDialog gates**:
  - Delete: `destructive=true`, title "Delete webhook?", description with `{url}`, confirmLabel "Delete webhook", cancelLabel "Keep webhook"
  - Rotate: `destructive=true`, title "Rotate signing secret?", description per UI-SPEC, confirmLabel "Rotate secret", cancelLabel "Keep current"; calls `onRotateSecret` prop (Plan 05 provides the actual modal)
- `toast.error("Could not delete webhook. Try again.")` on delete error
- `data-slot="webhook-list"` on root wrapper
- D-14: `signingSecretPrefix` shown, never `signingSecret`
- Props: `WebhookListProps = { onAddWebhook?, onRotateSecret?, className? }`

**src/index.ts — 8 new exports added in two new sections:**
- `// Webhook hooks (Phase 3)`: `webhookKeys`, `useWebhooksQueryOptions`, `useCreateWebhookMutation`, `useUpdateWebhookMutation`, `useDeleteWebhookMutation`, `useRotateWebhookSecretMutation`
- `// Webhook surfaces (Phase 3)`: `WebhookHealthBadge` + type, `WebhookList` + type
- 03-03 notification exports remain untouched

## Test Results

```
20 test files passed (20/20)
71 real tests passed
23 .todo stubs (unchanged — todo stubs remain until explicit render tests added)
check-imports.sh: PASS — no next/*, @clerk/nextjs/server, alert(), confirm()
tsc --noEmit: webhook files clean; pre-existing errors in data-grid/data-table/calendar/chart unaffected
```

Key test suites verified:
- `__tests__/hooks/use-webhooks.test.tsx` — 4 tests (DATA-03) ✓
- `__tests__/components/webhook-health-badge.test.tsx` — 2 passing + 4 .todo (NOTIF-02) ✓
- `__tests__/components/webhook-list.test.tsx` — 2 passing + 4 .todo (NOTIF-02) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SDK ApiClient generic inference gap causes TS2554 errors on use-webhooks.ts**
- **Found during:** Task 1 — first `npx tsc --noEmit` run revealed the same pattern as 03-03
- **Issue:** `apiRoutes as const satisfies ApiRoutesManifest` loses specific generic types; TS infers webhook route methods as no-arg even when the route declares params/body schema. The errors were pre-existing in the Wave-0 implementation but no AnyFn cast had been applied.
- **Fix:** Added `AnyFn = (...args: any[]) => Promise<any>` type alias + cast at each SDK call site; added explicit `Promise<WebhookEndpointListResponse>` and `Promise<WebhookEndpointCreateResponse>` return type annotations so TanStack Query infers data types correctly despite the cast
- **Files modified:** `use-webhooks.ts`
- **Commit:** 6872f55

**2. [Information] Wave-0 use-webhooks.ts key factory and D-02 guard pre-correct**
- The Wave-0 implementation already had the correct `webhookKeys` factory (D-13) and `enabled: (opts?.enabled ?? true) && ready` guard (D-02). Task 1 in the plan was therefore a "fix + enhance" rather than a pure replacement.
- All 4 DATA-03 tests passed before any modification in this plan.

## Known Stubs

The following webhook component files remain as stubs (Plan 03-04 delivers list view only; modals are Plan 03-05):

| File | Stub reason | Plan that ships real implementation |
|------|-------------|-------------------------------------|
| `src/components/webhooks/webhook-create-modal.tsx` | Throw "STUB" | Plan 03-05 |
| `src/components/webhooks/webhook-secret-reveal.tsx` | Throw "STUB" | Plan 03-05 |
| `src/components/webhooks/webhook-rotate-secret-modal.tsx` | Throw "STUB" | Plan 03-05 |
| `src/components/webhooks/event-types-input.tsx` | Throw "STUB" | Plan 03-05 |
| `src/components/webhooks/webhook-endpoint-row.tsx` | Throw "STUB" | Inlined into webhook-list.tsx; may not need separate file |

## Threat Flags

None — T-03-11 mitigated: `signingSecretPrefix` shown in list, never `signingSecret` (grep gate passed). T-03-13 mitigated: optimistic enable-toggle rolls back on error + invalidates on settled.

## Self-Check: PASSED

Files verified present:
- packages/ui/src/hooks/use-webhooks.ts ✓ (AnyFn cast, WebhookEndpointListResponse annotation, enabled guard)
- packages/ui/src/components/webhooks/webhook-health-badge.tsx ✓ (deriveHealth, HEALTH_CLASS, no use client)
- packages/ui/src/components/webhooks/webhook-list.tsx ✓ (use client, FolderOpen guard, ConfirmDialog, no signingSecret)
- packages/ui/src/index.ts ✓ (webhook hooks + surfaces sections added, notification exports intact)

Commits verified:
- 6872f55 (feat(03-04): use-webhooks.ts AnyFn cast + typed returns) ✓
- 9009cd3 (feat(03-04): WebhookHealthBadge + WebhookList + barrel exports) ✓
