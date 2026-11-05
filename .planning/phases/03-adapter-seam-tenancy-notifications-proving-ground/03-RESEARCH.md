# Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground — Research

**Researched:** 2026-05-29
**Domain:** React context provider + TanStack Query v5 + Clerk React + RFC-7807 typed errors + notifications/webhooks surfaces over `@farsight/sdk`
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Provider & tenancy (DATA-01, DATA-05)**
- D-01: `<FarsightProvider>` resolves the active org from Clerk (`org_id`/`org_slug`/`org_role` JWT claims, via `useAuth`/`useOrganization`) and takes `projectSlug` as a consumer prop. Library does NOT own project-selection state or URL. Provider exposes `useTenant()` returning `{ userId, orgId, orgSlug, role, projectSlug? }`.
- D-02: Project scope is optional/nullable. User- and org-scoped hooks work with no project selected. Project-scoped hooks (webhooks) REQUIRE `projectSlug` and must error/disable cleanly when absent.
- D-03: On active-org or active-project switch, provider hard-remounts (React `key` on org + project) so the QueryClient cache fully resets, AND every query key is namespaced with tenant slugs as defense-in-depth.
- D-04: `<FarsightProvider>` supplies an injectable `QueryClient`; assumes Clerk's `<ClerkProvider>` is mounted above it; does NOT own/wrap Clerk.

**Typed SDK client (DATA-02)**
- D-05: Thin-wrap `@farsight/sdk`'s `createApiClient({ baseUrl, getToken, fetchImpl? })` — do NOT hand-roll a client over the `apiRoutes` manifest. The SDK attaches Bearer token, substitutes path params, builds query strings, validates responses through route Zod schemas, throws `ApiClientError`/`ApiClientSchemaError`.
- D-06: No custom org header. Active org reaches the API via Clerk JWT claim (`org_id`/`org_slug` baked into token template) and via path slugs (`/orgs/:slug/...`). Do not invent an org header. (Reconciliation R-01.)

**Tenant-namespaced data hooks (DATA-03, DATA-06)**
- D-07: Hooks are `queryOptions`-factory style with tenant-namespaced keys. Notifications poll on 10s interval, paused when tab hidden (`refetchIntervalInBackground: false`), with interval injectable via prop. Cursor pagination uses contract's `before` (ISO timestamp) + `hasMore`.
- D-08: Optimistic mutations: `markRead` / `markAllRead` (notifications) and webhook enable-toggle update cache immediately with rollback on error. Server-confirmed mutations: webhook create / rotate-secret / delete. End-to-end type flow holds: renaming a `@farsight/contracts` field breaks call site at compile time (DATA-06).

**RFC-7807 typed errors (DATA-04)**
- D-09: Library exposes thin typed `FarsightError` normalized from `ApiClientError` (`{ status, code, message, details?, requestId? }`) plus helpers (`isFarsightError(e)`, `matchCode(e, 'validation.*')`). `ApiClientSchemaError` (2xx response-shape drift) is a distinct case. Branch on `code`, never on `message`. (Reconciliation R-02: discriminator is namespaced `code` string, not a `type` URI.)
- D-10: Error mapping split: `QueryCache`/`MutationCache` `onError` inside `<FarsightProvider>` handles cross-cutting codes (`auth.*` → Clerk re-auth; `rbac.*` → forbidden) and exposes consumer-registerable `onError` callback. Per-form/per-hook handles `validation.*` field errors from `error.details`.

**Error/empty/loading surfacing (NOTIF-01/02)**
- D-11: Generic data hooks do NOT auto-toast. Proving-ground surfaces act as reference consumers: query failures render Phase-2 `<ErrorState onRetry>` inline; mutation failures toast via shipped `<Toaster>` at the surface. Provider's registerable `onError` is the cross-cutting hook for `apps/web`.

**Notifications surface (NOTIF-01)**
- D-12: Ship both compact `<NotificationBell>` (popover + unreadCount badge) AND full paginated `<NotificationInbox>` surface, backed by one shared data hook. Mark-read on item click + "Mark all read". Item render: `severity` → Lucide icon + token color (tokens.ts, no hardcoded hex), `category` as subtle label, flat newest-first. `href` via consumer `onNavigate(href)` callback.

**Webhooks surface (NOTIF-02)**
- D-13: Namespace project-scoped keys by slugs: `['webhooks', orgSlug, projectSlug]`; user-scoped: `['notifications', userId]`.
- D-14: One-time `signingSecret` (returned on create and rotate-secret) shown in copy-once modal with "you won't see this again" warning + clipboard copy; afterward list only shows `signingSecretPrefix`.
- D-15: `ConfirmDialog` gates delete and rotate-secret (both irreversible); enable/disable toggle is reversible — no confirm. Event types via glob tag/chip input + suggested-pattern autocomplete (no enum in contract; any string, 1–100 chars, max 50). Endpoint health: derived status badge (Disabled / Failing [`failureCount>0` or `lastFailure>lastSuccess`] / Healthy) + last-success/last-failure detail.

### Claude's Discretion

- `<FarsightProvider>` `baseUrl` prop wiring (same-origin vs `api.farsght.com`) and exact QueryClient default options (staleTime, retry policy).
- File/dir layout within `packages/ui/src/` for `provider/`, `client/`, `hooks/`, `errors/`, and feature surfaces (`notifications/`, `webhooks/`). Every new public component/hook MUST be re-exported from `src/index.ts` (barrel-export trap).
- Whether `@farsight/sdk` and `@farsight/contracts` are `peerDependencies` vs `dependencies` of `@farsight/ui`.
- Multi-org test strategy for success criterion 2 (verifying no cross-tenant bleed on switch).
- Exact `severity → icon` mapping and `code → user-facing copy` table.

### Deferred Ideas (OUT OF SCOPE)

- Controlled presentational `<ProjectSwitcher>` — revisit in Phase 4.
- Webhook test/ping (no endpoint in contract).
- Deleting/dismissing notifications (not in contract; only mark-read exists).
- SSE/real-time notifications — Phase 3 uses 10s polling per contract.
- Spec-mocking for contract-only endpoints — Phase 4 concern.
- `org_role` → typed RBAC enum — `OrgRoleSchema` is intentionally open string.

### Reconciliations (MUST carry into planning)

- R-01: "attaches + org header on every request" → NO org header exists; org flows via Clerk JWT claim + path slugs.
- R-02: DATA-04 "discriminated on `type` URI" → contract discriminates on namespaced `code` string. Map error UX to `code`.
- R-03: Success criterion lists `{ orgId, orgSlug, role, userId, projectId }` → webhook paths require `projectSlug`; carry `projectSlug` (treat `projectId` as optional/derived).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | `<FarsightProvider>` mounts injectable QueryClient + Clerk React client + tenant context `{ orgId, orgSlug, role, userId, projectId }` | SDK wrap shape, Clerk React `useAuth`/`useOrganization` patterns, QueryClient injection pattern |
| DATA-02 | Typed SDK client over `@farsight/contracts` attaching Clerk Bearer token (reconciled: no org header) | Direct inspection of `@farsight/sdk` `createApiClient` — thin-wrap confirmed |
| DATA-03 | `queryOptions`-factory hooks with tenant-namespaced query keys — no cross-tenant cache bleed on org switch | TanStack Query v5 `queryOptions` factories, key namespacing, hard-remount-on-switch pattern |
| DATA-04 | RFC-7807 error envelope parsed into typed error discriminated on `code` string (reconciled from `type` URI) | Direct inspection of `@farsight/contracts` `errors.ts` — `ErrorCode` namespace catalog confirmed |
| DATA-05 | Org/project tenancy remodel — both scope axes plus `role`; no per-`userId` assumptions | Clerk JWT claims shape confirmed (`org_id`/`org_slug`/`org_role`), `useTenant()` hook shape |
| DATA-06 | Optimistic mutation updates in hook factories; end-to-end type flow (rename contracts field → compile error) | TanStack Query v5 optimistic update pattern; SDK `RouteOutput<S>` generic typing |
| NOTIF-01 | Notifications inbox + preferences UI on live `/me/notifications` + `/me/notification-preferences` | Direct inspection of `notificationsRoutes` + `meRoutes` — exact schema shapes confirmed |
| NOTIF-02 | Outbound-webhooks management UI on live webhooks endpoints | Direct inspection of `webhooksRoutes` — signing-secret hygiene, org-slug+project-slug paths confirmed |
</phase_requirements>

