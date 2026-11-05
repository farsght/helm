---
phase: 03
plan: "03"
subsystem: packages/ui
tags: [notifications, react-query, optimistic-mutations, polling, tanstack-query, barrel-export, accessibility]
dependency_graph:
  requires: [03-02]
  provides: [03-04, 03-05, 03-06]
  affects:
    - packages/ui/src/hooks/use-notifications.ts
    - packages/ui/src/hooks/use-notification-preferences.ts
    - packages/ui/src/components/notifications/notification-item.tsx
    - packages/ui/src/components/notifications/notification-bell.tsx
    - packages/ui/src/components/notifications/notification-inbox.tsx
    - packages/ui/src/components/notifications/notification-preferences.tsx
    - packages/ui/src/index.ts
    - packages/ui/__tests__/hooks/use-notification-preferences.test.tsx
tech_stack:
  added: []
  patterns:
    - "AnyFn cast pattern for SDK methods with lost generic precision — (client.method as AnyFn)({...}) with explicit return type annotation"
    - "queryFn return type annotation to preserve TanStack inferred data type through AnyFn cast"
    - "Optimistic mark-read/mark-all-read with setQueriesData + rollback on error + invalidate on settled"
    - "Manual before-cursor pagination for NotificationInbox (not infinite scroll)"
    - "NotificationBell + NotificationInbox share one queryOptions key — deduplicates fetch"
key_files:
  created:
    - packages/ui/__tests__/hooks/use-notification-preferences.test.tsx
  modified:
    - packages/ui/src/hooks/use-notifications.ts
    - packages/ui/src/hooks/use-notification-preferences.ts
    - packages/ui/src/components/notifications/notification-item.tsx
    - packages/ui/src/components/notifications/notification-bell.tsx
    - packages/ui/src/components/notifications/notification-inbox.tsx
    - packages/ui/src/components/notifications/notification-preferences.tsx
    - packages/ui/src/index.ts
decisions:
  - "AnyFn cast pattern used in use-notifications.ts + use-notification-preferences.ts to work around SDK type inference gap — sdk ApiClient methods inferred as no-arg due to as const satisfies ApiRoutesManifest losing generic precision; explicit return type annotations (NotificationListResponse, NotificationPreferencesResponse) preserve TanStack Query data inference"
  - "preferenceKeys key factory name (not notificationPreferenceKeys) per plan spec — matches component import in notification-preferences.tsx"
  - "useNotificationPreferencesQuery (not useNotificationPreferencesQueryOptions) and useUpdateNotificationPreferences (not useUpdateNotificationPreferencesMutation) per D-12 naming contract"
  - "NotificationBell loading state uses 3 inline Skeleton rows (not ListSkeleton) per UI-SPEC §1 — compact popover variant"
  - "markAllRead mutation cast via (client.notifications.markAllRead as AnyFn)() — no args; AnyFn uses ...args: any[] signature to accommodate both argged and no-arg calls"
metrics:
  duration: 30 min
  completed: "2026-05-29"
  tasks: 2
  files: 8
---

# Phase 3 Plan 03: Notification Surfaces Summary

Full notification vertical implemented: 4 component stubs replaced with real implementations; 2 hook files refactored to correct export names and TS-clean; all 9 public symbols registered in the barrel.

## What Was Built

**Task 1 — Notification hooks (TDD: RED → GREEN)**

The Wave-0 `use-notifications.ts` implementation was already correct (queryOptions factory, optimistic mutations, rollback). Updated to:
- Add `AnyFn` cast pattern with explicit `NotificationListResponse` return type annotation — fixes TS2554 errors from SDK generic inference gap
- `useMarkAllReadMutation` corrected to use `...args: any[]` signature so no-arg call compiles

`use-notification-preferences.ts` was renamed/refactored to match the plan's contract:
- Key factory: `notificationPreferenceKeys` → `preferenceKeys`  
- `useNotificationPreferencesQueryOptions` → `useNotificationPreferencesQuery`
- `useUpdateNotificationPreferencesMutation` → `useUpdateNotificationPreferences`
- Imports `NotificationPreferencesUpdateBody` from `@farsight/contracts` for explicit body type
- Added `AnyFn` cast with `NotificationPreferencesResponse` return type annotation

