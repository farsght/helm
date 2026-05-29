# Architecture Research

**Domain:** Portable React component library extracted from a Next.js App Router app, rebuilt backend-agnostic against a typed contracts SDK
**Researched:** 2026-05-29
**Confidence:** HIGH (grounded in direct inspection of the Helm source + current ecosystem docs)

## TL;DR for the Roadmap

The good news from auditing the actual code: **the design system is already framework-clean.** `components/ui/` has zero `next/` imports, the 3,273-line `hooks/use-data-grid.ts` has zero `next/` imports (it depends only on React, `@radix-ui/react-direction`, `@tanstack/react-virtual`, `sonner`, and local hooks), and the canvas node components depend only on `@xyflow/react` + `lucide-react` + local `ui/`. Helm is already on **Tailwind v4 with CSS-first `@theme` tokens** in `app/globals.css` — the exact pattern recommended for shareable design tokens.

The coupling that must be shed is concentrated and shallow, not pervasive:
1. **Data access** — 26 files call `apiFetch`/`fetch` directly inside `*-client.tsx` against `/api/*` Next routes. This is the largest single workstream. `lib/api.ts` is a trivial 12-line `fetch` wrapper, not a real client.
2. **Routing** — `next/navigation` appears in only **3 components** (`app-sidebar.tsx`, `sidebar.tsx`, `dataset-import-wizard.tsx`) plus 15 app pages (the pages don't travel). `next/headers` is used in **zero** components.
3. **URL state** — `nuqs` is already router-agnostic via its adapter-context pattern; the library imports `nuqs` core and the *consuming app* supplies `NuqsAdapter`. No change needed inside components.
4. **Theme provider** — `next-themes` in `components/providers.tsx` swaps for the framework-agnostic provider or a thin local one.
5. **Tenancy** — per-user (`userId`) → org/project (`{orgId, orgSlug, role, userId}`) lives entirely in the new data layer (queries/hooks), not in presentational components.

This means **build order is foundation-first, then vertical slices**, and the foundation is mostly *plumbing the data/auth/tenant seam* — not rewriting components.

## Standard Architecture

### System Overview — Layered package (`packages/ui`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CONSUMER: Farsight apps/web (Vite + React)              │
│   Supplies: ClerkProvider, QueryClientProvider, NuqsAdapter,               │
│             FarsightApiProvider(baseUrl), RouterAdapter, route definitions │
└───────────────────────────────┬────────────────────────────────────────────┘
                                 │ imports from @farsight/ui subpaths
        ┌────────────────────────┴───────────────────────────────────────────┐
        │                  packages/ui  (framework-agnostic React)            │
        │                                                                      │
        │  ┌────────────────── FEATURE SURFACES (4) ───────────────────────┐  │
        │  │  pipelines/    agents/    datasets/    notifications+webhooks/ │  │
        │  │  (xyflow canvas + run views, list/detail, inspectors, inbox)   │  │
        │  └──────┬───────────────┬───────────────┬───────────────┬────────┘  │
        │         │ uses          │ uses          │ uses          │ uses       │
        │         ▼               ▼               ▼               ▼            │
        │  ┌──────────────────── ADAPTER LAYER (data-bound) ───────────────┐  │
        │  │  hooks/  query-options factories + useQuery/useMutation        │  │
        │  │  client/ typed SDK over @farsight/contracts (transport)        │  │
        │  │  providers/ ApiClient + Auth + Tenant context (the SEAM)       │  │
        │  └──────┬─────────────────────────────────────────────┬─────────┘  │
        │         │ renders                            consumes  │            │
        │         ▼                                              ▼            │
        │  ┌──────────────── HEADLESS / PRESENTATIONAL CORE ──────────────┐   │
        │  │  ui/ (34 shadcn primitives)   page/ (PageHeader, EmptyState) │   │
        │  │  data-grid/ + use-data-grid.ts   data-table/   canvas-kit/   │   │
        │  │  PURE: props in → JSX out. No fetch, no auth, no Next, no DB. │   │
        │  └──────────────────────────────────────────────────────────────┘  │
        │  ┌──────────────────────── THEMING ─────────────────────────────┐   │
        │  │  styles/theme.css (@theme tokens)  + tailwind preset export   │   │
        │  └────────────────────────────────────────────────────────────────┘ │
        └──────────────────────────────────────────────────────────────────────┘
                                 │ targets contract specs
                                 ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │  @farsight/contracts (apiRoutes manifest, RouteSpec, RFC-7807 errors)  │
        │            → @farsight/api (Hono/D1, requireOrgMember tenant)           │
        └──────────────────────────────────────────────────────────────────────┘
```

The hard architectural rule: **dependencies point downward only.** Feature surfaces → adapter layer → headless core. The headless core never imports the adapter layer; the adapter layer never imports a feature surface. This is what lets the design-system layer ship and be validated independently of whether any Farsight contract is live yet.

### Component Responsibilities

| Layer | Responsibility | What lives here | Forbidden imports |
|-------|----------------|-----------------|-------------------|
| **Headless / Presentational Core** | Render UI from props; emit callbacks. Zero knowledge of data source, auth, or tenant. | `ui/` (34 primitives), `page/` (PageHeader/EmptyState/ConfirmDialog), `data-grid/` + `use-data-grid.ts`, `data-table/`, `canvas-kit/` (xyflow node/edge components, inspectors, palette, auto-layout) | `next/*`, `@clerk/*`, any `client/` or `hooks/` data module, `fetch` |
| **Adapter Layer** | Bridge presentational components to the backend. Owns transport, caching, tenancy injection, error normalization. | `client/` (typed SDK over contracts), `hooks/` (TanStack Query `queryOptions` factories + `useX` hooks), `providers/` (ApiClient + Auth + Tenant context), `errors/` (RFC-7807 → typed error) | a feature surface; presentational internals beyond props |
| **Feature Surfaces (×4)** | Compose presentational components + adapter hooks into a working screen for one domain. | `pipelines/`, `agents/`, `datasets/`, `notifications/` (each: list, detail, canvas/run views, forms) | another feature surface (cross-feature reuse goes through core or adapter) |
| **Theming** | Authoritative design tokens + Tailwind config. | `styles/theme.css` (CSS-first `@theme`), Tailwind preset/`@source` export, `cn()` util | everything (it's a leaf) |

## Recommended Project Structure

```
packages/ui/
├── package.json                # exports map (subpath per layer), peerDeps
├── tsup.config.ts              # build: preserve "use client", externalize peers
├── styles/
│   ├── theme.css               # @theme tokens (lifted from app/globals.css)
│   └── tailwind-preset.ts      # optional v3-style preset for non-v4 consumers
├── src/
│   ├── lib/
│   │   └── utils.ts            # cn() (clsx + tailwind-merge) — leaf, no deps
│   ├── ui/                     # HEADLESS CORE — 34 shadcn primitives (verbatim port)
│   ├── page/                   # PageHeader, EmptyState, ConfirmDialog (barrel)
│   ├── data-grid/              # DataGrid, cell-variants, context-menu
│   ├── data-table/             # lighter table primitives
│   ├── hooks/
│   │   ├── use-data-grid.ts    # 3273-line hook — moves verbatim (no Next deps)
│   │   ├── use-data-table.ts   # imports nuqs CORE only (adapter injected by app)
│   │   └── use-as-ref.ts, use-lazy-ref.ts, use-isomorphic-layout-effect.ts
│   ├── canvas-kit/             # SHARED xyflow scaffolding (Background, Controls,
│   │   │                       #   inspector shell, auto-layout via dagre, palette)
│   │   └── ...                 # node components are per-feature, NOT here
│   ├── client/                 # ADAPTER — transport
│   │   ├── create-client.ts    # typed fetch over @farsight/contracts apiRoutes
│   │   └── errors.ts           # ApiErrorEnvelope (RFC-7807) → typed FarsightError
│   ├── providers/              # ADAPTER — the SEAM
│   │   ├── api-provider.tsx    # ApiClientContext (baseUrl + getToken injection)
│   │   ├── tenant-provider.tsx # TenantContext { orgId, orgSlug, role, userId }
│   │   ├── router-provider.tsx # RouterContext { navigate, Link, useParams }
│   │   └── ui-provider.tsx     # composes Tooltip + theme + (re-exports above)
│   ├── hooks-data/             # ADAPTER — query/mutation factories per domain
│   │   ├── pipelines.ts        # pipelineKeys, pipelineQueries, usePipelines()…
│   │   ├── agents.ts
│   │   ├── datasets.ts
│   │   └── notifications.ts
│   └── features/               # FEATURE SURFACES
│       ├── pipelines/          # canvas (xyflow nodes) + run views + inspectors
│       ├── agents/             # definitions + agent canvas + run history
│       ├── datasets/           # list/detail + RAG search surface (UI only)
│       └── notifications/      # inbox + preferences + outbound-webhook mgmt
└── index.ts                    # NOT a single barrel — see exports map below
```

### Structure Rationale

- **`ui/`, `page/`, `data-grid/`, `hooks/`, `canvas-kit/` are the portable core and travel first, nearly verbatim.** The audit shows they have no Next coupling. The only edits are import-path rewrites (`@/components/ui` → relative or `@farsight/ui/ui`) and pulling the `cn()` util to a leaf module.
- **`client/` + `providers/` + `hooks-data/` are the adapter layer** — this is the *new* code. It is the entire decoupling story: every `apiFetch('/api/...')` call inside a `*-client.tsx` is replaced by a hook from `hooks-data/`.
- **`canvas-kit/` holds only the *shared* xyflow scaffolding** (ReactFlow wrapper, Background/Controls, the inspector panel shell, dagre auto-layout, palette chrome). The **node-type components live inside their feature surface** (`features/pipelines/nodes/`, `features/agents/nodes/`) because their config shapes and validation are domain-specific — mirroring Helm's existing rule that the two canvases must not be merged.
- **Subpath exports, not one barrel** — a monolithic `index.ts` defeats tree-shaking and forces the whole library (including xyflow) into bundles that only want a Button. Use an `exports` map: `@farsight/ui/ui`, `@farsight/ui/data-grid`, `@farsight/ui/pipelines`, `@farsight/ui/providers`, `@farsight/ui/styles/theme.css`.

## Architectural Patterns

### Pattern 1: The Provider Seam — inject Auth + Tenant + API client as context

**What:** A single composed `UiProvider` (or three nested providers) that the consuming `apps/web` mounts once. It carries everything the adapter layer needs and that the presentational layer must never touch directly.

**When to use:** Always — this is the load-bearing decoupling primitive. Every data hook reads the API client and tenant from context; no component constructs a base URL, reads a token, or hard-codes an org id.

**Trade-offs:** One extra mount step for the consumer (acceptable — they already mount `ClerkProvider` and `QueryClientProvider`). Keeps the library zero-config on transport: the app owns `baseUrl`, token retrieval, and the active org.

**Example:**
```typescript
// providers/api-provider.tsx  (ADAPTER LAYER)
// The app passes Clerk's getToken + the active org; the library never imports Clerk.
type ApiContext = {
  client: FarsightClient;          // typed SDK bound to @farsight/contracts
  tenant: { orgId: string; orgSlug: string; role: string; userId: string };
};
const ApiCtx = React.createContext<ApiContext | null>(null);

export function FarsightApiProvider({
  baseUrl, getToken, tenant, children,
}: {
  baseUrl: string;
  getToken: () => Promise<string | null>;   // ← Clerk's useAuth().getToken, injected
  tenant: ApiContext['tenant'];              // ← derived from useOrganization() in the app
  children: React.ReactNode;
}) {
  const client = React.useMemo(
    () => createClient({ baseUrl, getToken, orgId: tenant.orgId }),
    [baseUrl, getToken, tenant.orgId],
  );
  return <ApiCtx.Provider value={{ client, tenant }}>{children}</ApiCtx.Provider>;
}
export const useApi = () => {
  const ctx = React.useContext(ApiCtx);
  if (!ctx) throw new Error('useApi must be used within <FarsightApiProvider>');
  return ctx;
};
```
```tsx
// apps/web root (CONSUMER — not in the library)
import { ClerkProvider, useAuth, useOrganization } from '@clerk/react';
import { FarsightApiProvider } from '@farsight/ui/providers';

function Shell({ children }) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { userId, orgRole } = useAuth();
  return (
    <FarsightApiProvider
      baseUrl={import.meta.env.VITE_API_URL}
      getToken={getToken}
      tenant={{ orgId: organization!.id, orgSlug: organization!.slug!, role: orgRole!, userId: userId! }}
    >
      {children}
    </FarsightApiProvider>
  );
}
```
This is the single point where Clerk and tenancy enter the system. Swapping `@clerk/nextjs/server` `auth()` for `@clerk/react`'s `useAuth()`/`useOrganization()` happens *only in the consumer*; the library stays auth-agnostic and merely consumes a `getToken` thunk + a tenant object.

### Pattern 2: Typed SDK client over `@farsight/contracts` (transport, not React)

**What:** A small typed `createClient` that resolves a route from the `apiRoutes` manifest, attaches the bearer token + active-org header, parses RFC-7807 `ApiErrorEnvelope` into a typed `FarsightError`, and returns typed data. It is plain TS — no React, no TanStack — so it is unit-testable in isolation and reusable outside hooks.

**When to use:** As the sole transport for every data-bound component. Replaces `lib/api.ts` `apiFetch` entirely.

**Trade-offs:** If Farsight already ships a "future fluent SDK", thin-wrap it instead of re-deriving — don't fork the contract layer. If contracts expose an OpenAPI document, `openapi-fetch` + `openapi-typescript` is the lowest-footprint path; if contracts are a hand-rolled `RouteSpec` manifest, write a ~80-line typed client that indexes the manifest. **Verify which Farsight ships before building** (flagged in PITFALLS).

**Example:**
```typescript
// client/create-client.ts  (ADAPTER LAYER — pure TS, no React)
export function createClient(cfg: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  orgId: string;
}) {
  async function request<S extends RouteSpec>(spec: S, input: InferInput<S>): Promise<InferOutput<S>> {
    const token = await cfg.getToken();
    const res = await fetch(`${cfg.baseUrl}${buildPath(spec, input)}`, {
      method: spec.method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Org-Id': cfg.orgId,                // org/project tenancy on every call
        'Content-Type': 'application/json',
      },
      body: spec.method === 'GET' ? undefined : JSON.stringify(input.body),
    });
    if (!res.ok) throw await FarsightError.fromEnvelope(res); // RFC-7807 → typed
    return res.json();
  }
  return { request /* + per-domain convenience methods if desired */ };
}
```

### Pattern 3: TanStack Query `queryOptions` factory per domain (the data-fetching layer)

**What:** For each feature, a key factory + `queryOptions`/`mutationOptions` factories that close over the injected client, then thin `useX` hooks. This is the officially recommended TanStack pattern and is the bridge between the typed client and components.

**When to use:** Every read and write. Helm currently fetches via raw `useEffect` + `fetch` with no caching; this is a strict upgrade (caching, dedup, invalidation, loading/error states — which the UI-REVIEW flagged as missing).

**Trade-offs:** Adds `@tanstack/react-query` as a peer dependency (the app owns the `QueryClient`). Worth it: it eliminates dozens of hand-rolled `useEffect` fetch blocks and gives uniform loading/error handling the feature surfaces can rely on.

**Example:**
```typescript
// hooks-data/pipelines.ts  (ADAPTER LAYER)
export const pipelineKeys = {
  all: (orgId: string) => ['pipelines', orgId] as const,
  list: (orgId: string) => [...pipelineKeys.all(orgId), 'list'] as const,
  detail: (orgId: string, id: string) => [...pipelineKeys.all(orgId), id] as const,
};