---

## Summary

Phase 3 builds the data/auth/tenant adapter seam for `@farsight/ui` and proves it against the live Farsight notifications/webhooks backend. The central grounding fact — confirmed by direct source inspection of `~/Projects/farsight-platform` — is that Farsight already ships `@farsight/sdk`, a fully-typed fluent client derived from the `apiRoutes` manifest. Phase 3 writes **no custom transport layer**: it thin-wraps `createApiClient({ baseUrl, getToken })` inside a `<FarsightProvider>` React context, adds TanStack Query v5 `queryOptions`-factory hooks that namespace query keys by org/project slugs, normalizes the SDK's typed errors into a `FarsightError` helper, and builds three new UI surfaces on top (notifications inbox + bell, notification preferences, webhooks management).

The two proving-ground surfaces exercise both tenant axes: notifications and preferences are user-scoped (`/me/*` — no org/project in the path, auth carried purely via the Clerk JWT); webhooks are org-slug + project-slug path-scoped (`/orgs/:slug/projects/:projectSlug/webhooks`). This means the phase validates the full tenant context shape end-to-end across both scoping patterns.

Key planning facts from direct source inspection: (1) `ApiClientError` carries `{ status, code, body }` — the `code` is the stable machine-readable discriminator from the `ErrorCode` namespace catalog; there is no `type` URI field and no RFC-7807 `detail` field in the error response — `message` is the human string. (2) There is no org header on any request; org flows entirely via the Clerk JWT claims (`org_id`, `org_slug`, `org_role`) and path slugs. (3) Webhook paths use `slug` (org slug) and `projectSlug` as path params — provider must expose `projectSlug` not `projectId` for webhook hooks. (4) Both `@farsight/sdk` and `@farsight/contracts` are `private: true` workspace packages — they are never published to npm and should be referenced by workspace path, not a registry version.

**Primary recommendation:** Thin-wrap `createApiClient` in a `useMemo` inside `<FarsightProvider>`, expose the client + tenant via React context, write `queryOptions` factories that close over both, and build the three surfaces as reference consumers of those hooks. No routing, no auto-toast, no Clerk ownership. Every public export goes into `src/index.ts`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth token attachment | `@farsight/sdk` (transport) | `<FarsightProvider>` (wire `getToken`) | SDK calls `getToken()` on every request; provider injects it at construction time |
| Org/project tenant context | `<FarsightProvider>` (React context) | Clerk React `useOrganization` (source) | Provider reads Clerk's active org once and exposes `useTenant()` to all hooks |
| Query key namespacing | `hooks/` (queryOptions factories) | `<FarsightProvider>` (`key=` remount) | Keys are namespaced by slugs; remount is belt-and-suspenders |
| Response validation | `@farsight/sdk` (Zod parse on every response) | — | SDK already runs `spec.response.safeParse()`; `ApiClientSchemaError` is the signal |
| Cross-cutting error handling (`auth.*`/`rbac.*`) | `<FarsightProvider>` (QueryCache/MutationCache onError) | Consumer-registered `onError` | Central point for re-auth redirect / forbidden UX |
| Per-form validation errors (`validation.*`) | individual hooks / components | — | `error.details` surfaced at form field level, not cross-cutting |
| Optimistic cache updates | `hooks/` (mutation hook factories) | — | `onMutate` / `onError` rollback pattern per TanStack docs |
| Notifications polling | `hooks/notifications.ts` | `<NotificationBell>` / `<NotificationInbox>` | `refetchInterval` + `refetchIntervalInBackground` on the shared query |
| Copy-once secret reveal | `<WebhookCreateModal>` / `<WebhookRotateSecretModal>` | — | Client-side one-shot state; server returns secret only once |
| Health badge derivation | `<WebhookEndpointRow>` (client-side derive) | — | `failureCount`/`lastSuccessAt`/`lastFailureAt` from `WebhookEndpoint` shape |
| Barrel export registry | `src/index.ts` | — | All public exports must be re-registered here (barrel-export trap) |

---

## Standard Stack

### Core (new in Phase 3 — all within `packages/ui`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@farsight/sdk` | workspace (`0.0.0`) | The typed API client to thin-wrap | Authoritative typed client; already attaches auth, validates responses, throws typed errors. Do NOT re-derive. [VERIFIED: direct source inspection] |
| `@farsight/contracts` | workspace (`0.0.0`) | Route specs, typed schemas, `ErrorCode` namespace | Contract-layer types that SDK consumes; `ApiErrorSchema`, `ErrorCode`, branded IDs |
| `@tanstack/react-query` | `^5.0.0` (peer, currently `5.100.14` latest) | `queryOptions` factories, `useQuery`, `useMutation`, `useInfiniteQuery`, `QueryCache`/`MutationCache` | TanStack v5 official recommended pattern for hook factories |
| `@clerk/react` | `^6.0.0` (peer, currently `6.7.2` latest) | `useAuth().getToken()`, `useOrganization()` for org context | Framework-agnostic Clerk React; already declared optional peer in package.json |

### Supporting (already in package, consume as-is)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `^1.17.0` (already in package) | Severity icons in notification items | `severity` → icon mapping: `info`→`Info`, `success`→`CheckCircle2`, `warning`→`AlertTriangle`, `error`→`XCircle` |
| `sonner` | `^1.0.0` (peer, already in package) | Mutation feedback toast | Surface mutation errors in proving-ground components via Phase-2 `<Toaster>` |
| Phase-2 primitives | workspace | `ErrorState`, `EmptyState`, `ConfirmDialog`, `Toaster`, `ListSkeleton`, `CardGridSkeleton` | Loading/error/empty states for all Phase 3 surfaces |

### No New External Packages Required

Phase 3 introduces **zero new npm dependencies**. All needed libraries are already declared as peers or devDependencies in `packages/ui/package.json`. The Farsight workspace packages (`@farsight/sdk`, `@farsight/contracts`) are consumed by source path, not from the npm registry. [VERIFIED: direct package.json inspection]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thin-wrap `@farsight/sdk` | Hand-roll `create-client.ts` over `apiRoutes` manifest | Hand-roll duplicates the SDK's Zod validation and auth logic; drifts from FAR-71 conformance; the SDK already does the work |
| TanStack `queryOptions` factories | Plain `useQuery` calls in each component | Factories enable `queryClient.prefetchQuery`, `useSuspenseQuery`, and per-query type inference; composable; TanStack maintainer-recommended |
| Provider-level `QueryCache onError` | Per-hook error callbacks | Cross-cutting codes (`auth.*`, `rbac.*`) need one interception point; per-hook only for field-level `validation.*` |

### Dependency Strategy: `@farsight/sdk` and `@farsight/contracts`

These are private workspace packages (`"private": true`, `"version": "0.0.0"`) that will never be published to npm. In the Helm repo (where Phase 3 is developed), they must be referenced via a workspace path link. [VERIFIED: direct inspection of both `package.json` files]

