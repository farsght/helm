# Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground — Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 23 new files (provider 3, client 1, errors 1, hooks 3, notifications 4, webhooks 6, tests 13 stub dirs, tokens 1 mod)
**Analogs found:** 21 / 23 (2 net-new with no codebase analog — `FarsightProvider` context pattern and optimistic-mutation hook factory)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/ui/src/provider/farsight-provider.tsx` | provider | request-response | `packages/ui/src/components/page/confirm-dialog.tsx` (context + `'use client'` + named-export shape) | partial — no context provider analog exists |
| `packages/ui/src/provider/use-tenant.ts` | hook | request-response | `packages/ui/src/hooks/use-data-table.ts` (typed hook shape, named export) | role-match |
| `packages/ui/src/provider/use-api-client.ts` | hook | request-response | `packages/ui/src/hooks/use-data-table.ts` | role-match |
| `packages/ui/src/client/create-client.ts` | utility | request-response | `packages/ui/src/lib/utils.ts` (named re-export, no directive) | role-match |
| `packages/ui/src/errors/farsight-error.ts` | utility | request-response | `packages/ui/src/lib/tokens.ts` (named typed exports, no directive, one responsibility) | role-match |
| `packages/ui/src/hooks/use-notifications.ts` | hook | event-driven (polling) | `packages/ui/src/hooks/use-data-table.ts` (hook factory, controlled seam, named exports) | role-match |
| `packages/ui/src/hooks/use-notification-preferences.ts` | hook | CRUD | `packages/ui/src/hooks/use-data-table.ts` | role-match |
| `packages/ui/src/hooks/use-webhooks.ts` | hook | CRUD | `packages/ui/src/hooks/use-data-table.ts` | role-match |
| `packages/ui/src/components/notifications/notification-bell.tsx` | component | event-driven | `packages/ui/src/components/page/page-header.tsx` (Popover + Button + badge overlay) | role-match |
| `packages/ui/src/components/notifications/notification-inbox.tsx` | component | event-driven | `packages/ui/src/components/page/empty-state.tsx` + `list-skeleton.tsx` (full-surface layout pattern) | role-match |
| `packages/ui/src/components/notifications/notification-item.tsx` | component | request-response | `packages/ui/src/components/page/error-state.tsx` (icon + text block, token color, named export) | role-match |
| `packages/ui/src/components/notifications/notification-preferences.tsx` | component | CRUD | `packages/ui/src/components/page/confirm-dialog.tsx` (`'use client'`, Dialog primitives, named export) | role-match |
| `packages/ui/src/components/webhooks/webhook-list.tsx` | component | CRUD | `packages/ui/src/components/page/empty-state.tsx` + `card-grid-skeleton.tsx` | role-match |
| `packages/ui/src/components/webhooks/webhook-endpoint-row.tsx` | component | CRUD | `packages/ui/src/components/page/error-state.tsx` (Button + icon + Badge, no directive needed if parent carries it) | role-match |
| `packages/ui/src/components/webhooks/webhook-health-badge.tsx` | component | transform | `packages/ui/src/components/ui/badge.tsx` (Badge wrapper, named export) | partial |
| `packages/ui/src/components/webhooks/webhook-create-modal.tsx` | component | CRUD | `packages/ui/src/components/page/confirm-dialog.tsx` (Dialog + form pattern, `'use client'`) | role-match |
| `packages/ui/src/components/webhooks/webhook-secret-reveal.tsx` | component | request-response | `packages/ui/src/components/page/confirm-dialog.tsx` (Dialog pattern, copy-to-clipboard via browser API) | role-match |
| `packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx` | component | CRUD | `packages/ui/src/components/page/confirm-dialog.tsx` (ConfirmDialog two-step gate + reveal) | exact-structural |
| `packages/ui/src/components/webhooks/event-types-input.tsx` | component | request-response | `packages/ui/src/components/ui/input.tsx` (Input + Badge chips, no third-party tag lib) | role-match |
| `packages/ui/src/lib/tokens.ts` (modify — add `warning`) | utility | — | self | exact (add one key) |
| `packages/ui/src/index.ts` (modify — add barrel exports) | config | — | self — follow existing export line format | exact |
| `packages/ui/__tests__/provider/farsight-provider.test.tsx` | test | — | `packages/ui/__tests__/characterization/data-table.char.test.tsx` | exact-structural |
| `packages/ui/__tests__/errors/farsight-error.test.ts` | test | — | `packages/ui/__tests__/characterization/data-table.char.test.tsx` | exact-structural |
| `packages/ui/__tests__/hooks/use-notifications.test.tsx` | test | — | `packages/ui/__tests__/characterization/data-table.char.test.tsx` (renderHook, act) | exact-structural |
| `packages/ui/__tests__/hooks/use-webhooks.test.tsx` | test | — | `packages/ui/__tests__/characterization/data-table.char.test.tsx` | exact-structural |
| `packages/ui/__tests__/integration/multi-org-cache.test.tsx` | test | — | `packages/ui/__tests__/smoke/page-primitives.smoke.test.tsx` (render + assertions) | partial |
| `packages/ui/__tests__/components/notification-bell.test.tsx` | test | — | `packages/ui/__tests__/a11y/page-primitives.a11y.test.tsx` (render + axe) | exact-structural |
| (6 more component test files — same pattern) | test | — | same a11y + smoke test structure | exact-structural |

---

## Pattern Assignments

---

### `packages/ui/src/provider/farsight-provider.tsx` (provider, request-response)

**Analog:** `packages/ui/src/components/page/confirm-dialog.tsx` — the closest existing file that uses `'use client'`, a named-export function component, and imports from `../ui/*`.

There is no existing React context provider in the package. The structure is net-new but follows the established conventions exactly.

**`'use client'` + named export pattern** (from `confirm-dialog.tsx` lines 1–2, 29):
```typescript
"use client"

import * as React from "react"
// ... more imports

export function ConfirmDialog({ ... }: ConfirmDialogProps) {
```

**New file structure to replicate** (relative import depths from `src/provider/` — 1 level from `src/`):
```typescript
"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/react"        // peer dep — no alias
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"  // peer dep
import { createApiClient, type ApiClient } from "@farsight/sdk"  // workspace dep
import { toFarsightError, matchCode } from "../errors/farsight-error"  // relative, 1 level up

// ^^^ Import depth rule for src/provider/ files:
// "../X" goes to src/X  (e.g. ../errors/, ../lib/)
// No @/ alias in packages/ui — only relative paths (confirmed by all existing hooks)
```

**Context shape + createContext pattern** (no existing analog — derive from RESEARCH.md Pattern 1):
```typescript
type TenantContext = {
  userId: string
  orgId: string | null
  orgSlug: string | null
  role: string | null
  projectSlug?: string | null
}

type FarsightContextValue = {
  client: ApiClient
  tenant: TenantContext
}

const FarsightContext = React.createContext<FarsightContextValue | null>(null)
```

**Injectable QueryClient with sane defaults** (no existing analog):
```typescript
// Constructed inside useMemo so onError is captured as a dep.
// NOT a module-level const — that would prevent injectable override.
const qc = React.useMemo(() =>
  queryClient ?? new QueryClient({
    queryCache: new QueryCache({ onError: handleCrossError }),
    mutationCache: new MutationCache({ onError: handleCrossError }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: { retry: 0 },
    },
  }),
  [queryClient, handleCrossError]
)
```

**Named export (no default)**:
```typescript
export { FarsightProvider }
export type { FarsightProviderProps, TenantContext }
```

---

### `packages/ui/src/provider/use-tenant.ts` + `use-api-client.ts` (hooks, request-response)

**Analog:** `packages/ui/src/hooks/use-data-table.ts` lines 70–82 — the established hook signature and named-export pattern.

**Hook file shape** (no `'use client'` — hooks don't need it; directive goes on the provider that calls them):
```typescript
import * as React from "react"
import { FarsightContext } from "./farsight-provider"  // same dir — no depth needed

export function useTenant() {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useTenant: must be used inside <FarsightProvider>")
  return ctx.tenant
}
```

**Named export, no default** (invariant from Phase 1/2 — `use-data-table.ts` line 70):
```typescript
export function useDataTable<TData>(props: UseDataTableProps<TData>) {
```

---

### `packages/ui/src/client/create-client.ts` (utility, request-response)

**Analog:** `packages/ui/src/lib/utils.ts` — a named re-export file with zero `'use client'`, single responsibility.

**Pattern** (from `lib/utils.ts` full file):
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**New file follows the same pure-utility shape** (no directive, named export, one re-export):
```typescript
// packages/ui/src/client/create-client.ts
// No 'use client' — this is a pure factory function, not a React hook.
// src/client/ is 1 level from src/; no relative imports needed for this file.
export { createApiClient, type ApiClient, type ApiClientError, type ApiClientSchemaError }
  from "@farsight/sdk"
```

---

### `packages/ui/src/errors/farsight-error.ts` (utility, request-response)

**Analog:** `packages/ui/src/lib/tokens.ts` (full file, lines 1–38) — a pure typed utility module with named exports, no directive, one domain of responsibility.

**tokens.ts structure to copy**:
```typescript
// No 'use client' — pure utility
// Named exports only — no default
// Types exported alongside values

export const tokens = { ... } as const
export type TokenChart = ...
export type TokenColor = ...
```

**New file follows the same shape**:
```typescript
// packages/ui/src/errors/farsight-error.ts
// No 'use client' — pure error normalization utilities
import { ApiClientError, ApiClientSchemaError } from "@farsight/sdk"
import type { ApiError } from "@farsight/contracts"

export type FarsightError = { readonly kind: 'api'; ... }
export type FarsightSchemaError = { readonly kind: 'schema'; ... }
export function toFarsightError(e: unknown): FarsightError | FarsightSchemaError | null { ... }
export function isFarsightError(e: unknown): e is ApiClientError { ... }
export function matchCode(e: unknown, pattern: string): boolean { ... }
```

**`tokens.ts` also shows the `warning` key to add** (lines 26–34). After Phase 3 modification:
```typescript
color: {
  background:  'var(--color-background)',
  foreground:  'var(--color-foreground)',
  primary:     'var(--color-primary)',
  muted:       'var(--color-muted)',
  mutedFg:     'var(--color-muted-foreground)',
  destructive: 'var(--color-destructive)',
  border:      'var(--color-border)',
  warning:     'var(--color-chart-4)',   // ADD THIS — amber; resolves to oklch(0.828 0.189 84.429) light
},
```

---

### `packages/ui/src/hooks/use-notifications.ts` (hook, event-driven / polling)

**Analog:** `packages/ui/src/hooks/use-data-table.ts` — the established named-export hook factory pattern. No `'use client'` on the hook file itself (provider holds the directive).

**Import depth from `src/hooks/`** (use-data-table.ts lines 21–23):
```typescript
import { useDebouncedCallback } from "./use-debounced-callback"   // same dir
import type { ExtendedColumnSort } from "../types/data-table"      // 1 level up to src/
```

**Phase 3 hooks follow the same depth rule** (src/hooks/ = 1 level from src/):
```typescript
import { useFarsightContext } from "../provider/farsight-provider"  // ../provider/
import { toFarsightError } from "../errors/farsight-error"          // ../errors/
```

**`queryOptions` factory + tenant-key namespacing pattern** (net-new; copy from RESEARCH.md Pattern 3):
```typescript
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
  list: (userId: string, query?: { before?: string; limit?: number; unread?: boolean }) =>
    [...notificationKeys.all(userId), "list", query] as const,
}

export function useNotificationsQueryOptions(opts?: { interval?: number | false; before?: string; limit?: number; unread?: boolean }) {
  const { client, tenant } = useFarsightContext()
  return queryOptions({
    queryKey: notificationKeys.list(tenant.userId, { before: opts?.before, limit: opts?.limit, unread: opts?.unread }),
    queryFn: () => client.notifications.list({ query: { ... } }),
    refetchInterval: opts?.interval ?? 10_000,
    refetchIntervalInBackground: false,   // D-07: pauses when tab hidden
    staleTime: 5_000,
  })
}
```

**Optimistic mutation onMutate/rollback pattern** (net-new; copy from RESEARCH.md Pattern 3):
```typescript
export function useMarkReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.notifications.markRead({ params: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all(tenant.userId) })
      const prev = qc.getQueryData(notificationKeys.list(tenant.userId))
      qc.setQueriesData(
        { queryKey: notificationKeys.all(tenant.userId) },
        (old: any) => old ? {
          ...old,
          unreadCount: Math.max(0, old.unreadCount - 1),
          notifications: old.notifications.map((n: any) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          ),
        } : old
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationKeys.list(tenant.userId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all(tenant.userId) }),
  })
}
```

**Named exports only** (invariant — same as use-data-table.ts line 70: `export function useDataTable`).

---

### `packages/ui/src/hooks/use-webhooks.ts` (hook, CRUD)

**Analog:** Same as above (`use-data-table.ts`). Additional constraint: webhooks are project-scoped and the hook must check for `projectSlug` presence before enabling.

**Project-scope guard pattern** (from RESEARCH.md Pattern 3 webhooks section):
```typescript
export const webhookKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["webhooks", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...webhookKeys.all(orgSlug, projectSlug), "list"] as const,
}

export function useWebhooksQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug  // D-02: disable if no projectSlug
  return queryOptions({
    queryKey: webhookKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: () => client.webhooks.list({
      params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug! },
    }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}
```

**Server-confirmed mutations (no optimistic update) for create/delete/rotate**:
```typescript
export function useCreateWebhookMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: WebhookCreateBody) =>
      client.webhooks.create({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug! },
        body,
      }),
    // No onMutate — server-confirmed; signingSecret is one-time from response
    onSettled: () => qc.invalidateQueries({
      queryKey: webhookKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    }),
  })
}
```

---

### `packages/ui/src/hooks/use-notification-preferences.ts` (hook, CRUD)

**Analog:** `use-data-table.ts` (same hook factory shape). This is simpler — no polling, no optimistic update, server-confirmed. Follow the same file structure as `use-webhooks.ts` but user-scoped.

---

### `packages/ui/src/components/notifications/notification-bell.tsx` (component, event-driven)

**Analog:** `packages/ui/src/components/page/page-header.tsx` for the `'use client'` + Popover + Button composition pattern, and `packages/ui/src/components/page/error-state.tsx` for the icon + token-color text pattern.

**`'use client'` + component + named export** (from `confirm-dialog.tsx` lines 1, 28):
```typescript
"use client"

import * as React from "react"
import { AlertDialog, ... } from "../ui/alert-dialog"   // same-level ui primitives
import { buttonVariants } from "../ui/button"
import { cn } from "../../lib/utils"
// ^^^ Depth from src/components/notifications/: 2 levels = ../../lib/utils

export function ConfirmDialog({ ... }: ConfirmDialogProps) {
```

**Import depth from `src/components/notifications/`** (same depth as all other `src/components/*/` dirs):
```typescript
import { Button } from "../ui/button"            // ../ui/ = sibling dir
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ScrollArea } from "../ui/scroll-area"
import { Badge } from "../ui/badge"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { cn } from "../../lib/utils"             // 2 levels up to src/
import { tokens } from "../../lib/tokens"        // 2 levels up to src/
import { useNotificationsQueryOptions, useMarkReadMutation, useMarkAllReadMutation } from "../../hooks/use-notifications"  // 2 levels up
```

**Token-color usage pattern** (from `error-state.tsx` lines 30–31 — icon uses token class, not hex):
```typescript
// CORRECT — token-based color class:
{Icon && <Icon className="h-10 w-10 text-destructive/60 mb-3" />}
// WRONG — never hardcode hex:
// {Icon && <Icon style={{ color: '#FF0000' }} />}
```

**Unread badge overlay pattern** (no existing analog — from UI-SPEC.md):
```typescript
// Bell button with absolute-positioned badge
<div className="relative">
  <Button variant="ghost" size="icon" aria-label="Notifications">
    <Bell className="h-5 w-5" />
  </Button>
  {unreadCount > 0 && (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] font-medium flex items-center justify-center"
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</div>
```

**Named export**:
```typescript
export { NotificationBell }
export type { NotificationBellProps }
```

---

### `packages/ui/src/components/notifications/notification-inbox.tsx` (component, event-driven)

**Analog:** `packages/ui/src/components/page/list-skeleton.tsx` lines 15–37 for the list card layout + divide-y structure; `packages/ui/src/components/page/empty-state.tsx` for the empty branch.

**List card container** (from `list-skeleton.tsx` line 19):
```typescript
<div
  data-slot="list-skeleton"
  className={cn("divide-y divide-border rounded-lg border bg-card", className)}
>
```

**Loading / error / empty three-branch pattern** (from `page-primitives.smoke.test.tsx` — all three are required):
```typescript
if (isLoading) return <ListSkeleton count={5} />
if (isError) return <ErrorState title="Could not load notifications" description="..." onRetry={refetch} />
if (!data?.notifications.length) return <EmptyState title="You're all caught up" description="No notifications yet." icon={Bell} />
```

**Named export**:
```typescript
export { NotificationInbox }
```

---

### `packages/ui/src/components/notifications/notification-item.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/page/error-state.tsx` lines 18–46 — the icon + text block pattern using Lucide `LucideIcon` type and token colors.

**Icon import pattern** (from `error-state.tsx` lines 4, 30–31):
```typescript
import type { LucideIcon } from "lucide-react"

{Icon && <Icon className="h-10 w-10 text-destructive/60 mb-3" />}
```

**Severity icon + token-color mapping** (severity colors use Tailwind token classes, not hardcoded values — from `tokens.ts` and UI-SPEC.md):
```typescript
const SEVERITY_ICON: Record<string, LucideIcon> = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}
const SEVERITY_CLASS: Record<string, string> = {
  error:   "text-destructive",
  warning: "text-[var(--color-chart-4)]",  // tokens.color.warning after mod
  success: "text-primary",
  info:    "text-muted-foreground",
}
```

**Named export**:
```typescript
export { NotificationItem }
export type { NotificationItemProps }
```

---

### `packages/ui/src/components/notifications/notification-preferences.tsx` (component, CRUD)

**Analog:** `packages/ui/src/components/page/confirm-dialog.tsx` — `'use client'`, Dialog-style controlled interactions, named export.

**Switch with aria + Label pairing** (from UI-SPEC.md — use Switch + Label from `../ui/`):
```typescript
"use client"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
import { Skeleton } from "../ui/skeleton"
import { ErrorState } from "../page/error-state"
// toast from sonner (peer dep — not from a local import)
import { toast } from "sonner"
```

**Pending state on Switch during mutation** (mutation isPending → Switch disabled):
```typescript
<Switch
  id="product-email"
  checked={prefs.product.emailEnabled}
  onCheckedChange={(checked) => updateMutation.mutate({ product: { emailEnabled: checked } })}
  disabled={updateMutation.isPending}
  aria-label="Product updates email notifications"