export function usePipelines() {
  const { client, tenant } = useApi();
  return useQuery({
    queryKey: pipelineKeys.list(tenant.orgId),     // ← orgId in the key = tenant isolation
    queryFn: () => client.request(apiRoutes.pipelines.list, { query: { orgId: tenant.orgId } }),
  });
}

export function useRunPipeline() {
  const { client, tenant } = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.request(apiRoutes.pipelines.run, { params: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.all(tenant.orgId) }),
  });
}
```
**Tenancy lands in the query key.** Because `orgId` is part of every key, switching active orgs in the app naturally produces fresh, isolated caches — the org/project remodel is enforced structurally, not by discipline.

### Pattern 4: Routing abstraction via a thin RouterContext (NOT a router dependency)

**What:** A `RouterContext` exposing `{ navigate(to), Link, useParams() }`. The 3 components using `next/navigation` (`app-sidebar`, `sidebar`, `dataset-import-wizard`) read from it instead. The consuming app maps its router (React Router / TanStack Router) into the context once.

**When to use:** For the handful of components that navigate. Most components take navigation as a prop (`onSelect`, `href`) — prefer props for leaf components; use context only for deep chrome like the sidebar.

**Trade-offs:** Props are simplest and most explicit but thread awkwardly through deep trees; context is cleaner for app chrome but is implicit. Given only 3 components need it, a single small `RouterContext` is right-sized. **Do not** adopt a heavyweight router-agnostic library — it's overkill for 3 call sites. For URL *state* (filters, sort, pagination), keep `nuqs` exactly as-is: the library imports `nuqs` core, the app supplies `NuqsAdapter` for its router — already the pattern Helm uses via `nuqs/adapters/next/app`.

**Example:**
```tsx
// providers/router-provider.tsx  (ADAPTER LAYER)
type RouterCtx = { navigate: (to: string) => void; Link: React.ComponentType<{ href: string }>; };
const Ctx = React.createContext<RouterCtx | null>(null);
export const useRouter = () => {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('useRouter requires <RouterProvider>');
  return c;
};
// app maps React Router's useNavigate + <Link> into this once.
```

### Pattern 5: DataGrid survives extraction unchanged; canvases split shared-shell from per-feature nodes

**DataGrid (`use-data-grid.ts`, 3,273 lines):** Confirmed portable as-is. Its only imports are React, `@radix-ui/react-direction`, `@tanstack/react-virtual`, `sonner`, and three local micro-hooks. **Action: move verbatim into `hooks/`, port the three helper hooks alongside it, rewrite `@/` import paths.** Do not refactor it during extraction — it is stable, tested behavior; a rewrite is unrelated scope and pure risk. The `DataGridContextMenu`-derives-from-`tableMeta` convention and the effect-based cell-variant syncing (React-Compiler-safe) are preserved. It is data-source-agnostic by design (consumes rows via props), so binding to Farsight data happens *above* it in a feature surface, not inside it.

**xyflow canvases:** Helm has 3 canvas surfaces; only the **pipeline** and **agent** canvases travel (campaign canvas is out of scope). Each `import '@xyflow/react/dist/style.css'` at the component top — that import must move into the canvas-kit entry and be documented as a required side-effect import for consumers. Split as:
- `canvas-kit/` — the shared, domain-neutral scaffolding (ReactFlow wrapper, Background, Controls, MiniMap, the inspector panel *shell*, dagre `auto-layout`, palette chrome, `flow-node`/`resource-node` base shells from `components/canvas/`).
- `features/pipelines/nodes/` and `features/agents/nodes/` — the concrete node-type components and their inspector forms, because node config shapes + validation are domain-specific. **Carry forward Helm's runtime config validators** (Zod or hand-rolled) — the DB `config_json`/`trigger_config` columns are untyped `text`/`jsonb`, so the contract types give compile-time shape but runtime validation must still live in the inspector + node renderer.

## Data Flow

### Request flow (read)

```
Feature component (features/pipelines/PipelineList)
    │  calls usePipelines()
    ▼