Recommendation (Claude's discretion): Add them as regular `dependencies` in `packages/ui/package.json` using `workspace:*` syntax. They are not singleton-sensitive (unlike React) and `packages/ui` owns the version it was built against. In the eventual Farsight monorepo port, they become in-repo workspace packages accessed directly — same `workspace:*` pattern. Do NOT declare them as `peerDependencies` because `apps/web` should not need to independently install SDK/contracts; the library fully wraps them. [ASSUMED — workspace dependency strategy is a planning call with no single canonical rule]

---

## Package Legitimacy Audit

> `@farsight/sdk` and `@farsight/contracts` are private `workspace:*` packages — they do not exist on the npm registry and cannot be slopcheck-verified. This is expected and safe: they are consumed by source path from the local `~/Projects/farsight-platform` checkout.
>
> No new external npm packages are introduced in Phase 3. All dependencies already appear in `packages/ui/package.json`.

| Package | Registry | Status | slopcheck | Disposition |
|---------|----------|--------|-----------|-------------|
| `@farsight/sdk` | private workspace | Not on npm (private monorepo) | N/A | Approved — direct source verified |
| `@farsight/contracts` | private workspace | Not on npm (private monorepo) | N/A | Approved — direct source verified |
| `@tanstack/react-query` | npm | Already declared peer; latest `5.100.14` | N/A (pre-existing) | Approved — pre-existing peer |
| `@clerk/react` | npm | Already declared peer; latest `6.7.2` | N/A (pre-existing) | Approved — pre-existing peer |

**slopcheck was unavailable at research time** (install blocked by sandbox). No new external packages are being introduced, so this does not gate any planning decision. The only packages consumed in Phase 3 are workspace-local or pre-existing declared peers.

---

## Architecture Patterns

### System Architecture Diagram

```
apps/web (consumer)
  └─ <ClerkProvider>                    (@clerk/react — consumer's dep)
       └─ <QueryClientProvider>         (consumer supplies, or FarsightProvider creates default)
            └─ <FarsightProvider         ← THE SEAM (Phase 3 delivers this)
                  baseUrl=""             (D-Discretion: same-origin default per SDK)
                  projectSlug={...}      (consumer supplies; optional/null for user-scoped surfaces)
               >
                  [key={orgSlug + ':' + (projectSlug ?? '')}]  ← hard-remount on switch (D-03)
                       ↓ creates ApiClient via createApiClient({ baseUrl, getToken })
                       ↓ reads org from useOrganization() / useAuth()
                       ↓ exposes useTenant() → { userId, orgId, orgSlug, role, projectSlug? }
                       ↓ exposes useApiClient() → ApiClient
                       ↓ wires QueryCache/MutationCache onError for auth.*/rbac.*

                  [Feature surfaces — Phase 3]
                  <NotificationBell />      useNotifications(interval?)
                  <NotificationInbox />     useNotifications(interval?) + useMarkRead + useMarkAllRead
                  <NotificationPreferences />  useNotificationPreferences + useUpdatePreferences
                  <WebhookList />            useWebhooks({ orgSlug, projectSlug })
                  <WebhookCreateModal />     useCreateWebhook → copy-once secret reveal
                  <WebhookRotateSecretModal /> useRotateSecret → copy-once secret reveal
                  <WebhookDeleteConfirm />   useDeleteWebhook (ConfirmDialog gate)

                       ↓ all hooks call useApiClient() + useTenant()
                       ↓ query keys: ['notifications', userId] | ['webhooks', orgSlug, projectSlug]

                  @farsight/sdk ApiClient
                  ├─ api.notifications.list({ query: { before?, limit?, unread? } })
                  ├─ api.notifications.markRead({ params: { id } })
                  ├─ api.notifications.markAllRead()
                  ├─ api.me.getNotificationPreferences()
                  ├─ api.me.updateNotificationPreferences({ body })
                  ├─ api.webhooks.list({ params: { slug, projectSlug } })
                  ├─ api.webhooks.create({ params, body })
                  ├─ api.webhooks.update({ params, body })
                  ├─ api.webhooks.delete({ params })
                  └─ api.webhooks.rotateSecret({ params })
                           ↓ Bearer token from Clerk JWT (org_id/org_slug/org_role baked in)
                           ↓ Farsight API (Hono/D1 at api.farsght.com)
```

### Recommended Directory Layout

```
packages/ui/src/
├── provider/                 # NEW: Phase 3 adapter seam
│   ├── farsight-provider.tsx # <FarsightProvider> — QueryClient + ApiClient + tenant context
│   ├── use-tenant.ts         # useTenant() → { userId, orgId, orgSlug, role, projectSlug? }
│   └── use-api-client.ts     # useApiClient() → ApiClient (internal; consumers use hooks)
├── client/                   # NEW: thin SDK wrap
│   └── create-client.ts      # re-exports createApiClient from @farsight/sdk with docs
├── errors/                   # NEW: typed error helpers
│   └── farsight-error.ts     # FarsightError, isFarsightError, matchCode
├── hooks/                    # NEW: queryOptions factories per domain
│   ├── use-notifications.ts  # useNotifications, useMarkRead, useMarkAllRead
│   ├── use-notification-preferences.ts  # useNotificationPreferences, useUpdatePreferences
│   └── use-webhooks.ts       # useWebhooks, useCreateWebhook, useUpdateWebhook,
│                             # useDeleteWebhook, useRotateWebhookSecret
└── components/
    ├── notifications/         # NEW: notification surfaces
    │   ├── notification-bell.tsx
    │   ├── notification-inbox.tsx
    │   ├── notification-item.tsx
    │   └── notification-preferences.tsx
    └── webhooks/              # NEW: webhook surfaces
        ├── webhook-list.tsx
        ├── webhook-create-modal.tsx
        ├── webhook-rotate-secret-modal.tsx
        ├── webhook-secret-reveal.tsx
        └── webhook-health-badge.tsx
```

### Pattern 1: FarsightProvider — SDK wrap + tenant context

**What:** A React context provider that constructs the `ApiClient` from the Farsight SDK, reads the active org from Clerk, and exposes both via context to all child hooks.

**When to use:** Mounted once at the app root (or feature boundary), above all hook-using components.

**Implementation detail:** The provider is itself a client component (`'use client'`). It calls `useAuth()` and `useOrganization()` from `@clerk/react` (which it does not import directly — `getToken` is passed as a prop OR read internally via Clerk's context which is mounted above). The simpler approach is to read Clerk's hooks directly inside the provider since `<ClerkProvider>` is assumed mounted above. [VERIFIED: Clerk docs confirm `useAuth()` and `useOrganization()` are available in any client component inside `<ClerkProvider>`]

```typescript
// packages/ui/src/provider/farsight-provider.tsx
'use client'
import * as React from 'react'
import { useAuth, useOrganization } from '@clerk/react'    // ← peer dep
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'  // ← peer dep
import { createApiClient, type ApiClient } from '@farsight/sdk'

// Source: direct inspection of ~/Projects/farsight-platform/packages/sdk/src/index.ts
// createApiClient({ baseUrl?, getToken, fetchImpl? }): ApiClient
// Default baseUrl = '' (same-origin — correct for production on app.farsght.com)

type TenantContext = {
  userId: string
  orgId: string | null
  orgSlug: string | null
  role: string | null    // OrgRole string e.g. 'org:admin' — open string per contract
  projectSlug?: string | null
}

type FarsightContextValue = {
  client: ApiClient
  tenant: TenantContext
}

const FarsightContext = React.createContext<FarsightContextValue | null>(null)

export type FarsightProviderProps = {
  baseUrl?: string           // Default: '' (same-origin). Set to 'https://api.farsght.com' for cross-origin.
  projectSlug?: string | null  // Consumer-supplied project scope (optional; webhooks require it)
  queryClient?: QueryClient    // Injectable; creates one with sane defaults when absent
  onError?: (error: unknown, code: string | null) => void  // Consumer-registered global handler
  children: React.ReactNode
}

const DEFAULT_QUERY_CLIENT = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
})

export function FarsightProvider({
  baseUrl = '',
  projectSlug,
  queryClient,
  onError,
  children,
}: FarsightProviderProps) {
  const { getToken, userId } = useAuth()
  const { organization } = useOrganization()

  const qc = queryClient ?? DEFAULT_QUERY_CLIENT

  // Recreate client only when baseUrl changes (getToken is stable per Clerk docs)
  const client = React.useMemo(
    () => createApiClient({ baseUrl, getToken }),
    [baseUrl, getToken],
  )

  const tenant: TenantContext = {
    userId: userId ?? '',
    orgId: organization?.id ?? null,
    orgSlug: organization?.slug ?? null,
    role: null,  // useAuth().orgRole — check actual Clerk hook shape below
    projectSlug: projectSlug ?? null,
  }

  // D-03: key={orgSlug + ':' + projectSlug} on the OUTER wrapper in apps/web
  // causes a full remount + cache reset on org/project switch.
  // The queryOptions key namespacing below is defense-in-depth.

  return (
    <FarsightContext.Provider value={{ client, tenant }}>
      <QueryClientProvider client={qc}>
        {children}
      </QueryClientProvider>
    </FarsightContext.Provider>
  )
}

export function useFarsightContext(): FarsightContextValue {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error('useFarsightContext: must be used inside <FarsightProvider>')
  return ctx
}
```

**Note on `orgRole`:** Clerk's `useAuth()` in `@clerk/react` v5+ exposes `orgRole` directly. Confirm the exact hook shape: `const { userId, orgRole } = useAuth()` — `orgRole` is a string like `'org:admin'` or null. [CITED: clerk.com/docs/hooks/use-auth — `orgRole: string | null | undefined`]

### Pattern 2: FarsightError — typed error normalization

**What:** A thin typed wrapper over `ApiClientError` with `isFarsightError()` and `matchCode()` helpers. `ApiClientSchemaError` is treated as a distinct case.

**Key insight from direct source inspection:** The SDK's `ApiClientError` carries `{ status: number, code: string, body: unknown }`. The `body` is the raw error JSON which has the full `ApiErrorSchema` shape `{ status, code, message, details?, requestId? }`. The `message` and `details` are therefore accessible via `error.body as ApiError`. The `code` at the top level of `ApiClientError` is already the namespaced string — no further parsing needed.

```typescript
// packages/ui/src/errors/farsight-error.ts
// Source: direct inspection of @farsight/sdk (ApiClientError) and @farsight/contracts (ApiErrorSchema)

import { ApiClientError, ApiClientSchemaError } from '@farsight/sdk'
import type { ApiError } from '@farsight/contracts'

export type FarsightError = {
  readonly kind: 'api'
  readonly status: number
  readonly code: string          // e.g. 'auth.invalid_token', 'validation.failed'
  readonly message: string       // Human string — for display only, never for control flow
  readonly details?: unknown     // Structured validation details from ApiError.details
  readonly requestId?: string
}

export type FarsightSchemaError = {
  readonly kind: 'schema'
  readonly issues: import('zod').ZodIssue[]
}

export function toFarsightError(e: unknown): FarsightError | FarsightSchemaError | null {
  if (e instanceof ApiClientError) {
    const body = e.body as Partial<ApiError>
    return {
      kind: 'api',
      status: e.status,
      code: e.code,                 // Already the namespaced code from ApiClientError
      message: body?.message ?? e.message,
      details: body?.details,
      requestId: body?.requestId,
    }
  }
  if (e instanceof ApiClientSchemaError) {
    return { kind: 'schema', issues: e.issues }
  }
  return null
}

export function isFarsightError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError
}

/** Pattern-match against a code namespace: matchCode(e, 'validation.*') */
export function matchCode(e: unknown, pattern: string): boolean {
  if (!(e instanceof ApiClientError)) return false
  if (pattern.endsWith('.*')) {
    return e.code.startsWith(pattern.slice(0, -2))
  }
  return e.code === pattern
}
```

### Pattern 3: `queryOptions` Factory + tenant key namespacing

**What:** A key-factory plus `queryOptions`/`mutationOptions` for each resource domain. TanStack v5 `queryOptions` is the officially-recommended approach for composable, typed, reusable query definitions.

**Notifications are user-scoped** (`['notifications', userId]`) — the contract confirms these are per-user, not org/project scoped:

```typescript
// packages/ui/src/hooks/use-notifications.ts
// Source: direct inspection of ~/Projects/farsight-platform/packages/contracts/src/notifications/routes.ts
// notificationsRoutes.list: GET /me/notifications — auth: 'required', user-scoped

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFarsightContext } from '../provider/farsight-provider'

// Key factory — userId is the correct scope for /me/* routes
export const notificationKeys = {
  all: (userId: string) => ['notifications', userId] as const,
  list: (userId: string, query?: { before?: string; limit?: number; unread?: boolean }) =>
    [...notificationKeys.all(userId), 'list', query] as const,
}

export function useNotificationsQueryOptions(opts?: {
  interval?: number | false     // Default: 10_000ms (D-07). Pass false to disable.
  before?: string               // ISO timestamp cursor for pagination
  limit?: number
  unread?: boolean
}) {
  const { client, tenant } = useFarsightContext()
  return queryOptions({
    queryKey: notificationKeys.list(tenant.userId, {
      before: opts?.before,
      limit: opts?.limit,
      unread: opts?.unread,
    }),
    queryFn: () =>
      client.notifications.list({
        query: {
          before: opts?.before,
          limit: opts?.limit,
          unread: opts?.unread !== undefined ? String(opts.unread) as 'true' | 'false' : undefined,
        },
      }),
    refetchInterval: opts?.interval ?? 10_000,
    refetchIntervalInBackground: false,    // D-07: pause when tab hidden
    staleTime: 5_000,
  })
}

// Optimistic markRead (D-08)
export function useMarkReadMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.notifications.markRead({ params: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all(tenant.userId) })
      const prev = qc.getQueryData(notificationKeys.list(tenant.userId))
      // Optimistic: mark the item read, decrement unreadCount
      qc.setQueriesData({ queryKey: notificationKeys.all(tenant.userId) },
        (old: any) => old ? { ...old,
          unreadCount: Math.max(0, old.unreadCount - 1),
          notifications: old.notifications.map((n: any) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
          )
        } : old
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      // Rollback
      if (ctx?.prev) qc.setQueryData(notificationKeys.list(tenant.userId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all(tenant.userId) }),
  })
}
```

**Webhooks are project-scoped** (`['webhooks', orgSlug, projectSlug]`) per D-13:

```typescript
// packages/ui/src/hooks/use-webhooks.ts
// Source: direct inspection of ~/Projects/farsight-platform/packages/contracts/src/webhooks/routes.ts
// webhooksRoutes: paths are /orgs/:slug/projects/:projectSlug/webhooks[/:id]
// The slug = orgSlug, projectSlug = projectSlug — both required for webhook routes

export const webhookKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ['webhooks', orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...webhookKeys.all(orgSlug, projectSlug), 'list'] as const,
}

export function useWebhooksQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  // D-02: projectSlug is required for webhooks; disable hook if absent
  const ready = !!tenant.orgSlug && !!tenant.projectSlug
  return queryOptions({
    queryKey: webhookKeys.list(tenant.orgSlug ?? '', tenant.projectSlug ?? ''),
    queryFn: () =>
      client.webhooks.list({
        params: {
          slug: tenant.orgSlug!,
          projectSlug: tenant.projectSlug!,
        },
      }),
    enabled: (opts?.enabled ?? true) && ready,
    staleTime: 30_000,
  })
}
```

### Pattern 4: Provider-level QueryCache/MutationCache onError (cross-cutting codes)

**What:** Wire `QueryCache` and `MutationCache` `onError` callbacks to handle `auth.*` and `rbac.*` codes centrally, surface `validation.*` to the per-form layer.

```typescript
// Inside FarsightProvider, when constructing the default QueryClient:
const qc = React.useMemo(() => queryClient ?? new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const fe = toFarsightError(error)
      if (fe?.kind === 'api') {
        if (matchCode(error, 'auth.*')) {
          // Trigger Clerk re-auth (e.g., call signOut() or redirect to /sign-in)
          onError?.(error, fe.code)
        } else if (matchCode(error, 'rbac.*')) {
          onError?.(error, fe.code)
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const fe = toFarsightError(error)
      if (fe?.kind === 'api' && (matchCode(error, 'auth.*') || matchCode(error, 'rbac.*'))) {
        onError?.(error, fe.code)
      }
      // validation.* handled per-form via mutation result's error
    },
  }),
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 0 } },
}), [queryClient, onError])
```

### Pattern 5: Copy-once secret reveal modal

**What:** A controlled modal that displays the `signingSecret` on create/rotate-secret response. Clears the secret from local state when closed. The list response never returns the secret (only `signingSecretPrefix`).

**Contract confirmation:** `WebhookEndpointCreateResponseSchema` extends `WebhookEndpointSchema` with `signingSecret: z.string().min(32)`. `WebhookEndpointSchema` has only `signingSecretPrefix`. [VERIFIED: direct inspection of `webhooks/routes.ts`]

```typescript
// The secret is stored in useState only until the modal is dismissed
const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
// On create mutation success:
mutation.onSuccess((data) => {
  setRevealedSecret(data.signingSecret)   // show modal
})
// On modal close: setRevealedSecret(null) — secret is gone from memory
```

### Pattern 6: Optimistic enable-toggle (no ConfirmDialog)

The webhook `update` mutation for `enabled` (toggle) uses optimistic update because the action is reversible. The `delete` and `rotateSecret` mutations do NOT use optimistic updates — they are server-confirmed (D-08) and gated by `<ConfirmDialog>`.

### Pattern 7: Notification bell + inbox share one hook

Per D-12, `<NotificationBell>` and `<NotificationInbox>` consume the same query (same key). The bell subscribes to `unreadCount` from the list response. Both can pass the same `queryOptions` to `useQuery` — TanStack deduplicates the fetch.

```typescript
// Both components call useQuery(useNotificationsQueryOptions({ interval: 10_000 }))
// The second subscriber gets a cache hit; no second network request is made.
// Bell renders only: data.unreadCount + a truncated popover of recent items
// Inbox renders: full list + pagination + mark-all-read
```

### Pattern 8: Cursor pagination with `before` + `hasMore`

The notifications contract uses `before` (ISO timestamp of oldest item seen) + `hasMore` (boolean) — not a page number. This is manual pagination, not infinite scroll using TanStack `useInfiniteQuery` (which expects a `pageParam`). Use manual `useState` for `before` and append pages locally, or use `useInfiniteQuery` with `getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.notifications.at(-1)?.createdAt : undefined`. [VERIFIED: direct inspection of `NotificationListQuerySchema` and `NotificationListResponseSchema`]

### Anti-Patterns to Avoid

- **Don't add an org header:** The SDK sends no `X-Org-Id` header. Org scope flows via the Clerk JWT (`org_id`/`org_slug` claims in the token template). Adding a header would be inventing a custom protocol not present in the contract. [VERIFIED: R-01, direct inspection of SDK + `clerk.ts`]
- **Don't own ClerkProvider inside FarsightProvider:** Consumer mounts `<ClerkProvider>`; library reads Clerk via hooks. Owning Clerk breaks re-use in consumers that already have their own Clerk setup.
- **Don't auto-toast on mutation error:** Per PROJECT.md and D-11, library exposes typed errors; consumer decides what to toast. The proving-ground surfaces toast for UX demonstration, but the hooks themselves do not.
- **Don't use `useQuery` with `refetchInterval` inside the bell AND the inbox separately:** Both should use the same `queryOptions` object — TanStack deduplicates concurrent subscriptions to the same key.
- **Don't use `projectId` in webhook paths:** The webhook routes use `orgSlug` (as `:slug`) and `projectSlug` (as `:projectSlug`). `projectId` is not a path parameter. See `ProjectWebhooksParamsSchema`. [VERIFIED: direct inspection of `webhooks/routes.ts`]
- **Don't forget to add new exports to `src/index.ts`:** Every new public component and hook must be re-exported (barrel-export trap per project memory).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typed API client with auth + Zod validation | `client/create-client.ts` over `apiRoutes` manifest | `createApiClient()` from `@farsight/sdk` | SDK already does Bearer attach, path/query building, Zod parse, typed error throw |
| Bearer token injection | Custom `fetch` wrapper / interceptor | `createApiClient({ getToken })` — `getToken` called on every request inside SDK | SDK's inner loop calls `await getToken()` per request; no interceptor needed |
| Response schema validation | Zod `.parse()` in every hook | SDK's built-in `spec.response.safeParse()` — `ApiClientSchemaError` on drift | SDK validates every 2xx response; `ApiClientSchemaError` is the signal for contract drift |
| Clipboard copy | Custom clipboard implementation | `navigator.clipboard.writeText(secret)` | Browser API; no polyfill needed for modern targets |
| Pagination cursor state | Custom cursor manager | `useState<string | undefined>(before)` + `hasMore` from response | The contract's `before` cursor + `hasMore` flag is simple enough for manual state |

**Key insight:** The SDK is the transport contract. Phase 3's entire value-add is the React layer (provider context, query hooks, error normalization, UI surfaces) — not re-implementing what the SDK already provides.

---

## Common Pitfalls

### Pitfall 1: Cross-tenant cache bleed on org/project switch

**What goes wrong:** Query cache from Org A is visible when user switches to Org B because query keys do not include org/project scope.

**Why it happens:** TanStack cache is keyed by the array you provide. If key is just `['notifications']` with no tenant segment, Org B's component renders Org A's cached notifications.

**How to avoid:**
- Keys include tenant slug: `['notifications', userId]`, `['webhooks', orgSlug, projectSlug]`
- Provider has `key={orgSlug + ':' + (projectSlug ?? '')}` at mount point in consumer (D-03) — this causes full remount, clearing the QueryClient cache on switch
- Belt-and-suspenders: slugs in keys even with remount

**Warning signs:** Single-org testing only; query key arrays with no tenant segment; switching org shows stale data briefly.

### Pitfall 2: `useOrganization()` org data is null between org switches

**What goes wrong:** Clerk's `useOrganization()` returns `{ organization: null }` during the transition when `setActive({ organization: nextOrg })` is called. If the provider reads `organization?.id` during this window, it gets `null` and the SDK client is constructed without org context.

**Why it happens:** Clerk's active org is async-loaded; there's a brief null window after `setActive`.

**How to avoid:** The provider's `key` prop (D-03) causes remount on org change, which remounts all child hooks. During the null window, hooks with `enabled: !!tenant.orgSlug` return `{ data: undefined, isLoading: false }` cleanly. The `useTenant()` hook should expose nullability explicitly so callers can guard.

**Warning signs:** Webhooks hook fires with `slug: null` → 400 from API.

### Pitfall 3: Notification polling fires when tab is hidden, causing spurious wake locks

**What goes wrong:** `refetchInterval: 10_000` with `refetchIntervalInBackground: true` (the default) keeps polling even when the browser tab is hidden, wasting battery and bandwidth.

**How to avoid:** Always set `refetchIntervalInBackground: false` on notification queries (D-07). TanStack Query v5 respects the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) when this is false. [CITED: TanStack Query v5 docs — `refetchIntervalInBackground`]

**Warning signs:** Network tab shows requests at 10s interval even when tab is not focused.

### Pitfall 4: `signingSecret` state leaking if modal close is interrupted

**What goes wrong:** The reveal modal's `useState` is inside the parent component. If the parent unmounts due to routing while the modal is open, React cleans up the state — but if the secret is stored in a parent ref or context rather than local state, it can outlive the modal.

**How to avoid:** Store `revealedSecret` only in local `useState` within the component that shows the modal. Close clears it (`setRevealedSecret(null)`). Never store in `QueryClient` cache or context.

### Pitfall 5: `queryOptions` factory called outside provider throws hook error

**What goes wrong:** A component calls `useNotificationsQueryOptions()` which internally calls `useFarsightContext()`, but `<FarsightProvider>` is not mounted above it.

**How to avoid:** `useFarsightContext()` throws a clear error message: `'useFarsightContext: must be used inside <FarsightProvider>'`. Document this in the hook's JSDoc. The hook factory pattern means the options object is created inside the hook call — it cannot be used outside React.

### Pitfall 6: Forgetting `'use client'` directive on provider and surface components

**What goes wrong:** Provider and surface components call React hooks (`useAuth`, `useOrganization`, `useState`, `useQuery`). Without `'use client'`, they fail in RSC environments.

**How to avoid:** All files in `provider/`, `hooks/`, `components/notifications/`, `components/webhooks/` must have `'use client'` as the first line. The CI `check-imports.sh` script currently checks for forbidden imports but does NOT enforce directive presence — this is a manual discipline enforced by tsdown's `rollup-preserve-directives` plugin.

### Pitfall 7: `@farsight/sdk` imported as a bare specifier without workspace resolution

**What goes wrong:** Build fails with `Cannot resolve @farsight/sdk` because the Helm repo's `packages/ui/package.json` does not declare the workspace dependency.

**How to avoid:** Add `"@farsight/sdk": "workspace:*"` and `"@farsight/contracts": "workspace:*"` to `packages/ui`'s `dependencies`. Verify the Helm repo's root `pnpm-workspace.yaml` (or equivalent) includes the Farsight platform packages path. [ASSUMED — workspace linking configuration is a planner verification step]

---

## Code Examples

### SDK call pattern (confirmed from source)

```typescript
// Source: ~/Projects/farsight-platform/packages/sdk/src/index.ts
// The ApiClient type is: api[resource][routeName](input?) => Promise<RouteOutput<spec>>
// For routes with no params/query/body, the arg is omitted entirely.

// ─── No input (method signature is `() => Promise<T>`) ───────────────
const prefs = await api.me.getNotificationPreferences()   // no arg

// ─── With query ───────────────────────────────────────────────────────
const notifs = await api.notifications.list({
  query: { before: '2026-01-01T00:00:00Z', limit: 50 }
})

// ─── With params ─────────────────────────────────────────────────────
await api.notifications.markRead({ params: { id: 'abc-uuid' } })

// ─── With params + body ───────────────────────────────────────────────
const endpoint = await api.webhooks.create({
  params: { slug: 'my-org', projectSlug: 'my-project' },
  body: { url: 'https://example.com/hook', eventTypes: ['dataset.*'] },
})
// endpoint.signingSecret is present on create (WebhookEndpointCreateResponseSchema)
// endpoint.signingSecretPrefix is the list-safe field

// ─── Error handling ───────────────────────────────────────────────────
// ApiClientError: non-2xx response
//   .status (number), .code (string e.g. 'validation.failed'), .body (raw JSON)
// ApiClientSchemaError: 2xx but response failed Zod parse
//   .issues (ZodIssue[])
```

### ErrorCode constants (from source)

```typescript
// Source: ~/Projects/farsight-platform/packages/contracts/src/common/errors.ts
// Branch on these strings, NOT on message text.
// ErrorCode.AuthMissingBearer = 'auth.missing_bearer'
// ErrorCode.AuthInvalidToken  = 'auth.invalid_token'
// ErrorCode.AuthExpiredToken  = 'auth.expired_token'
// ErrorCode.RbacForbidden     = 'rbac.forbidden'
// ErrorCode.RbacProjectAccessDenied = 'rbac.project_access_denied'
// ErrorCode.ValidationFailed  = 'validation.failed'
// ErrorCode.ResourceNotFound  = 'resource.not_found'
// Provider handles: matchCode(e, 'auth.*'), matchCode(e, 'rbac.*')
// Components handle: matchCode(e, 'validation.*') → render error.details as field errors
// Components handle: matchCode(e, 'resource.not_found') → render <ErrorState>
```

### Notification contract shapes (from source)

```typescript
// Source: ~/Projects/farsight-platform/packages/contracts/src/notifications/routes.ts

// InAppNotification fields relevant to UI:
// id: string (UUID)
// eventType: string
// category: 'security' | 'product' | 'marketing'
// title: string
// body: string | null
// href: string | null        ← consumer routes via onNavigate(href)
// severity: 'info' | 'success' | 'warning' | 'error' | null
// orgId: string | null       ← org scope context (informational)
// projectId: string | null   ← project scope context (informational)
// createdAt: string (ISO datetime)
// readAt: string (ISO datetime) | null   ← null = unread

// Severity → Lucide icon mapping (Claude's discretion):
// 'info'    → Info (lucide)
// 'success' → CheckCircle2 (lucide)
// 'warning' → AlertTriangle (lucide)
// 'error'   → XCircle (lucide)
// null      → Bell (lucide) — generic fallback

// tokens.ts severity color mapping (extend tokens.color):
// Use tokens.color.destructive for 'error'
// Use 'var(--color-warning)' or tokens.chart[4] for 'warning' (planner decides)
// Use tokens.color.primary for 'success'
// Use tokens.color.mutedFg for 'info'
```

### Webhook contract shapes (from source)

```typescript
// Source: ~/Projects/farsight-platform/packages/contracts/src/webhooks/routes.ts

// WebhookEndpoint (list/get response):
// id: string (matches /^whe_[a-z2-7]{16}$/)
// projectId: string
// url: string (HTTPS-only)
// eventTypes: string[]         ← glob patterns (no enum)
// enabled: boolean
// signingSecretPrefix: string  ← always visible in list
// createdAt: string (ISO)
// lastSuccessAt: string | null
// lastFailureAt: string | null
// failureCount: number

// WebhookEndpointCreateResponse (create + rotateSecret response only):
// ...all WebhookEndpoint fields PLUS:
// signingSecret: string (min 32 chars)  ← show-once, not in list response

// Health badge derivation (D-15):
// if (!endpoint.enabled)                           → 'Disabled'
// if (endpoint.failureCount > 0 || (endpoint.lastFailureAt && endpoint.lastSuccessAt &&
//     endpoint.lastFailureAt > endpoint.lastSuccessAt))  → 'Failing'
// else                                              → 'Healthy'

// eventTypes: free-form glob strings (e.g. 'dataset.*', 'agent.run.completed')
// Validation: 1–100 chars each, max 50 items (WebhookEndpointCreateBodySchema)
// No server-side enum — chip/tag input allows any string
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled `fetch` with manual auth headers | `@farsight/sdk` `createApiClient` with built-in Zod validation | Phase 3 (introduces SDK) | Eliminates all manual auth/type plumbing in hooks |
| RFC-7807 `type` URI discriminator | Namespaced `code` string (`auth.*`, `validation.*`, etc.) | Farsight contract design | Branch on `code`, not `type`; matches actual contract |
| Per-`userId` cache keys from Helm | Per-`orgSlug`/`projectSlug` keys | Phase 3 tenancy remodel | Prevents cross-tenant cache bleed |
| TanStack v3/v4 `useQuery` direct | TanStack v5 `queryOptions` factories | TanStack v5 (released 2024) | Composable, type-safe, supports prefetch + Suspense |
| Org header `X-Org-Id` (old assumption) | No org header; org via Clerk JWT claims + path slugs | Verified against `@farsight/sdk` source | No custom header logic needed |

**Deprecated/outdated (from prior research, now superseded):**
- `client/create-client.ts` hand-rolled over `apiRoutes` — superseded by `@farsight/sdk` thin-wrap
- "Future fluent SDK" language in project research docs — the SDK is live and ships `createApiClient`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@farsight/sdk` and `@farsight/contracts` should be regular `dependencies` (not `peerDependencies`) of `packages/ui` | Standard Stack / Dependency Strategy | If treated as peers, `apps/web` must independently install them — unnecessary friction since the library wraps them fully |
| A2 | QueryClient default options: `staleTime: 30_000`, `retry: 1` for queries, `retry: 0` for mutations | Architecture Patterns | If wrong, too-aggressive refetching or silent retry of destructive mutations; planner should expose as FarsightProvider props |
| A3 | `tokens.color.destructive` maps cleanly to 'error' severity; `'var(--color-warning)'` token exists for 'warning' severity | Code Examples | If `--color-warning` is not in `theme.css`, hardcoded color fallback needed; planner verify against `src/styles/theme.css` |
| A4 | `useAuth()` from `@clerk/react` exposes `orgRole` directly (not only via `useOrganization`) | Architecture Patterns / Pattern 1 | If `orgRole` is only on `useOrganization()`, the provider must read from there instead; low-risk, easy fix |
| A5 | Helm repo's `pnpm-workspace.yaml` can be configured to include `~/Projects/farsight-platform/packages/*` for workspace resolution | Standard Stack | If the repos can't be linked this way, SDK/contracts must be copied into the Helm repo; significant effort change |

**All other claims in this research are VERIFIED via direct source inspection of `~/Projects/farsight-platform` or CITED from official documentation.**

---

## Open Questions

1. **Workspace linking for `@farsight/sdk` / `@farsight/contracts` in the Helm repo**
   - What we know: Both are `private: true` workspace packages in `~/Projects/farsight-platform`
   - What's unclear: How the Helm repo's pnpm workspace is configured to resolve them — does it include the Farsight platform path, or do sources need to be copied?
   - Recommendation: Wave 0 task to verify `pnpm-workspace.yaml` in the Helm repo root and add `../farsight-platform/packages/*` if needed. If workspace linking is not feasible, plan to copy SDK/contracts source into `packages/` in the Helm repo.

2. **`tokens.ts` warning severity token**
   - What we know: `tokens.ts` exports `tokens.color` with `destructive`, `primary`, `mutedFg`, `border`, `background`, `foreground`, `muted` — no `warning` token
   - What's unclear: Whether a `var(--color-warning)` CSS variable exists in `theme.css`
   - Recommendation: Planner to grep `src/styles/theme.css` for `warning`. If absent, add it as part of the notification severity token contract, or map 'warning' to `tokens.chart[3]` as a stopgap.

3. **Notification `hasMore` pagination UX approach**
   - What we know: Contract returns `hasMore: boolean` + `before` ISO cursor; `useInfiniteQuery` can be wired to it
   - What's unclear: Whether Phase 3 delivers infinite-scroll or a "Load more" button, or paginated pages
   - Recommendation: "Load more" button with manual `before` state is simpler and matches the v1 polling model; `useInfiniteQuery` is heavier setup for minimal gain at this stage. Planner decides.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@farsight/sdk` | DATA-02 | ✓ (local checkout at `~/Projects/farsight-platform`) | `0.0.0` (workspace) | — |
| `@farsight/contracts` | DATA-02, DATA-04 | ✓ (local checkout at `~/Projects/farsight-platform`) | `0.0.0` (workspace) | — |
| Farsight API (live endpoints) | NOTIF-01, NOTIF-02 | ✓ (notifications, webhooks, orgs, projects, me — all live per PROJECT.md) | current production | — |
| `@tanstack/react-query` | DATA-03 | ✓ (declared optional peer; latest `5.100.14`) | `^5.0.0` | — |
| `@clerk/react` | DATA-01 | ✓ (declared optional peer; latest `6.7.2`) | `^6.0.0` | — |
| `vitest` | test suite | ✓ (dev dep in `packages/ui`) | `^4.1.7` | — |
| `pnpm` | workspace linking | ✓ (Helm repo uses pnpm) | (check `pnpm -v`) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Note:** The workspace linking of `@farsight/sdk` / `@farsight/contracts` into the Helm repo must be confirmed as a Wave 0 task (see Open Question 1). The packages exist locally; the question is pnpm workspace configuration.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.7` + `@testing-library/react` `^16.3.2` |
| Config file | `packages/ui/vitest.config.ts` (existing, jsdom env) |
| Quick run command | `npx vitest run packages/ui/__tests__/ -t "provider\|hooks\|error"` |
| Full suite command | `npm test` (from `packages/ui/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `<FarsightProvider>` renders children; `useTenant()` returns correct shape | unit | `npx vitest run packages/ui/__tests__/provider/farsight-provider.test.tsx` | ❌ Wave 0 |
| DATA-01 | `useTenant()` throws outside provider | unit | same file | ❌ Wave 0 |
| DATA-02 | `createApiClient` called with correct `getToken` and `baseUrl` | unit (mock SDK) | `npx vitest run packages/ui/__tests__/client/create-client.test.ts` | ❌ Wave 0 |
| DATA-03 | Query keys include tenant slugs; switching `key` prop resets cache | unit | `npx vitest run packages/ui/__tests__/hooks/use-notifications.test.tsx` | ❌ Wave 0 |
| DATA-03 | `useWebhooksQueryOptions` disabled when `projectSlug` is null | unit | `npx vitest run packages/ui/__tests__/hooks/use-webhooks.test.tsx` | ❌ Wave 0 |
| DATA-04 | `isFarsightError` / `matchCode` / `toFarsightError` normalize correctly | unit | `npx vitest run packages/ui/__tests__/errors/farsight-error.test.ts` | ❌ Wave 0 |
| DATA-04 | `ApiClientSchemaError` produces `kind: 'schema'` | unit | same file | ❌ Wave 0 |
| DATA-05 | Multi-org cache bleed: switch org → cache keys distinct → no bleed | integration (msw mock) | `npx vitest run packages/ui/__tests__/integration/multi-org-cache.test.tsx` | ❌ Wave 0 |
| DATA-06 | Rename a contract field → TypeScript compile error at hook call site | type-check (tsc) | `npx tsc --noEmit -p packages/ui/tsconfig.json` | ✅ (tsc exists) |
| DATA-06 | `useMarkReadMutation` optimistic update rolls back on error | unit | `npx vitest run packages/ui/__tests__/hooks/use-notifications.test.tsx` | ❌ Wave 0 |
| NOTIF-01 | `<NotificationBell>` renders badge with `unreadCount` | unit | `npx vitest run packages/ui/__tests__/components/notification-bell.test.tsx` | ❌ Wave 0 |
| NOTIF-01 | `<NotificationInbox>` renders empty state when no notifications | unit | `npx vitest run packages/ui/__tests__/components/notification-inbox.test.tsx` | ❌ Wave 0 |
| NOTIF-01 | `<NotificationPreferences>` updates and shows success | unit | `npx vitest run packages/ui/__tests__/components/notification-preferences.test.tsx` | ❌ Wave 0 |
| NOTIF-02 | Signing secret shown in reveal modal on create | unit | `npx vitest run packages/ui/__tests__/components/webhook-secret-reveal.test.tsx` | ❌ Wave 0 |
| NOTIF-02 | `<WebhookList>` derives health badge correctly from endpoint shape | unit | `npx vitest run packages/ui/__tests__/components/webhook-health-badge.test.tsx` | ❌ Wave 0 |
| NOTIF-02 | Delete / rotate-secret gated by ConfirmDialog | unit | `npx vitest run packages/ui/__tests__/components/webhook-list.test.tsx` | ❌ Wave 0 |

### Key Validation Signals

1. **DATA-06 end-to-end type flow:** `tsc --noEmit` passes; then rename any field in `@farsight/contracts/src/notifications/routes.ts` → `tsc --noEmit` fails at the hook call site. This proves the contract-to-hook type chain is intact. [Observable, deterministic]

2. **DATA-03 multi-org cache bleed (success criterion 2):** Render provider with orgSlug="org-a", populate cache via mock. Change provider `key` to orgSlug="org-b". Assert `queryClient.getQueryData(['notifications', ...])` returns undefined (cache cleared). This is the most important correctness test for the tenancy model. [Automated via integration test with mock QueryClient]

3. **DATA-04 error code branching:** Render a component that calls a hook with a mock API client that throws `new ApiClientError('Forbidden', { status: 403, code: 'rbac.forbidden', body: {} })`. Assert `<ErrorState>` is rendered and `onError` was called with the expected code.

4. **D-14 secret-shown-once:** Render the create modal. Assert `signingSecret` is visible. Click "I've copied it" / close. Assert `signingSecret` text is no longer in the DOM. [Unit test against local state]

5. **CI import guard:** `packages/ui/scripts/check-imports.sh` must continue to pass — no `next/*` or `@clerk/nextjs/server` introduced by Phase 3 code.

### Sampling Rate

- **Per task commit:** `npx vitest run packages/ui/__tests__/` (full package test suite, ~10s)
- **Per wave merge:** `npm test` from `packages/ui/` + `npx tsc --noEmit -p packages/ui/tsconfig.json` + `bash packages/ui/scripts/check-imports.sh`
- **Phase gate:** All above green before `/gsd:verify-work`

### Wave 0 Gaps

All test files listed above are new (none exist yet for Phase 3 code). The Wave 0 plan must create:

- [ ] `packages/ui/__tests__/provider/farsight-provider.test.tsx` — covers DATA-01
- [ ] `packages/ui/__tests__/client/create-client.test.ts` — covers DATA-02
- [ ] `packages/ui/__tests__/hooks/use-notifications.test.tsx` — covers DATA-03, DATA-06 (optimistic)
- [ ] `packages/ui/__tests__/hooks/use-webhooks.test.tsx` — covers DATA-03 (disabled when no project)
- [ ] `packages/ui/__tests__/errors/farsight-error.test.ts` — covers DATA-04
- [ ] `packages/ui/__tests__/integration/multi-org-cache.test.tsx` — covers DATA-03 + DATA-05 (the critical cache-bleed test)
- [ ] Component test files for NOTIF-01/02 surfaces (6 files)

**Test infrastructure note:** Existing test patterns in `__tests__/characterization/` and `__tests__/a11y/` use `renderHook` from `@testing-library/react` and MSW-style mock patterns. Phase 3 tests should follow the same pattern. For hooks that call `useFarsightContext()`, wrap renders in a test `<FarsightProvider>` with a mock `createApiClient` (inject `fetchImpl` that returns fixtures — `CreateApiClientOptions.fetchImpl` is supported by the SDK). [VERIFIED: direct inspection of `CreateApiClientOptions` in SDK]

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Clerk JWT Bearer — `getToken()` called per request by SDK |
| V3 Session Management | Partial | Clerk owns session; provider reads active org from session |
| V4 Access Control | Yes | `rbac.*` errors from API surfaced via `onError`; frontend gating is UX-only (backend is authority) |
| V5 Input Validation | Yes | Webhook URL: HTTPS-only enforced by `WebhookEndpointCreateBodySchema` (server-side); eventTypes: 1–100 chars, max 50 items enforced by Zod schema |
| V6 Cryptography | Yes (webhook secret) | `signingSecret` shown once, cleared from state on modal close; never stored in QueryClient cache or context |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale cross-tenant data displayed after org switch | Information Disclosure | Per-slug query keys + `key=` remount (D-03); backend `requireOrgMember()` is security authority |
| Signing secret exposed beyond one-shot reveal | Information Disclosure | Store only in local `useState`; clear on modal close; never cache in QueryClient |
| SSRF via webhook URL | Elevation of Privilege | Backend (`@farsight/api`) validates private IPs; frontend schema enforces HTTPS only |
| Frontend bypassing RBAC by calling API directly | Elevation of Privilege | Backend `requireOrgMember()` enforces; frontend `rbac.*` error handling is UX only |
| JWT token replay after org switch | Spoofing | Clerk rotates JWTs on `setActive()`; SDK calls `getToken()` per request (fresh token each time) |
| `validation.*` error details leaked to end users | Information Disclosure | `matchCode(e, 'validation.*')` handler surfaces `error.details` only in form field context; `onError` callback at provider level for cross-cutting — consumer decides what to show |

---

## Sources

### Primary (HIGH confidence — direct source inspection)

- `~/Projects/farsight-platform/packages/sdk/src/index.ts` — `createApiClient`, `ApiClient` type, `ApiClientError`, `ApiClientSchemaError`, `CreateApiClientOptions`, `RouteInput`/`RouteOutput` types [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/common/errors.ts` — `ApiErrorSchema`, `ErrorCode` namespace catalog, `ApiErrorEnvelope` class [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/auth/clerk.ts` — `ClerkClaimsSchema` (org_id/org_slug/org_role nullable), `AuthContext` shape, no org header confirmation [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/notifications/routes.ts` — `InAppNotificationSchema`, `NotificationListQuerySchema`/`ResponseSchema`, polling + cursor contract [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/me/routes.ts` — `meRoutes`, `NotificationPreferencesResponseSchema`, `NotificationPreferencesUpdateBodySchema` [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/webhooks/routes.ts` — `webhooksRoutes`, `WebhookEndpointSchema`, `WebhookEndpointCreateResponseSchema` (signingSecret), `ProjectWebhooksParamsSchema` (slug + projectSlug), `WebhookEndpointUpdateBodySchema` (PATCH semantics) [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/orgs/routes.ts` — `OrgSchema`, `OrgRoleSchema` (open string `org:*`) [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/projects/routes.ts` — `ProjectSchema`, `ProjectSlugSchema`, `ProjectStatusSchema` [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/api-routes.ts` — canonical `apiRoutes` manifest; confirms webhooks, notifications, me, orgs, projects are included [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/route-manifest.ts` — `RouteSpec`, `walkRoutes` [VERIFIED]
- `~/Projects/farsight-platform/packages/contracts/src/common/ids.ts` — `OrgIdSchema`, `OrgSlugSchema`, `ProjectIdSchema`, `ProjectSlugSchema`, `OrgRoleSchema` [VERIFIED]
- `packages/ui/package.json` — current peer deps, `@clerk/react ^6.0.0`, `@tanstack/react-query ^5.0.0` already declared [VERIFIED]
- `packages/ui/src/index.ts` — current barrel exports, no provider/hooks exports yet [VERIFIED]
- `packages/ui/src/components/page/error-state.tsx` — `ErrorStateProps` API: `title?`, `description?`, `icon?`, `onRetry?`, `action?` [VERIFIED]
- `packages/ui/src/components/page/confirm-dialog.tsx` — `ConfirmDialogProps` API: `open`, `onOpenChange`, `title`, `description?`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `onConfirm` [VERIFIED]
- `packages/ui/src/lib/tokens.ts` — `tokens.chart[N]`, `tokens.color` keys [VERIFIED]

### Secondary (MEDIUM-HIGH confidence — official documentation)

- [TanStack Query v5 — `queryOptions`](https://tanstack.com/query/v5/docs/framework/react/guides/query-options) — factory pattern, composability [CITED]
- [TanStack Query v5 — Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates) — `onMutate`/`onError`/`onSettled` rollback [CITED]
- [TanStack Query v5 — `QueryCache` / `MutationCache` onError](https://tanstack.com/query/v5/docs/reference/QueryCache) — cross-cutting error handling [CITED]
- [Clerk docs — `useAuth()`](https://clerk.com/docs/hooks/use-auth) — `getToken`, `userId`, `orgRole` [CITED]
- [Clerk docs — `useOrganization()`](https://clerk.com/docs/hooks/use-organization) — `organization.id`, `organization.slug` [CITED]
- [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — `refetchIntervalInBackground: false` behavior [CITED]
- `.planning/phases/03-adapter-seam-tenancy-notifications-proving-ground/03-CONTEXT.md` — locked decisions D-01..D-15, reconciliations R-01..R-03 [internal, HIGH]
- `.planning/PROJECT.md` — constraints, out-of-scope, key decisions [internal, HIGH]
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `FEATURES.md` — project-level research [internal, HIGH]
- `.planning/phases/02-headless-core-port/02-PATTERNS.md` — alias rewrite conventions, per-module export pattern [internal, HIGH]

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` apply to all Phase 3 work:

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| Framework-agnostic React (no `next/*`) | All provider/hooks/surfaces must have zero `next/*` imports; CI `check-imports.sh` enforces |
| No `@clerk/nextjs/server` | Use `@clerk/react` (`useAuth`, `useOrganization`) only |
| Data access via `@farsight/contracts` SDK, honor RFC-7807 | Thin-wrap SDK; `FarsightError` normalized from `ApiClientError` with `code`-based branching |
| Tenancy is org/project, not per-userId | `useTenant()` exposes `orgSlug`/`projectSlug`; all query keys use these |
| No auto-toast on mutation error | Hooks return typed errors; surfaces decide what to toast |
| No library routing/nav ownership | `href` via consumer `onNavigate` callback; no router imports |
| Every new public export to `src/index.ts` | Barrel-export trap; Wave 0 or per-task registration |
| `'use client'` preserved in dist | tsdown config already uses `rollup-preserve-directives`; all Phase 3 files must carry the directive |
| `@farsight/ui` is `private: true` | No publish to npm registry; consumed via `workspace:*` |

---

## Metadata

**Confidence breakdown:**
- SDK wrap shape: HIGH — direct source inspection of `createApiClient`; no inference required
- Clerk React patterns: HIGH — official `@clerk/react` v6 docs; hooks confirmed against installed peer version `6.7.2`
- TanStack Query v5 patterns: HIGH — official v5 docs; `queryOptions` factory and optimistic update patterns verified
- Contract shapes (notifications/webhooks): HIGH — direct source inspection of all route files
- Error normalization: HIGH — `ApiClientError`/`ApiClientSchemaError` shapes verified from SDK source; `ErrorCode` catalog from contracts
- Tenancy/query key design: HIGH — derived from contract path structures + pitfalls research
- Workspace dep strategy for `@farsight/sdk`/`@farsight/contracts`: ASSUMED (A1) — planning call
- Token severity color mapping: ASSUMED (A3) — pending `theme.css` inspection

**Research date:** 2026-05-29
**Valid until:** 2026-07-01 (stable SDK/contracts; 30-day validity for core layer; re-verify if contracts change)