/>
```

---

### `packages/ui/src/components/webhooks/webhook-list.tsx` (component, CRUD)

**Analog:** `packages/ui/src/components/page/card-grid-skeleton.tsx` lines 23–45 for the card container layout; `packages/ui/src/components/page/empty-state.tsx` for the empty branch.

**Card container pattern** (from `card-grid-skeleton.tsx` line 24):
```typescript
<div
  data-slot="card-grid-skeleton"
  className={cn("overflow-hidden rounded-lg border bg-card", className)}
>
```

**No-projectSlug guard renders EmptyState** (D-02 — do NOT call the query):
```typescript
if (!tenant.projectSlug) {
  return (
    <EmptyState
      title="No project selected"
      description="Select a project to manage its webhooks."
      icon={FolderOpen}
    />
  )
}
```

**Three-branch loading / error / data** (same pattern as NotificationInbox):
```typescript
if (isLoading) return <CardGridSkeleton count={3} columns={1} />
if (isError) return <ErrorState title="Could not load webhooks" description="..." onRetry={refetch} />
if (!data?.length) return <EmptyState title="No webhooks" ... />
```

---

### `packages/ui/src/components/webhooks/webhook-health-badge.tsx` (component, transform)

**Analog:** `packages/ui/src/components/ui/badge.tsx` — thin wrapper around a primitive with computed className.

**Health derivation logic** (D-15 — locked; pure function, no hooks needed):
```typescript
function deriveHealth(endpoint: WebhookEndpoint): "Healthy" | "Failing" | "Disabled" {
  if (!endpoint.enabled) return "Disabled"
  if (
    endpoint.failureCount > 0 ||
    (endpoint.lastFailureAt && endpoint.lastSuccessAt &&
      endpoint.lastFailureAt > endpoint.lastSuccessAt)
  ) return "Failing"
  return "Healthy"
}
```

**Badge + token-class override** (from UI-SPEC.md — Badge with variant + className):
```typescript
import { Badge } from "../ui/badge"