Adapter hook (hooks-data/pipelines.ts)  ── reads { client, tenant } from useApi()
    │  queryKey = ['pipelines', orgId, 'list']      ← tenant isolation in the key
    ▼
Typed client (client/create-client.ts)
    │  attaches Bearer token (getToken) + X-Org-Id header
    ▼
@farsight/contracts apiRoutes.pipelines.list  → @farsight/api (Hono/D1)
    │  requireOrgMember → c.get('tenant') = { orgId, orgSlug, role, userId }
    ▼
Response  ──ok──► typed data ──► TanStack cache ──► component renders
          ──err─► RFC-7807 ApiErrorEnvelope ──► FarsightError ──► hook `error`
```

### State management

```
QueryClient (owned by apps/web)           ← server-state cache, keyed by orgId
    ▲                                         (org switch = new cache namespace)
    │ subscribe (useQuery / useMutation)
Feature surfaces ──► hooks-data ──► client ──► contracts
    │
    └─ local UI state: component useState + nuqs (URL state) — app supplies NuqsAdapter
       canvas state: xyflow's internal store (nodes/edges), persisted via mutations
```

### The auth / tenant injection seam (single diagram)

```
apps/web root
  └─ <ClerkProvider>                       (@clerk/react — app dep, NOT library)
       └─ <QueryClientProvider>            (app owns the QueryClient)
            └─ <NuqsAdapter>               (app's router adapter for URL state)
                 └─ <RouterProvider>       (app maps its router → RouterContext)
                      └─ <FarsightApiProvider                ◄── THE SEAM
                            baseUrl   = env
                            getToken  = useAuth().getToken    ◄── auth injected here
                            tenant    = useOrganization()     ◄── org/project injected here
                         >
                            └─ <UiProvider> (Tooltip + theme)
                                 └─ {library feature surfaces}
```
Everything above `FarsightApiProvider` is the consumer's responsibility and contains the only Clerk/Next references. Everything below is the portable library. **The per-user → org/project remodel is implemented entirely at this seam plus the query keys** — presentational components never see a tenant id.

## Build Order (foundation-first, then vertical slices)

The dependency graph dictates order: you cannot bind a feature surface to data until the adapter seam exists, and you cannot prove the seam until the headless core renders. But the headless core has *no* dependency on the seam, so it can move first and in parallel with seam design.

| Phase | What | Why this order | Unblocks |
|-------|------|----------------|----------|
| **0. Package scaffold + theming** | pnpm `packages/ui`, `exports` map, `tsup` with `"use client"` preservation + externalized peers, lift `app/globals.css` `@theme` → `styles/theme.css`, port `cn()` | Nothing else can be imported until the package builds and tokens exist. Tailwind v4 CSS-first tokens already match the recommended pattern — low effort. | everything |
| **1. Headless core** | Port `ui/` (34 primitives), `page/`, `data-grid/` + `use-data-grid.ts`, `data-table/`, micro-hooks. Rewrite `@/` paths. No data, no auth. | Confirmed Next-free; the cheapest, lowest-risk move; gives `apps/web` a usable design system immediately even if no contract is live. | every feature surface |
| **2. Adapter seam** | `client/create-client.ts` (over contracts), `errors/` (RFC-7807), `providers/` (Api+Tenant+Router), wire TanStack Query. Build against **notifications/webhooks** contracts (already live). | The seam must exist before any data-bound feature. Validate it against the one domain whose backend is live to de-risk the contract binding before Phase-1 contracts arrive. | all data-bound surfaces |
| **3. Notifications + webhooks surface** | Inbox, preferences, outbound-webhook mgmt. Mostly new UI, not a port. | Live backend = the seam gets a real end-to-end test. Smallest feature, proves the full stack. | confidence for ports |
| **4. Datasets surface** | List/detail + RAG search UI (UI only; ingestion excluded). | Simplest of the three ports — mostly DataGrid + forms, minimal canvas. Exercises org-scoped lists. | — |
| **5. Pipelines surface** | xyflow canvas + run views, on `pipelines`/`pipeline_runs` contracts. | Heaviest canvas; depends on `canvas-kit` shell (built here) + the seam. Do after a simpler surface validates the data layer. | agents (shares canvas-kit) |
| **6. Agents surface** | Definitions + agent canvas + run history, on `agents` contracts. | Reuses `canvas-kit` proven by pipelines; run-history reuses DataGrid. Last because it composes everything prior. | — |
| **7. Port path** | Verify workspace-consumable in Farsight monorepo (`apps/web` installs via `workspace:*`), `@source` paths for Tailwind v4 utility discovery, side-effect CSS imports documented. | Final integration once surfaces exist. | done |

**Foundation-first, not vertical-slice-first**, because: (a) the headless core is shared by all four surfaces and is the lowest-risk move, so front-loading it removes the most uncertainty cheapest; (b) the adapter seam is a hard prerequisite for every data-bound surface, so it must precede them; (c) Phases 1–3 of the *Farsight backend* (datasets/pipelines/agents contracts) may not be live, while notifications/webhooks is — so the seam should be validated against the live domain first, regardless of which UI surface is "most important." Within the surfaces (Phases 3–6), it is then effectively vertical slices, ordered easiest-and-live first.

## Scaling Considerations

This is a library, so "scale" = number of consuming surfaces and bundle impact, not user count.

| Scale | Architecture adjustments |
|-------|--------------------------|
| 1 consumer (`apps/web`), 4 surfaces | Current plan. Subpath exports + tree-shaking keep a Button import from pulling in xyflow. |
| +more Farsight apps consume `packages/ui` | The provider seam already supports it — each app supplies its own client/tenant. No change. |
| Library published externally (not just workspace) | Switch from source-aliasing to a prebuilt **ESM** `dist` (avoids Vite CJS prebundling export-detection bugs); pin peer-dep ranges; ship a v3 Tailwind preset alongside the v4 `@theme` CSS for non-v4 consumers. |

### Scaling priorities

1. **First bottleneck — bundle size from the monolith barrel.** Mitigate from day one with subpath `exports`; never re-export xyflow/recharts through the root entry.
2. **Second bottleneck — `use-data-grid.ts` (3.2k lines) in every grid-using chunk.** It's already isolated to `hooks/data-grid` subpath; consumers that don't use the grid never pay for it.

## Anti-Patterns

### Anti-Pattern 1: A single root `index.ts` barrel

**What people do:** Re-export everything (`ui/`, `data-grid/`, `features/pipelines/` with xyflow) from one `index.ts`.
**Why it's wrong:** Defeats tree-shaking; importing a `Button` drags `@xyflow/react`, `recharts`, and the 3.2k-line grid hook into the consumer bundle. Also forces a global `"use client"` banner, breaking RSC granularity if `apps/web` ever adopts RSC.
**Do this instead:** A subpath `exports` map. Use a directive-preserving build (`rollup-preserve-directives`/tsup banner-per-chunk) so `"use client"` lands at the top of only client chunks — not slapped globally.

### Anti-Pattern 2: Letting auth, tenant, or `baseUrl` leak into presentational components

**What people do:** A primitive or feature component calls `useAuth()`, reads `orgId`, or constructs `/api/...` URLs directly (Helm does the last one in 26 files today).
**Why it's wrong:** Re-couples the library to Clerk + a transport + tenancy, defeating the entire extraction. Makes components untestable without a full auth/network stack.
**Do this instead:** All of it flows through the adapter seam. Presentational components receive *data and callbacks via props*; data-bound feature components call `hooks-data/*`, which read the client+tenant from `useApi()`. The ESLint rule to enforce: `ui/`, `page/`, `data-grid/`, `canvas-kit/` may not import from `client/`, `providers/`, `hooks-data/`, `@clerk/*`, or `next/*`.

### Anti-Pattern 3: Merging the two canvases or hoisting node types into shared kit

**What people do:** Generalize pipeline + agent nodes into one node system in `canvas-kit/`.
**Why it's wrong:** Helm's existing constraint — the canvases have different node shapes, validation, and execution semantics. A shared abstraction over divergent domains leaks and rots. The DB configs are untyped, so the only real contract is the per-domain runtime validator.
**Do this instead:** `canvas-kit/` holds only domain-neutral scaffolding (ReactFlow wrapper, Background/Controls, inspector shell, dagre layout, palette chrome). Concrete node components + their Zod/hand-rolled config validators live inside each feature surface.

### Anti-Pattern 4: Rewriting `use-data-grid.ts` "while we're in there"

**What people do:** Treat extraction as license to refactor the 3.2k-line hook.
**Why it's wrong:** It has zero Next coupling and is stable tested behavior. A rewrite is unrelated scope, high risk, and adds nothing to portability.
**Do this instead:** Move it verbatim; rewrite only `@/` import paths. Refactor later as its own initiative if ever justified.

### Anti-Pattern 5: Hand-rebuilding a contracts client when Farsight ships one

**What people do:** Re-derive a full typed client from the `apiRoutes` manifest from scratch.
**Why it's wrong:** Duplicates the "future fluent SDK" Farsight mentions; drifts from the FAR-71 conformance guarantee; doubles the surface that must track contract changes.
**Do this instead:** Verify what `@farsight/contracts` exports first. If a fluent SDK exists, thin-wrap it for token+org injection. If only the `RouteSpec` manifest exists, write a minimal typed `request()` over it. If an OpenAPI doc exists, use `openapi-fetch` + `openapi-react-query`.

## Integration Points

### External services / consumer-supplied dependencies

| Dependency | Integration pattern | Notes |
|------------|--------------------|-------|
| `@clerk/react` | Consumer-only; library receives `getToken` thunk + tenant object via `FarsightApiProvider` | Library never imports Clerk. Replaces `@clerk/nextjs/server` `auth()`. |
| `@tanstack/react-query` | **Peer dependency**; consumer owns the `QueryClient` | Library ships `queryOptions`/hooks; app provides the provider. |
| `@farsight/contracts` | **Direct dependency** (workspace) — the typed transport target | Honor RFC-7807 `ApiErrorEnvelope`. Verify SDK shape before building `client/`. |
| `nuqs` | Library imports **core only**; consumer supplies `NuqsAdapter` for its router | Already the pattern in Helm. Zero change to component code. |
| consumer's router | Mapped into `RouterContext` by the app | React Router / TanStack Router both fine; only 3 components consume it. |
| `@xyflow/react` | **Peer/direct dependency**; `dist/style.css` is a required side-effect import | Document the CSS import for consumers; isolate to canvas subpaths. |
| Tailwind v4 | Token CSS exported via `exports`; consumer adds `@source` for utility discovery | Helm is already v4 CSS-first `@theme` — token export is near-free. |

### Internal boundaries (the load-bearing rule)

| Boundary | Allowed direction | Enforcement |
|----------|------------------|-------------|
| Headless core ↔ adapter layer | core may **not** import adapter | ESLint `no-restricted-imports` on `ui/`,`page/`,`data-grid/`,`canvas-kit/` |
| Adapter layer ↔ feature surfaces | adapter may **not** import a feature | layering lint rule |
| Feature surface ↔ feature surface | **never** — share via core or adapter | layering lint rule |
| Anything ↔ `next/*` / `@clerk/*` | only the (excluded) app shell may | ESLint ban inside `packages/ui/src/**` |

## Sources

- [Type-safe TanStack Query with OpenAPI — Ruan Martinelli](https://ruanmartinelli.com/blog/tanstack-query-openapi/) — adapter pattern over a typed client (MEDIUM)
- [openapi-react-query — OpenAPI TypeScript](https://openapi-ts.dev/openapi-react-query/) — 1kb TanStack wrapper over openapi-fetch (HIGH, official)
- [Query Options — TanStack Query Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-options) — `queryOptions` factory + key-factory pattern (HIGH, official)
- [Clerk React SDK overview](https://clerk.com/docs/reference/react/overview) and [useAuth()](https://clerk.com/docs/react/reference/hooks/use-auth), [Organizations getting started](https://clerk.com/docs/react/guides/organizations/getting-started) — framework-agnostic `@clerk/react`, `getToken`, `useOrganization` (HIGH, official)
- [Adapters — nuqs](https://nuqs.dev/docs/adapters) and [Creating Custom Adapters — nuqs/DeepWiki](https://deepwiki.com/47ng/nuqs/3.4-creating-custom-adapters) — router-agnostic via context; library imports core, app supplies adapter (HIGH)
- [How to support React Server Components in your library — Bekk](https://www.bekk.christmas/post/2023/19/keep-up-with-react-server-components-how-to-support-it-in-your-library) and ['use client' directive — React](https://react.dev/reference/rsc/use-client) — preserving directives, split client/server chunks (HIGH)
- [tsup vs Vite/Rollup: When Simple Beats Complex](https://dropanote.de/en/blog/20250914-tsup-vs-vite-rollup-when-simple-beats-complex/) and [Streamlining Component Library Publishing with Vite and tsup — Leapcell](https://leapcell.io/blog/streamlining-component-library-publishing-with-vite-and-tsup) — build-tool tradeoffs, externalize peers (MEDIUM)
- [Setting up Tailwind CSS v4 in a Turbo Monorepo — Trentmann](https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039) and [Sharing Tailwind Styles — Nx](https://nx.dev/blog/sharing-tailwind-styles-nx-monorepo) — v4 `@theme` token package + `@source` discovery (MEDIUM)
- Direct inspection of the Helm source (HIGH): `components/ui/` (0 `next/` imports), `hooks/use-data-grid.ts` (3273 lines, 0 `next/` imports), `lib/api.ts` (12-line fetch wrapper), `next/navigation` in 3 components only, `next/headers` in 0 components, Tailwind v4 `@theme` in `app/globals.css`, `nuqs` already adapter-based in `components/providers.tsx`.

---
*Architecture research for: portable React component library extraction (Helm → Farsight packages/ui)*
*Researched: 2026-05-29*
