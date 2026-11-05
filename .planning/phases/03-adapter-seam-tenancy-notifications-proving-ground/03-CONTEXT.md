# Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the data/auth/tenant adapter seam for `@farsight/ui` and prove it end-to-end against the one live Farsight backend domain (notifications/webhooks). A consumer mounts `<FarsightProvider>` once and gets a typed, org/project-scoped data layer that round-trips against the real Farsight API, demonstrated by three working surfaces: a notifications inbox (+ bell), notification preferences, and outbound-webhooks management.

**Delivers (requirements in scope):** DATA-01..DATA-06 (provider, typed SDK client, tenant-namespaced hooks, RFC-7807 typed errors, org/project tenancy remodel, optimistic mutations + end-to-end type flow) and NOTIF-01/NOTIF-02 (notifications inbox + preferences UI; outbound-webhooks management UI). See `.planning/REQUIREMENTS.md`.

**Grounding fact that reshapes the work (verified by direct source inspection of `~/Projects/farsight-platform`):** Farsight already ships **`@farsight/sdk`** — a fluent, manifest-derived typed client (`createApiClient({ baseUrl, getToken })`). The seam is therefore a **thin React-layer wrap of the SDK** (provider + tenant context + query/mutation hook factories + a typed error helper), **not** a hand-rolled `client/create-client.ts`. Notifications/webhooks endpoints are live, so Phase 3 needs **no endpoint mocking** (that's a Phase 4 concern for contract-only surfaces). The proving ground exercises **both** tenancy axes: notifications/preferences are user-scoped (`/me/*`); webhooks are **org-slug + project-slug path-scoped** (`/orgs/:slug/projects/:projectSlug/webhooks`).

</domain>

<decisions>
## Implementation Decisions

### Provider & tenancy (DATA-01, DATA-05)
- **D-01:** `<FarsightProvider>` resolves the **active org from Clerk** (the `org_id`/`org_slug`/`org_role` JWT claims, via `useAuth`/`useOrganization`) and takes **`projectSlug` as a consumer prop**. The library does **not** own project-selection state or URL — `apps/web` owns routing/nav/project selection (consistent with PROJECT.md "app shell / routing / navigation ownership = consumer's"). Provider exposes a `useTenant()` hook returning `{ userId, orgId, orgSlug, role, projectSlug? }`.
- **D-02:** Project scope is **optional / nullable**. User- and org-scoped hooks (notifications, preferences, orgs) work with **no** project selected. Project-scoped hooks (webhooks now; datasets/pipelines/agents in Phase 4) **require** `projectSlug` and must error/disable cleanly when it is absent (no silent wrong-scope fetches).
- **D-03:** On active-org or active-project switch, the provider **hard-remounts** (React `key` on org `+` project) so the QueryClient cache fully **resets** — bulletproof against cross-tenant/stale data (success criterion 2) — **and** every query key is **namespaced** with the tenant slugs as defense-in-depth. (See D-13 for the key axis.)
- **D-04:** `<FarsightProvider>` supplies an **injectable `QueryClient`** (creates one with sane defaults when none is passed); it assumes Clerk's `<ClerkProvider>` is mounted above it and consumes `getToken` to build the SDK client (it does **not** own/wrap Clerk).

### Typed SDK client (DATA-02)
- **D-05:** **Thin-wrap `@farsight/sdk`'s `createApiClient({ baseUrl, getToken, fetchImpl? })`** — do NOT hand-roll a client over the `apiRoutes` manifest. The SDK already attaches the Clerk Bearer token, substitutes path params, builds query strings, validates responses through the route's Zod `response` schema, and throws `ApiClientError`/`ApiClientSchemaError`. The library's job is to (a) construct the client with `getToken` wired to Clerk's `getToken()` and a `baseUrl` prop, and (b) expose it to hooks via context.
- **D-06:** **No custom org header.** Active org reaches the API via the **Clerk JWT claim** (`org_id`/`org_slug` baked into the token template) and via **path slugs** (`/orgs/:slug/...`). The success-criterion phrase "+ org header on every request" is **superseded by the real contract** — there is no org header; do not invent one. (Reconciliation R-01.)

### Tenant-namespaced data hooks (DATA-03, DATA-06)
- **D-07:** Hooks are **`queryOptions`-factory** style with tenant-namespaced keys. Notifications poll on a **10s interval, paused when the tab is hidden** (`refetchIntervalInBackground: false`), with the interval **injectable via prop** (consumer can tune/disable). Cursor pagination uses the contract's `before` (ISO timestamp) + `hasMore`.
- **D-08:** **Optimistic** mutations: `markRead` / `markAllRead` (notifications) and webhook **enable-toggle** update the cache immediately with **rollback on error**. **Server-confirmed** mutations: webhook **create / rotate-secret / delete** (create & rotate must surface the server's real one-time secret; delete is destructive). End-to-end type flow holds: renaming a `@farsight/contracts` field breaks the call site at compile time (DATA-06).

### RFC-7807 typed errors (DATA-04)
- **D-09:** The library exposes a **thin typed `FarsightError`** normalized from the SDK's `ApiClientError` (`{ status, code, message, details?, requestId? }`) plus ergonomic helpers (`isFarsightError(e)`, `matchCode(e, 'validation.*')`), and treats `ApiClientSchemaError` (2xx response-shape drift) as a **distinct** case. **Branch on `code`, never on `message`.** (Reconciliation R-02: the contract discriminator is the namespaced **`code`** string — `auth.*`/`rbac.*`/`validation.*`/`resource.*`/`quota.*`/`integration.*`/`internal.*` — **not** a `type` URI as REQUIREMENTS.md DATA-04 phrases it.)
- **D-10:** **Error mapping split:** a `QueryCache`/`MutationCache` `onError` inside `<FarsightProvider>` handles **cross-cutting** codes (`auth.*` → trigger Clerk re-auth/sign-in; `rbac.*` → forbidden) and exposes a consumer-registerable `onError` callback; **per-form/per-hook** handling surfaces `validation.*` field errors from `error.details`; `resource.not_found` → `ErrorState`.

### Error/empty/loading surfacing (NOTIF-01/02, ties to Phase-2 primitives)
- **D-11:** **Generic data hooks do not auto-toast** (PROJECT.md boundary). The proving-ground **surfaces act as reference consumers**: query failures render the Phase-2 `<ErrorState onRetry>` inline; mutation failures **toast via the shipped `<Toaster>` at the surface**; the provider's registerable `onError` is the cross-cutting hook the real `apps/web` uses. Loading → Phase-2 skeletons; empty → `<EmptyState>`.

### Notifications surface (NOTIF-01)
- **D-12:** Ship **both** a compact `<NotificationBell>` (popover + `unreadCount` badge, for the app-shell header) **and** a full paginated `<NotificationInbox>` surface, backed by **one shared data hook**. Mark-read on item click/open + a "Mark all read" action; live unread badge. Item render: `severity` → Lucide icon + **token color** (`tokens.ts`, no hardcoded hex), `category` as a subtle label, unread visually distinct, **flat newest-first**. `href` is **consumer-wired** (an `onNavigate(href)` callback / slot link — library doesn't own routing); no-href items just mark read.

### Webhooks surface (NOTIF-02)
- **D-13 (query-key axis):** Namespace project-scoped keys by the **slugs** that actually vary the response — e.g. `['webhooks', orgSlug, projectSlug]`; user-scoped by `['notifications', userId]`. (Slugs, because the webhook paths are slug-addressed.)
- **D-14:** The one-time `signingSecret` (returned on **create** and **rotate-secret**) is shown in a **copy-once modal** with a "you won't see this again" warning + copy-to-clipboard; afterward the list only ever shows `signingSecretPrefix`.
- **D-15:** **`ConfirmDialog`** gates **delete** and **rotate-secret** (both effectively irreversible); the enable/disable toggle is reversible → no confirm. Event types entered via a **glob tag/chip input + suggested-pattern autocomplete** (the contract exposes no event-type enum; allow any string, 1–100 chars, max 50). Endpoint health shown as a **derived status badge** (Disabled / Failing [`failureCount>0` or `lastFailure>lastSuccess`] / Healthy) + last-success/last-failure detail.

### Claude's Discretion
- `<FarsightProvider>` `baseUrl` prop wiring (same-origin vs `api.farsght.com`) and the exact QueryClient default options (staleTime, retry policy) — planner's call; the SDK defaults `baseUrl` to `''` (same-origin).
- File/dir layout within `packages/ui/src/` for the new `provider/`, `client/` (thin wrap), `hooks/`, `errors/`, and feature surfaces (`notifications/`, `webhooks/`) — follow Phase-1 per-module export + Phase-2 alias conventions; **every new public component/hook MUST be re-exported from `src/index.ts`** (barrel-export trap).
- Whether `@farsight/sdk` and `@farsight/contracts` are added as `peerDependencies` vs `dependencies` of `@farsight/ui` — decide during planning consistent with the Phase-1 peer-dep hygiene gate (they are workspace packages in the Farsight monorepo; in Helm they are referenced by spec/source path).
- Multi-org test strategy for success criterion 2 (verifying no cross-tenant bleed on switch) — planner/verifier sets the bar.
- Exact `severity → icon` mapping and `code → user-facing copy` table.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground" — goal + 4 success criteria (authoritative phase boundary). **Note R-01/R-02 reconciliations below before treating success criteria literally.**
- `.planning/REQUIREMENTS.md` § "Adapter Seam + Tenancy" (DATA-01..06) and § "Notifications + Webhooks Surface" (NOTIF-01/02).
- `.planning/PROJECT.md` — Constraints (framework-agnostic, SDK over `@farsight/contracts`, org/project tenancy, Clerk React client), Out-of-Scope (no library theme toggle, **no auto-toast on mutation error — surface typed errors + consumer onError**, no per-userId tenancy, app-shell/routing = consumer's), Key Decisions table.

### Farsight contracts + SDK source (external monorepo — the typed transport target; READ FIRST)
- `~/Projects/farsight-platform/packages/sdk/src/index.ts` — **the SDK to thin-wrap**: `createApiClient({ baseUrl, getToken, fetchImpl? })`, `ApiClient`, `ApiClientError {status, code, body}`, `ApiClientSchemaError {issues}`. Bearer-only auth; path-param + query-string handling; Zod response validation built in.
- `~/Projects/farsight-platform/packages/contracts/src/index.ts` — public surface: `apiRoutes`, `ApiRoutes`, `RouteSpec`, `walkRoutes`, branded IDs, pagination, error envelopes.
- `~/Projects/farsight-platform/packages/contracts/src/common/errors.ts` — **RFC-7807 `ApiErrorSchema {status, code, message, details?, requestId?}` + the `ErrorCode` namespace catalog** (`auth.*`/`rbac.*`/`validation.*`/`resource.*`/`quota.*`/`integration.*`/`internal.*`). Branch on `code`.
- `~/Projects/farsight-platform/packages/contracts/src/auth/clerk.ts` — `ClerkClaims` (org_id/org_role/org_slug in the JWT template), `AuthContext`. **Confirms tenancy flows via JWT claim, no org header.**
- `~/Projects/farsight-platform/packages/contracts/src/notifications/routes.ts` — `notificationsRoutes` (list/markRead/markAllRead), `InAppNotification` shape, 10s-polling + cursor (`before`) contract, `{notifications, unreadCount, hasMore}`.
- `~/Projects/farsight-platform/packages/contracts/src/me/routes.ts` — `meRoutes` (`get` → `lastActiveOrg`; `getNotificationPreferences`/`updateNotificationPreferences` → product/marketing `{emailEnabled}`, security always-on).
- `~/Projects/farsight-platform/packages/contracts/src/webhooks/routes.ts` — `webhooksRoutes` (list/create/update/delete/rotateSecret), org-slug+project-slug paths, **show-once `signingSecret`**, HTTPS-only, `failureCount`/`lastSuccessAt`/`lastFailureAt`.
- `~/Projects/farsight-platform/packages/contracts/src/orgs/routes.ts` + `.../projects/routes.ts` — `Org`/`Project` shapes, slug-addressed routes; project has `status` (draft/active/archived).
- `~/Projects/farsight-platform/packages/contracts/src/route-manifest.ts` and `.../api-routes.ts` — `RouteSpec` shape (`auth: 'required'|'none'`, method, path, params/query/body/response) + the canonical manifest (for the typed `ApiClient` keys).

### Project-level research (already done at roadmap creation — directly reusable)
- `.planning/research/ARCHITECTURE.md` — proposed `FarsightProvider` / `client/create-client.ts` / `errors.ts` design and the query-key/tenant model. **Adjust per D-05: thin-wrap the shipped `@farsight/sdk` rather than re-derive a client.**
- `.planning/research/PITFALLS.md` — RFC-7807 handling pitfalls, contracts-ahead-of-endpoints, cache-bleed; `.planning/research/FEATURES.md` — RFC-7807, optimistic update, end-to-end type-flow notes; `.planning/research/SUMMARY.md` § Phase 3 (the "verify SDK shape" flag — **now resolved**).

### Phase inheritance (LOCKED — read before building surfaces)
- `.planning/phases/02-headless-core-port/02-CONTEXT.md` — `<ErrorState>` API (`title?/description?/icon?/onRetry?/action?` — adapter maps the typed error INTO these props), `<EmptyState>`, layout skeletons, themed `<Toaster>` (next-themes optional peer), loading/error/empty + destructive→ConfirmDialog/transient→toast conventions.
- `.planning/phases/01-package-foundation-theming/01-PATTERNS.md` — alias-rewrite + per-module `'use client'` + named-export conventions; `tokens.ts` for severity/health colors.
- `packages/ui/src/index.ts` — the barrel; **all new public exports must be added here** (barrel-export trap, per project memory).

### Conventions
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/INTEGRATIONS.md` (Clerk/auth patterns being replaced — `@clerk/nextjs/server` → `@clerk/react`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase-2 primitives** (`packages/ui/src/components/page/`): `ErrorState`, `EmptyState`, `ConfirmDialog`, `Toaster`, layout skeletons — the exact surfaces the adapter wires to (loading/error/empty + destructive/transient conventions).
- **`tokens.ts`** (`packages/ui/src/lib/tokens.ts`): source for `severity` icon colors and webhook health-badge colors — no hardcoded hex.
- **`@farsight/sdk`** (`~/Projects/farsight-platform/packages/sdk`): the client to wrap — already does token attach, path/query building, Zod validation, typed errors.
- **`@clerk/react` peer** (already declared in `packages/ui/package.json` as optional peer) + **`@tanstack/react-query` peer** — provider/hooks build on these; no new peer additions expected beyond the Farsight workspace packages.

### Established Patterns
- Helm's data access (`lib/api.ts` `apiFetch`, direct Drizzle, `@clerk/nextjs/server`) is the **anti-pattern being replaced** — do not port it; the SDK + provider replace it wholesale.
- Per-component subpath exports + `'use client'` preservation (Phase 1); alias rewrite (`@/` → relative) for any mined code; named exports, no defaults.
- **There is NO notifications or webhooks UI in Helm to port** (grep confirms only file-upload/settings matches) — these surfaces are built **net-new** onto the contracts, using the Phase-2 design-system primitives.

### Integration Points
- New dirs under `packages/ui/src/`: `provider/` (`FarsightProvider`, `useTenant`), `client/` (thin SDK wrap), `hooks/` (queryOptions factories per resource), `errors/` (`FarsightError` + helpers), and feature surfaces `notifications/` + `webhooks/`.
- `packages/ui/src/index.ts` barrel — register every new public export.
- CI guards from Phase 1/2 (`check-imports.sh` no-`next/*`/no-`@clerk/nextjs/server`, a11y) continue to apply to all new code.

</code_context>

<specifics>
## Specific Ideas

- All four discussed areas resolved on the recommended options (see D-01..D-15).
- `useTenant()` shape previewed and accepted: `{ userId, orgId, orgSlug, role, projectSlug? }`.
- Notifications: **both** bell + full inbox (one shared hook); 10s polling **paused when tab hidden** + injectable; **flat newest-first** with token-driven severity icons; href via consumer `onNavigate`/slot.
- Webhooks: **copy-once secret modal**; ConfirmDialog on **delete + rotate**; **glob tag input** for eventTypes; **derived health badge**.
- Errors: **thin `FarsightError` wrapper + `isFarsightError`/`matchCode`** helpers; provider-level `onError` for cross-cutting `auth.*`/`rbac.*`, form-level `validation.*`.

</specifics>

<deferred>
## Deferred Ideas

- **Controlled presentational `<ProjectSwitcher>`** (takes `projects` + `value` + `onChange`) — not built now; `apps/web` owns project selection in Phase 3. Revisit when Phase-4 project-scoped surfaces (datasets/pipelines/agents) make a reusable picker worthwhile. (The picker would consume `GET /orgs/:slug/projects`.)
- **Webhook test/ping (send a sample event)** — NOT in the contract (no such endpoint); a new backend capability, out of scope. Note for a future Farsight-backend phase if desired.
- **Deleting/dismissing notifications** — NOT in the contract (only mark-read exists); out of scope.
- **SSE/real-time notifications** — backend explicitly defers SSE; Phase 3 uses the contract's 10s polling. Revisit if/when the backend ships SSE.
- **Spec-mocking for contract-only endpoints** — not needed in Phase 3 (notifications/webhooks are live); it's a Phase-4 concern for datasets/pipelines/agents.
- **`org_role` → typed RBAC enum** — `OrgRoleSchema` is intentionally an open string (Clerk custom roles); don't hard-enum it.

### Reconciliations the planner MUST carry (delta between REQUIREMENTS/success-criteria text and the verified contract)
- **R-01:** "attaches ... + org header on every request" → **no org header exists**; org flows via Clerk JWT claim + path slugs. Verify against the SDK before writing any header logic.
- **R-02:** DATA-04 "discriminated on the `type` URI" → the contract discriminates on the namespaced **`code`** string, not a `type` URI. Map error UX to `code`.
- **R-03:** Success criterion lists tenant context `{ orgId, orgSlug, role, userId, projectId }` → webhook paths require **`projectSlug`**; carry `projectSlug` (and treat `projectId` as optional/derived).

</deferred>

---

*Phase: 3-Adapter Seam, Tenancy & Notifications Proving Ground*
*Context gathered: 2026-05-29*