const HEALTH_CLASS: Record<string, string> = {
  Healthy:  "text-primary bg-primary/10 border-primary/20",
  Failing:  "text-destructive bg-destructive/10 border-destructive/20",
  Disabled: "text-muted-foreground",
}
const HEALTH_VARIANT: Record<string, "outline" | "secondary"> = {
  Healthy:  "outline",
  Failing:  "outline",
  Disabled: "secondary",
}
```

**Named export (no `'use client'` — pure presentational, no hooks)**:
```typescript
export { WebhookHealthBadge }
```

---

### `packages/ui/src/components/webhooks/webhook-create-modal.tsx` (component, CRUD)

**Analog:** `packages/ui/src/components/page/confirm-dialog.tsx` (full file, lines 1–57) — `'use client'`, Dialog primitives, controlled open/close, named export.

**Dialog form shell** (from `confirm-dialog.tsx` lines 1, 3–15, 28, 39–56):
```typescript
"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { buttonVariants } from "../ui/button"
import { cn } from "../../lib/utils"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ...
}

export function ConfirmDialog({ open, onOpenChange, ... }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>...</AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction ...>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Pending button pattern** (mutation isPending → button disabled + label change):
```typescript
<Button type="submit" disabled={createMutation.isPending}>
  {createMutation.isPending ? "Adding..." : "Add webhook"}
</Button>
```

**Validation error display** (inline, below field):
```typescript
{fieldError && <p className="text-xs text-destructive mt-1">{fieldError}</p>}
```

**Success → show secret reveal modal** (D-14):
```typescript
const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
// On create success:
createMutation.mutate(body, {
  onSuccess: (data) => {
    setRevealedSecret(data.signingSecret)
    onOpenChange(false)
  },
  onError: () => {
    toast.error("Could not create webhook. Try again.")
  },
})
```

---

### `packages/ui/src/components/webhooks/webhook-secret-reveal.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/page/confirm-dialog.tsx` — Dialog pattern, but NOT dismissible on outside-click.

**Non-dismissible Dialog + clipboard pattern** (from UI-SPEC.md + RESEARCH.md "Don't Hand-Roll"):
```typescript
"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"

// Prevent outside-click dismiss (D-14 — copy-once safety):
<DialogContent onInteractOutside={(e) => e.preventDefault()}>

// Clipboard copy (no polyfill — browser API per RESEARCH.md):
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(secret)
    setCopyLabel("Copied!")
    setTimeout(() => setCopyLabel("Copy to clipboard"), 2000)
  } catch {
    toast.error("Could not copy. Select the text above and copy manually.")
  }
}
```

**Secret cleared on close** (D-14 — never cache in QueryClient):
```typescript
// Parent: setRevealedSecret(null) in onClose → secret gone from DOM
```

---

### `packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx` (component, CRUD)

**Analog:** `packages/ui/src/components/page/confirm-dialog.tsx` (full file) — exact structural match. This is a thin composition of `ConfirmDialog` + `WebhookSecretReveal`.

**Two-step: ConfirmDialog → reveal** (composing existing page primitives):
```typescript
"use client"
import { ConfirmDialog } from "../page/confirm-dialog"
import { WebhookSecretReveal } from "./webhook-secret-reveal"

// Step 1: show ConfirmDialog
// On confirm: fire rotateMutation, on success → show WebhookSecretReveal
// ConfirmDialog API (from confirm-dialog.tsx lines 17–26):
// open, onOpenChange, title, description?, confirmLabel?, cancelLabel?, destructive?, onConfirm
```

---

### `packages/ui/src/components/webhooks/event-types-input.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/ui/input.tsx` — the controlled Input primitive. The tag-input is built on top of it with controlled `useState` (no third-party lib per UI-SPEC.md).

**Controlled chip/tag input pattern** (from UI-SPEC.md Tag Input spec):
```typescript
"use client"
import * as React from "react"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"

// Enter or comma keydown → append tag (trim, deduplicate, validate 1-100 chars, max 50)
// Backspace on empty input → remove last tag
// Suggestions: static list of common glob patterns shown as ghost Button chips
```

---

## Shared Patterns

### `'use client'` placement
**Source:** `packages/ui/src/components/page/confirm-dialog.tsx` line 1  
**Apply to:** All files in `src/provider/`, `src/components/notifications/`, `src/components/webhooks/`  
**Rule:** Must be the absolute first line; one blank line before the first `import`.

Files that do NOT get `'use client'`:
- `src/client/create-client.ts` — pure re-export utility
- `src/errors/farsight-error.ts` — pure error utilities
- `src/hooks/*.ts` — hooks files themselves don't carry it; the provider/component that calls them does
- `src/lib/tokens.ts` — pure token constants

### Named export invariant (no default exports)
**Source:** Every file in `packages/ui/src/` — zero default exports anywhere.  
**Apply to:** Every new Phase 3 file.  
**Pattern** (from `error-state.tsx` lines 48–49):
```typescript
export { ErrorState }
export type { ErrorStateProps }
```

### Relative import depth by directory
**Source:** `packages/ui/src/hooks/use-data-table.ts` lines 21–22; `packages/ui/src/components/page/confirm-dialog.tsx` lines 3–15.  
**Apply to:** All new files.

| New file directory | To reach `src/` | `lib/utils` import | `../ui/X` | `../../hooks/X` |
|---|---|---|---|---|
| `src/provider/` | 1 level | `"../lib/utils"` | N/A | `"../hooks/X"` |
| `src/errors/` | 1 level | `"../lib/utils"` | N/A | N/A |
| `src/hooks/` | 1 level | `"../lib/utils"` | N/A | `"./X"` (same dir) |
| `src/client/` | 1 level | `"../lib/utils"` | N/A | N/A |
| `src/components/notifications/` | 2 levels | `"../../lib/utils"` | `"../ui/X"` | `"../../hooks/X"` |
| `src/components/webhooks/` | 2 levels | `"../../lib/utils"` | `"../ui/X"` | `"../../hooks/X"` |

### ErrorState / EmptyState / Skeleton three-branch pattern
**Source:** `packages/ui/src/components/page/error-state.tsx`, `empty-state.tsx`, `list-skeleton.tsx`  
**Apply to:** `notification-inbox.tsx`, `webhook-list.tsx`, `notification-preferences.tsx`  
**Pattern:**
```typescript
if (isLoading) return <ListSkeleton count={5} />                     // or CardGridSkeleton
if (isError)   return <ErrorState title="..." onRetry={refetch} />
if (!data?.length) return <EmptyState title="..." icon={...} />
// else: render real data
```

### ConfirmDialog for destructive actions
**Source:** `packages/ui/src/components/page/confirm-dialog.tsx` lines 17–57.  
**Apply to:** Webhook delete, webhook rotate-secret (D-15 — locked).  
**Pattern:**
```typescript
<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete webhook?"
  description="This will permanently remove..."
  confirmLabel="Delete webhook"
  cancelLabel="Keep webhook"
  destructive={true}
  onConfirm={handleDelete}
/>
```

### Toast for mutation feedback
**Source:** `packages/ui/src/hooks/use-data-grid.ts` lines 649–657 (clipboard error toast pattern).  
**Apply to:** All mutation error paths in `notification-preferences.tsx`, `webhook-create-modal.tsx`, `webhook-rotate-secret-modal.tsx`, `webhook-list.tsx`.  
**Pattern:**
```typescript
import { toast } from "sonner"   // peer dep, direct import — no local wrapper

// Success:
toast.success("Preferences saved")
// Error:
toast.error("Could not save preferences. Try again.")
```

### `data-slot` attribute for smoke-test targeting
**Source:** `packages/ui/src/components/page/error-state.tsx` line 29; `list-skeleton.tsx` line 18.  
**Apply to:** All top-level container elements in new surface components.  
**Pattern:**
```typescript
<div data-slot="notification-bell" ...>
<div data-slot="notification-inbox" ...>
<div data-slot="webhook-list" ...>
```

### Barrel export registration (barrel-export trap)
**Source:** `packages/ui/src/index.ts` — every new public symbol must be registered here.  
**Apply to:** Every new public component, hook, type, and utility.  
**Format** (follow existing line groups in `index.ts`):
```typescript
// Provider & client (new Phase 3 section)
export { FarsightProvider } from './provider/farsight-provider'
export type { FarsightProviderProps, TenantContext } from './provider/farsight-provider'
export { useTenant } from './provider/use-tenant'
export { useApiClient } from './provider/use-api-client'
export { FarsightError, FarsightSchemaError, toFarsightError, isFarsightError, matchCode }
  from './errors/farsight-error'
// ... hooks, notification components, webhook components
```

---

## Test Pattern Assignments

### All Phase 3 test files
**Analog:** `packages/ui/__tests__/characterization/data-table.char.test.tsx` (full file) for hook tests; `packages/ui/__tests__/a11y/page-primitives.a11y.test.tsx` for a11y tests.

**Test file header / import shape** (from `data-table.char.test.tsx` lines 1–9):
```typescript
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDataTable } from "../../src/hooks/use-data-table";
// ^^^ path alias @/ not used in test files — relative path from __tests__/hooks/ to src/
```

**Path depth rule for test files:**
| Test dir | To reach `src/` | Example import |
|---|---|---|
| `__tests__/provider/` | `../../src/` | `"../../src/provider/farsight-provider"` |
| `__tests__/hooks/` | `../../src/` | `"../../src/hooks/use-notifications"` |
| `__tests__/errors/` | `../../src/` | `"../../src/errors/farsight-error"` |
| `__tests__/components/` | `../../src/` | `"../../src/components/notifications/notification-bell"` |
| `__tests__/integration/` | `../../src/` | `"../../src/provider/farsight-provider"` |

**describe/it/expect structure** (from `data-table.char.test.tsx` lines 10–87):
```typescript
describe("useTenant — unit", () => {
  it("returns correct shape from FarsightProvider", () => {
    const { result } = renderHook(() => useTenant(), { wrapper: TestProvider })
    expect(result.current.orgSlug).toBe("test-org")
  })

  it("throws when used outside FarsightProvider", () => {
    expect(() => {
      renderHook(() => useTenant())
    }).toThrow("useTenant: must be used inside <FarsightProvider>")
  })
})
```

**Mock SDK client via `fetchImpl`** (from RESEARCH.md test infrastructure note):
```typescript
// Inject a fake fetch into createApiClient — SDK supports CreateApiClientOptions.fetchImpl
import { createApiClient } from "@farsight/sdk"

const mockFetch = vi.fn()
const testClient = createApiClient({
  baseUrl: "",
  getToken: async () => "test-token",
  fetchImpl: mockFetch,
})

// Wrap renders in a test provider that uses testClient
function TestProvider({ children }: { children: React.ReactNode }) {
  return (
    <FarsightProvider queryClient={testQueryClient} /* ... */>
      {children}
    </FarsightProvider>
  )
}
```

**a11y test pattern** (from `page-primitives.a11y.test.tsx` lines 1–30):
```typescript
import { render } from "@testing-library/react"
import { axe } from "vitest-axe"

describe("NotificationBell a11y tests", () => {
  it("has no axe violations", async () => {
    const { container } = render(<NotificationBell />, { wrapper: TestProvider })
    const results = await axe(container, {
      rules: {
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "region": { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
```

**Smoke test data-slot targeting** (from `page-primitives.smoke.test.tsx` lines 9–11):
```typescript
it("renders without error", () => {
  const { container } = render(<NotificationBell />, { wrapper: TestProvider })
  expect(container.querySelector('[data-slot="notification-bell"]')).not.toBeNull()
})
```

---

## No Analog Found

Files where no close codebase match exists — executor should use RESEARCH.md patterns directly:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/ui/src/provider/farsight-provider.tsx` (QueryCache/MutationCache wiring) | provider | request-response | No existing React context provider in the package; the QueryCache cross-cutting error pattern is net-new |
| `packages/ui/__tests__/integration/multi-org-cache.test.tsx` | test | — | No existing integration test with org-switch simulation; RESEARCH.md §Validation Architecture §Key Validation Signals #2 provides the blueprint |

For these files, the authoritative pattern source is:
- RESEARCH.md Pattern 4 (QueryCache/MutationCache onError wiring)
- RESEARCH.md §Validation Architecture §Key Validation Signals #2 (multi-org cache bleed test blueprint)
- CONTEXT.md D-03 (hard-remount `key` prop on org + project switch)

---

## Metadata

**Analog search scope:** `packages/ui/src/` (all subdirs), `packages/ui/__tests__/` (all test files)
**Files scanned:** 13 source files read in full; 3 test files read in full; 1 vitest config read
**Pattern extraction date:** 2026-05-29