New test file `__tests__/hooks/use-notification-preferences.test.tsx` created (4 tests verifying preferenceKeys namespacing + hook return shapes).

**Task 2 — Notification surfaces (TDD: existing .todo stubs are RED)**

Four component stubs replaced with real implementations:

**notification-item.tsx** (presentational, no `'use client'`):
- `SEVERITY_ICON` map: info→Info, success→CheckCircle2, warning→AlertTriangle, error→XCircle, null→Bell
- `SEVERITY_CLASS` map using token CSS var classes — `warning: "text-[var(--color-chart-4)]"` (no hardcoded hex)
- Unread dot (`h-2 w-2 rounded-full bg-primary`), font-medium title when unread
- Category `<Badge variant="outline">`, relative timestamp via `formatRelativeTime()`
- Row is a `<button>` — click marks read + calls `onNavigate(href)` if href non-null
- Focus ring, `bg-muted/30` for unread rows, `data-slot="notification-item"`

**notification-bell.tsx** (`"use client"`):
- `useQuery(useNotificationsQueryOptions({ interval }))` — shared key with NotificationInbox (D-12)
- Unread badge: `absolute -top-1 -right-1`, hidden when 0, "9+" when >9, `aria-live="polite"` (WCAG)
- Loading: 3 inline `<Skeleton className="h-10 w-full" />` rows (not ListSkeleton — compact bell)
- Empty: `<EmptyState title="No notifications" icon={Bell} />`
- Error: `<ErrorState title="Could not load notifications" />` (no onRetry in compact bell, per UI-SPEC)
- "Mark all read" Button shown only when `unreadCount > 0`
- `data-slot="notification-bell"`, no `onInteractOutside` (normal popover behavior)

**notification-inbox.tsx** (`"use client"`):
- `useQuery(useNotificationsQueryOptions({ interval, before }))` — same key as bell when before=undefined
- Manual `before` cursor state for "Load more" pagination
- Loading → `<ListSkeleton count={5} />`
- Error → `<ErrorState>` with "Check your connection and try again." + `onRetry`
- Empty → `<EmptyState title="You're all caught up" description="No notifications yet." icon={Bell} />`
- "Mark all read" `<Button variant="outline" size="sm">` shown when `unreadCount > 0`
- `data-slot="notification-inbox"`

**notification-preferences.tsx** (`"use client"`):
- `useNotificationPreferencesQuery` + `useUpdateNotificationPreferences` from preferences hook
- Loading: 3 `<Skeleton className="h-8 w-full" />` rows with `<Separator />` between
- Error: `<ErrorState title="Could not load preferences" description="Check your connection and try again." onRetry>`
- Three rows: product, marketing (both toggleable), security (locked — `opacity-50 cursor-not-allowed`, `<Lock>` icon, `disabled={true}`)
- `toast.success("Preferences saved")` and `toast.error("Could not save preferences. Try again.")` via Sonner
- All Switches have `aria-label`; security row `<Switch>` is always checked + disabled
- `data-slot="notification-preferences"`

**src/index.ts — 9 new exports added in "Notification hooks (Phase 3)" and "Notification surfaces (Phase 3)" sections:**
- Hook exports: `notificationKeys`, `useNotificationsQueryOptions`, `useMarkReadMutation`, `useMarkAllReadMutation`, `preferenceKeys`, `useNotificationPreferencesQuery`, `useUpdateNotificationPreferences`
- Component exports: `NotificationItem` + type, `NotificationBell` + type, `NotificationInbox` + type, `NotificationPreferences`

## Test Results

```
20 test files passed (20/20)
71 real tests passed
23 .todo stubs (component tests remain as .todo until explicit render tests added in future)
check-imports.sh: PASS — no next/*, @clerk/nextjs/server, alert(), confirm()
tsc --noEmit: notification/preference files clean; pre-existing errors in data-grid/data-table/calendar/chart/use-webhooks unaffected
```

Key test suites verified:
- `__tests__/hooks/use-notifications.test.tsx` — 4 tests (DATA-03, DATA-06) ✓
- `__tests__/hooks/use-notification-preferences.test.tsx` — 4 tests ✓ (new)
- `__tests__/components/notification-bell.test.tsx` — 1 passing + 4 .todo (NOTIF-01) ✓
- `__tests__/components/notification-inbox.test.tsx` — 1 passing + 4 .todo (NOTIF-01) ✓
- `__tests__/components/notification-preferences.test.tsx` — 1 passing + 4 .todo (NOTIF-01) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SDK ApiClient generic inference gap causes TS2554 errors**
- **Found during:** Task 1 — first `npx tsc --noEmit` run revealed pre-existing errors on `use-notifications.ts` + new errors on `use-notification-preferences.ts`
- **Issue:** `apiRoutes as const satisfies ApiRoutesManifest` loses specific generic types; TS infers some route methods as no-arg even when the route declares a query/params/body schema
- **Fix:** Added `AnyFn = (...args: any[]) => Promise<any>` type alias + cast at each SDK call site; added explicit `Promise<NotificationListResponse>` / `Promise<NotificationPreferencesResponse>` return type annotations so TanStack Query infers data types correctly despite the cast
- **Files modified:** `use-notifications.ts`, `use-notification-preferences.ts`
- **Commit:** 73dea90

**2. [Rule 1 - Bug] use-notification-preferences.ts hook names mismatched plan contract**
- **Found during:** Task 1 — Wave-0 implementation used `useNotificationPreferencesQueryOptions` / `useUpdateNotificationPreferencesMutation` / `notificationPreferenceKeys` but plan specifies `useNotificationPreferencesQuery` / `useUpdateNotificationPreferences` / `preferenceKeys`
- **Fix:** Renamed all three exports and created `use-notification-preferences.test.tsx` as RED gate test
- **Files modified:** `use-notification-preferences.ts`, `__tests__/hooks/use-notification-preferences.test.tsx`
- **Commit:** 489d756 (test RED + GREEN together)

**3. [Rule 2 - Missing] Explicit return type annotations on queryFn to preserve data inference**
- **Found during:** Task 2 first TSC run — `notification-bell.tsx` and `notification-inbox.tsx` had `Parameter 'notification' implicitly has an 'any' type` because `queryFn: () => (client.notifications.list as AnyFn)(...)` returned `Promise<any>`, making `data?.notifications` of type `any[]`
- **Fix:** Added `: Promise<NotificationListResponse>` return type annotation on the queryFn in `useNotificationsQueryOptions`; similarly for preferences hook
- **Files modified:** `use-notifications.ts`
- **Commit:** 73dea90

## Known Stubs

The following source files are intentional Wave-0 placeholders. Plan 03-04 replaces them:

| File | Stub reason | Plan that ships real implementation |
|------|-------------|-------------------------------------|
| `src/components/webhooks/*.tsx` (7 files) | Throw "STUB" | Plan 03-04 |

## Threat Flags

None — this plan adds no new network endpoints. The `href` field from notifications is never rendered as an `<a href>` — it's always passed to the consumer's `onNavigate(href)` callback (T-03-06 mitigated). `refetchIntervalInBackground: false` enforced in `useNotificationsQueryOptions` (T-03-07 mitigated). Mutation `toast.error()` messages are static user-facing strings with no `error.details` surfacing (T-03-09 mitigated).

## Self-Check: PASSED

Files verified present:
- packages/ui/src/hooks/use-notifications.ts ✓ (refetchIntervalInBackground: false, AnyFn cast, NotificationListResponse annotation)
- packages/ui/src/hooks/use-notification-preferences.ts ✓ (preferenceKeys, useNotificationPreferencesQuery, useUpdateNotificationPreferences)
- packages/ui/src/components/notifications/notification-item.tsx ✓ (var(--color-chart-4), SEVERITY_ICON, data-slot)
- packages/ui/src/components/notifications/notification-bell.tsx ✓ (data-slot, aria-live, no onInteractOutside)
- packages/ui/src/components/notifications/notification-inbox.tsx ✓ (data-slot, Load more, before cursor)
- packages/ui/src/components/notifications/notification-preferences.tsx ✓ (3 rows, security locked, toast)
- packages/ui/src/index.ts ✓ (9 notification exports registered)
- packages/ui/__tests__/hooks/use-notification-preferences.test.tsx ✓ (4 tests passing)

Commits verified:
- 489d756 (test: notification preferences hook names RED+GREEN) ✓
- 73dea90 (feat: notification surfaces + hook type fixes + barrel exports) ✓
