# Phase 4: Contract-Gated Surfaces & Monorepo Port — Research

**Researched:** 2026-05-29
**Domain:** Contract binding (datasets/workflows/agents), xyflow canvas extraction, Vite consumer integration, monorepo port verification
**Confidence:** HIGH — grounded in direct source inspection of Farsight contracts, SDK, live Helm source files, and the existing packages/ui seam

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Slice-and-prove per surface (MVP). Each surface ports a representative vertical exercising its contract end-to-end — datasets = list + detail + RAG search; pipelines = canvas renders/runs a workflow from the contract with a core node subset + run view; agents = definitions list + canvas + run history.
- **D-02:** Datasets leads (first vertical / walking slice).
- **D-03:** "Done" gate = automated mocked-contract tests + manual real round-trip. Automated CI uses mocked `fetchImpl` against the contract Zod schemas. Real-endpoint round-trip is manual UAT.
- **D-04:** Standalone in-Helm `examples/` Vite app (e.g. `examples/farsight-ui-consumer`) as a SEPARATE workspace package consuming `@farsight/ui` via `workspace:*`.
- **D-05:** Vite app consumes the **built dist** (tsdown). Must prove: (1) importing one primitive does NOT pull in xyflow/Recharts; (2) `theme.css` + `@source` tokens apply; (3) canvas mounts and edges render with correct CSS import order.
- **D-06:** PORT-02 ships a **consumer-setup README + Farsight copy runbook** — no physical copy into Farsight this phase.
- **D-07:** **publint + `@arethetypeswrong/cli`** re-run on built dist as part of Phase 4.
- **D-08:** Pipeline canvas binds **Farsight `workflows` + `pipeline-definition`/node contracts**: CRUD + `run` + run view. Core source→transform→sink editable node subset.
- **D-09:** xyflow **CSS import-order contract locked** by: documented order, jsdom vitest render-smoke (nodes+edges in DOM), real-browser visual in Vite app.
- **D-10 (amended per R-04):** **Canvas-kit is pipelines-only.** Extract the xyflow wiring into a reusable canvas-kit for the pipelines surface; agents is a **chat** surface (message list + composer), NOT a node canvas, and does not consume the xyflow canvas-kit.

### Claude's Discretion

- Exact dir layout for new surfaces under `packages/ui/src/`
- Whether the pipelines surface is named `pipelines` or `workflows` in the public API
- Workspace-link mechanism for `examples/` Vite app
- Concrete node-type subset for the pipeline slice
- Agent canvas vs run-history split + datasets RAG-search result UX

### Deferred Ideas (OUT OF SCOPE)

- Full node-type parity (15 Helm pipeline node types)
- Physical copy into Farsight monorepo + `apps/web` wiring
- Live-endpoint automated integration (real Clerk session + `api.farsght.com`)
- Playwright visual-regression harness
- Shareable Tailwind preset
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSET-01 | Datasets list/detail + RAG search UI bound to Farsight `datasets` contracts (UI only — no ingestion/chunking/pgvector backend) | Contracts fully verified; shape documented below; Helm source analyzed; decoupling work scoped |
| PIPE-01 | Pipelines `@xyflow/react` canvas + run views bound to `pipelines`/`pipeline_runs` contracts; locks the xyflow CSS import-order contract with a visual smoke test | Workflows contract verified (CRUD + run); PipelineDefinition schema documented; canvas-kit extraction scoped; CSS-order pitfall documented |
| AGNT-01 | Agents definitions + canvas + run-history UI bound to Farsight `agents` contracts | Agents contract verified (chat: submit/messages); Helm agent-canvas source analyzed; canvas-kit reuse path documented |
| PORT-01 | Verified `workspace:*` consumption from a minimal external Vite consumer — utility classes, tokens, canvases render | examples/ Vite app pattern documented; workspace linking mechanism verified; tree-shaking test strategy documented |
| PORT-02 | Consumer-setup README + required peer versions, `@source` config, xyflow CSS import order, `<FarsightProvider>` mount, and copy runbook | All pieces catalogued; README structure documented; publint/attw invocation verified from Phase 1 |
</phase_requirements>

---

## Summary

Phase 4 is the final delivery phase: bind three Helm UI surfaces (datasets, pipelines/workflows, agents) to the live Farsight contracts using the Phase-3 seam, then prove the built `@farsight/ui` artifact is consumable from a standalone Vite app outside Next.js.

**The most important planning insight from this research:** The three surfaces have fundamentally different contract shapes and decoupling work required. The DATASETS surface is the simplest: list/detail reuses DataGrid + Phase-3 query-options patterns; RAG search is a novel POST endpoint with a discriminated-union result. The WORKFLOWS (pipeline) surface requires the most architectural work: extract shared canvas-kit from Helm's xyflow setup, bind the `PipelineDefinition` DAG to the canvas state model, wire CRUD + `run`. The AGENTS surface contract is a surprise — Farsight's agent contract is a **chat interface** (`submit` + poll `messages`), NOT agent definitions/runs. This means the Farsight agent surface is fundamentally different from Helm's agent management UI. The planner must decide whether to port a Farsight-model chat surface or build a thin definitions-list shim.

**Primary recommendation:** Execute in strict D-02 order — datasets first (no xyflow, proves the query-options pattern), workflows second (canvas-kit extraction + PipelineDefinition binding), agents third (reuse canvas-kit + clarify the contract mismatch). PORT-01 Vite app scaffolded early (Wave 0) to catch CSS/tree-shaking issues during development rather than at the end.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Datasets list/detail/RAG search | `packages/ui` adapter hooks + feature components | — | Consumes `datasetsRoutes` via `useApiClient()`; DataTable renders data |
| Workflow (pipeline) CRUD + run | `packages/ui` adapter hooks + feature components | — | Consumes `workflowsRoutes` via `useApiClient()`; `PipelineDefinition` is the canvas state |
| Agent chat submit/poll | `packages/ui` adapter hooks + feature components | — | Consumes `agentsRoutes` (`submit`/`messages`) via `useApiClient()` |
| xyflow canvas scaffolding | `packages/ui/src/components/canvas-kit/` | — | Shared wiring (ReactFlow, Background, Controls); domain-specific nodes in each surface |
| Pipeline node types (source/transform/sink) | `packages/ui/src/components/pipelines/nodes/` | canvas-kit shell | Domain-specific node components + Zod validation of `parameters` |
| Agent chat UI | `packages/ui/src/components/agents/` | canvas-kit shell | Chat message list + submit form, polling hook; agent "canvas" is a visualization not a DAG editor |
| Routing/navigation (onNavigate, href) | Consumer (`apps/web` / Vite examples/) | — | Library emits `onNavigate` callbacks; never owns routing |
| Vite consumer proof (PORT-01) | `examples/farsight-ui-consumer/` | — | External workspace package; exercises dist artifact |
| Port documentation (PORT-02) | `packages/ui/README.md` (or `CONSUMER.md`) | — | Consumer-setup + copy runbook; no code changes |

---

## Verified Contract Shapes

### Datasets Contract [VERIFIED: direct source inspection]

**Base path:** `/orgs/:slug/projects/:projectSlug/datasets`
**Tenancy:** `{ slug: OrgSlugSchema, projectSlug: ProjectSlugSchema }` — both required in params.
**SDK calls:** `client.datasets.list`, `.create`, `.get`, `.update`, `.delete`, `.records`, `.search`

**Core `Dataset` response shape (key fields for the UI):**
```typescript
// ~/Projects/farsight-platform/packages/contracts/src/datasets/schemas.ts
{
  id: DatasetId,
  projectId: ProjectId,
  name: string,            // 1–200 chars
  description?: string,    // max 2000
  kind: 'raw' | 'derived' | 'eval',
  searchBackend: 'none' | 'vectorize' | 'ai_search',   // default 'none'
  recordCount: number,     // cache; eventually consistent
  vectorizeStatus: 'none' | 'provisioning' | 'ready' | 'error' | 'deleted',
  aiSearchStatus: 'none' | 'provisioning' | 'ready' | 'error' | 'deleted',
  createdAt: string,       // ISO datetime
  updatedAt: string,
  deletedAt?: string,      // soft-delete
}
```

**List query:** `PaginationQuerySchema.extend({ kind?: DatasetKind, search?: string })`
**List response:** `{ items: Dataset[], nextCursor?: string, hasMore: boolean }` (paginated)

**RAG search — `POST .../datasets/:id/search`:**
```typescript
// Request body (DatasetSearchQuerySchema)
{ query: string (1–4000), topK?: number (1–100, default 10), filter?: Record<string, SearchFilterCondition> }

// Response (discriminated union by `backend`):
// backend = 'vectorize': { backend: 'vectorize', matches: Array<{ id, score, metadata? }>, indexingPending? }
// backend = 'none':      { backend: 'none', matches: Array<{ recordId, title?, snippet? }> }
// backend = 'ai_search': { backend: 'ai_search', matches: Array<{ key, score, text? }> }
```

**UI implication:** The search result renderer must branch on `result.backend` to display the right match shape. Most consumers will only see `'vectorize'` or `'none'` in practice. The `indexingPending` flag on vectorize results should show a "results may be incomplete" notice.

**Dataset records (GET .../datasets/:id/records):** Paginated `NormalizedRecord` with `{ id, datasetId, createdAt }` envelope. The full NormalizedRecord is the snake_case wire format every pipeline source emits — the UI shows it as raw data rows.

### Workflows (Pipelines) Contract [VERIFIED: direct source inspection]

**Base path:** `/orgs/:slug/projects/:projectSlug/workflows`
**Tenancy:** `{ slug, projectSlug }` — same pattern as datasets.
**SDK calls:** `client.workflows.create`, `.list`, `.get`, `.update`, `.remove`, `.run`

**`Workflow` list item (without definition):**
```typescript
{
  id: WorkflowId,
  projectId: string,
  slug: WorkflowSlug,     // URL-addressable, derived from name, immutable after create
  name: string,           // 1–200 chars
  activeVersion: number | null,   // 1-based; null if no version yet
  active: boolean,        // enabled flag
  createdAt: string,
  updatedAt: string,
}
```

**`WorkflowWithDefinition`** (single GET response) adds:
```typescript
{ definition: PipelineDefinition }
```

**`PipelineDefinition` (the canvas state model):**
```typescript
{
  schemaVersion: 1,
  name: string,           // pipeline display name
  description?: string,
  trigger: PipelineTrigger,   // { kind: 'manual' } | { kind: 'schedule', cron, timezone } | { kind: 'webhook', nodeId }
  nodes: Array<{
    id: PipelineNodeId,   // per-pipeline id, lowercase kebab/snake
    type: NodeId,         // Farsight node registry canonical id (e.g. "core.source.http@1.0.0")
    name?: string,
    parameters: Record<string, unknown>,   // configurable values
    position?: { x: number, y: number },  // canvas position
    disabled: boolean,
  }>,
  edges: Array<{
    from: PipelineNodeId, fromPort: string,   // default 'main'
    to: PipelineNodeId,   toPort: string,     // default 'main'
  }>,
  staticData: Record<string, unknown>,
}
```

**`run` endpoint:** `POST .../workflows/:wfSlug/run` → `{ runId: string, status: 'accepted', workflowId, version }`. Returns 202 Accepted. The runId is a Cloudflare Workflows instance id to poll separately (no polling endpoint in this contract yet).

**Create/update bodies:**
- Create: `{ name, slug?, definition: PipelineDefinition }` → WorkflowWithDefinition
- Update (PATCH): `{ name?, definition?, active? }` — a new `definition` creates a new immutable version; returns WorkflowWithDefinition

**Critical planning note (D-08):** The `PipelineNode.type` is a `NodeId` (e.g. `"core.source.dataset@1.0.0"`) from the Farsight node registry, NOT the Helm string like `"source_dataset"`. The Phase-4 pipeline surface must use Farsight's NodeId taxonomy for the node subset it ships. The node registry is NOT in contracts — it lives in the Farsight API's node modules. For the Phase-4 MVP core subset, we must choose NodeIds from the live registry or define them in a constants file.

**Recommended core node subset for D-08 (source→transform→sink):**
Since the live Farsight node registry is not in contracts, the Phase-4 canvas should use well-known NodeId strings that correspond to the planned core nodes. The planner should pick 3–5 types (e.g. a manual trigger, an HTTP/dataset source, a filter/transform, a dataset sink) and use those as the `type` values in `PipelineNode`. Runtime validation of `parameters` must be Zod-based in the node inspector — the canvas stores `parameters: Record<string, unknown>`.

### Agents Contract [VERIFIED: direct source inspection — important architectural finding]

**CRITICAL FINDING: Farsight's `agents` contract is a CHAT interface, not agent definitions/management.**

```typescript
// ~/Projects/farsight-platform/packages/contracts/src/agents/routes.ts
agentsRoutes = {
  submit: POST /agents/:agentDefinitionId/messages   // submit user message
  messages: GET  /agents/:agentDefinitionId/messages // poll chat history
}
```

The `agentDefinitionId` is a string identifier (not a CRUD resource managed by this contract). There is **no** agent create/list/update/delete in the contracts package. Farsight's model treats agent definitions as static registry entries referenced by ID — users submit messages to a named agent, and poll for the response.

**Submit request:** `{ message: string (1–8000), chatId?: string }` → `{ result: { requestId, status: 'pending'|'running'|'completed'|..., error? }, chatId: string }`

**Messages response:** `{ chatId: string, messages: Array<{ id, role: 'user'|'assistant'|'system', parts: AgentMessagePart[], createdAt? }> }`

**Message parts:** Each message has `parts[]` — primarily `{ type: 'text', text: string }` for the frontend's main render path. Other part types (reasoning, tool-call, tool-result, etc.) pass through opaquely.

**UI implication for AGNT-01:** The Farsight `agents` surface is a **chat interface** (like a chat window scoped to a specific `agentDefinitionId`), not a management UI. Helm's `agents-client.tsx` (create/edit/delete agent definitions) does NOT map to this contract. The planner must choose one of:

1. **Option A — Farsight-native chat surface:** Build a chat UI that takes an `agentDefinitionId` prop, polls `messages`, and shows a submit form. This is what the contract supports. This is the recommended approach per D-01 ("bind to contracts").
2. **Option B — Keep as definitions-list (no contract binding):** Build a presentational-only agent card list. No contract calls for AGNT-01 at the list level — only the chat view uses the contract. This satisfies "definitions list + canvas + run history" per D-01 but redefines "canvas" as the chat view.

**Recommendation:** Build Option A. The "agent canvas" (D-01, D-10) in Phase 4 context is the **agent chat view** — a message thread per `agentDefinitionId`. The `canvas-kit` provides the layout shell; instead of xyflow nodes, this surface renders a message list. A `run history` becomes the message thread. The planner should document this reconciliation explicitly.

---

## Helm Port-Source Coupling Inventory

### Datasets Source (`app/datasets/datasets-client.tsx`)

**Next.js coupling to remove:**
- `useRouter` (from `next/navigation`) — used for `router.push('/datasets/${id}')` on row click → replace with `onNavigate` prop callback
- `confirm()` — used in delete handler → replace with `ConfirmDialog` (Phase-2 primitive)
- Direct `fetch('/api/datasets')` in `useEffect` → replace with `client.datasets.list` via `useApiClient()` + `queryOptions` factory
- Direct `apiFetch('/api/datasets/:id', { method: 'DELETE' })` → replace with `useDeleteDatasetMutation` hook

**What to keep:** DataTable/DataTableToolbar/DataTableColumnHeader layout — these are already in packages/ui and work as-is. Column definition pattern using `@tanstack/react-table` `ColumnDef`. The `useDataTable` hook is already ported.

**Farsight shape delta:** Helm's `DatasetRow` has `{ id: number, source: string, rowCount, columnSchemaJson, status, refreshedAt }`. Farsight's `Dataset` has `{ id: DatasetId (string), kind, searchBackend, recordCount, vectorizeStatus }`. The column definitions need to be rebuilt for the Farsight shape — not just alias-rewritten. Source → kind (raw/derived/eval), rowCount → recordCount, no columnSchemaJson.

**RAG search UI:** Helm has no search surface to port (the `DatasetImportWizard` is out of scope — ingestion is backend concern). The search surface is **net-new**: a search input + `useSearchDataset` mutation hook + result list that branches on `result.backend`.

### Pipeline Source (`app/pipelines/[id]/pipeline-detail-client.tsx`)

**Next.js coupling to remove:**
- `Link` from `next/link` — back-navigation button → replace with `onNavigate` callback or `onBack` prop
- Direct `apiFetch('/api/pipelines/:id')` → `client.workflows.get`
- Direct `apiFetch('/api/pipelines/:id/canvas', PUT)` → `client.workflows.update` with `definition`
- Direct `apiFetch('/api/pipelines/:id/run', POST)` → `client.workflows.run`
- `apiFetch('/api/datasets')` inside `PipelineNodeConfig` → the Farsight canvas references datasets by NodeId parameter; the Phase-4 MVP source node uses a dataset selector that calls `client.datasets.list`

**xyflow wiring (already clean of Next.js):**
```typescript
// From pipeline-detail-client.tsx (line 6-18):
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, ... } from '@xyflow/react';
import '@xyflow/react/dist/style.css';  // ← THIS IMPORT must stay; is the CSS-order concern
```

**State model delta — critical:** Helm stores `{ nodes: DbNode[], edges: DbEdge[] }` serialized per the Drizzle schema (integer IDs, `configJson: string`). Farsight stores a `PipelineDefinition` with `{ nodes: PipelineNode[], edges: PipelineEdge[] }` and `parameters: Record<string, unknown>`. The canvas-to-contract mapping:
- `DbNode.type` (e.g. `"source_dataset"`) → `PipelineNode.type` (NodeId e.g. `"core.source.dataset@1.0.0"`)
- `DbNode.configJson` (string JSON) → `PipelineNode.parameters` (object)
- `DbNode.positionX/Y` → `PipelineNode.position.x/y`
- `DbEdge.sourceNodeId` → `PipelineEdge.from`, `DbEdge.targetNodeId` → `PipelineEdge.to`
- Edges always use port `'main'` in v1.
- Save triggers `client.workflows.update({ body: { definition: assembledDefinition } })`.

**PALETTE GROUPS to reuse:** The source/transform/output grouping in Helm's `PALETTE_GROUPS` is directly mappable. For Phase-4 MVP, pick a subset: `source_dataset` → one source node, `filter` → one transform node, and one output/sink node (no Helm promote_* nodes — Farsight has its own output concepts). Hardcode the NodeId strings for the MVP subset.

**CSS hardcoding to fix:** `stroke: "#266DF0"` in edge styles → replace with `'var(--color-primary)'`. Already flagged as a known UX debt anti-pattern.

### Agent Source (`app/agents/[id]/agent-canvas-client.tsx` + `agents-client.tsx`)

**Next.js coupling to remove:**
- `Link` from `next/link` in `agents-client.tsx` → `onNavigate` callback
- `useRouter().refresh()` in agents-client.tsx → remove (not relevant outside Next.js)
- `alert()` in `agents-client.tsx` (handleSave error) → Sonner toast
- `apiFetch('/api/agents/...')` → if adopting Option A (chat), replace with `client.agents.submit` + poll `client.agents.messages`

**What changes with the contract model:** Helm's `agent-canvas-client.tsx` is a visual builder for attaching skills/MCP servers to an agent (a Helm-specific feature). Farsight's agent contract only exposes `submit` and `messages`. Phase 4 should build a **chat surface** (message list + submit form + polling) rather than trying to port Helm's resource-attachment canvas.

**canvas-kit applicability:** The agent chat view can use the canvas-kit's layout shell (header, content area, responsive panels) but NOT xyflow — it's a linear message list, not a DAG. The D-10 "shared canvas-kit" for agents means the panel/layout chrome, not the ReactFlow component itself.

---

## xyflow Canvas-Kit Extraction

### Helm xyflow Wiring Pattern [VERIFIED: direct source inspection]

Both canvases use the same core setup:
```typescript
// agent-canvas-client.tsx (lines 2-17):
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
         useNodesState, useEdgesState, type Node, type Edge, type NodeTypes,
         type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';   // ← SIDE EFFECT IMPORT

// Wrapped in ReactFlowProvider:
export function AgentCanvasClient(props: CanvasProps) {
  return <ReactFlowProvider><InnerCanvas {...props} /></ReactFlowProvider>;
}
```

```typescript
// pipeline-detail-client.tsx uses ReactFlow directly (no explicit Provider wrapper)
// The pipeline canvas does NOT wrap in ReactFlowProvider — uses ReactFlow directly
// which auto-provides context when no hooks are called outside it.
```

### CSS Import Order Contract [VERIFIED: PITFALLS.md + direct source inspection]

The required consumer CSS order (documented in Phase 1, enforced in Phase 4):
```css
/* apps/web/src/index.css OR examples/farsight-ui-consumer/src/index.css */
@import "tailwindcss";
@import "@farsight/ui/theme.css";          /* tokens + @source */
@import "@xyflow/react/dist/style.css";    /* MUST come AFTER tailwindcss reset */
```

**Why order matters:** Tailwind v4's reset sets `overflow: hidden` on some selectors; `@xyflow/react/dist/style.css` must come after so xyflow's edge and viewport styles win. Getting this wrong makes edges invisible (the `.react-flow__edges` container gets clobbered). Verified in PITFALLS.md §Pitfall 4.

**jsdom render-smoke for edges:** xyflow renders to SVG in a real browser; in jsdom the canvas has zero dimensions and SVG paths are not drawn. The jsdom "render-smoke" can assert:
1. The ReactFlow container div is in the DOM
2. Node wrapper elements exist (`.react-flow__node` data-id attributes match the input nodes array)
3. Edge elements exist (`.react-flow__edge` elements match edge count from the input)

Edge *visibility* (whether SVG paths have non-zero length) requires a real browser — that is the Vite app's job.

### canvas-kit Structure

```
packages/ui/src/components/canvas-kit/
├── index.ts                  # Re-exports all canvas-kit primitives
├── canvas-flow.tsx           # ReactFlow wrapper + ReactFlowProvider (always wraps)
├── canvas-background.tsx     # Background + default gap config
├── canvas-controls.tsx       # Controls panel (themed with token colors)
├── canvas-minimap.tsx        # MiniMap (optional, themed)
├── canvas-panel.tsx          # Panel positioning primitive
├── canvas-inspector.tsx      # Right-side inspector panel shell (close button, scroll)
├── canvas-palette.tsx        # Left-side palette chrome + drag-start logic
└── auto-layout.ts            # dagre auto-layout utility (pure fn)
```

**What lives in canvas-kit:** Domain-neutral scaffolding. `@xyflow/react` CSS import MUST be documented as a side-effect that the canvas-kit entry re-exports (via a `canvas-kit.css` or documented consumer setup).

**What does NOT live in canvas-kit:** Pipeline node components, agent chat layout, any domain-specific node types.

---

## Phase-3 Seam — What Phase 4 Inherits [VERIFIED: direct source inspection]

From `packages/ui/src/index.ts` (lines 88–96):
```typescript
export { FarsightProvider, useFarsightContext, FarsightContext } from './provider/farsight-provider'
export type { FarsightProviderProps, TenantContext, FarsightContextValue } from './provider/farsight-provider'
export { useTenant } from './provider/use-tenant'
export { useApiClient } from './provider/use-api-client'
export { createApiClient, ApiClientError, ApiClientSchemaError } from './client/create-client'
export type { ApiClient, CreateApiClientOptions } from './client/create-client'
export { toFarsightError, isFarsightError, matchCode } from './errors/farsight-error'
export type { FarsightError, FarsightSchemaError } from './errors/farsight-error'
```

**`useApiClient()` returns the full `ApiClient`** — surfaces call `client.datasets.*`, `client.workflows.*`, `client.agents.*` without wiring transport themselves.

**`useTenant()` returns `{ userId, orgId, orgSlug, role, projectSlug? }`** — all three new surfaces need `projectSlug` (datasets, workflows, agents are all URL-nested under `:slug/projects/:projectSlug`). The `useApiClient()` hook must check `projectSlug != null` before enabling project-scoped queries.

**Query key pattern (slug-namespaced, from Phase-3 webhooks pattern):**
```typescript
// datasets
export const datasetKeys = {
  all: (orgSlug: string, projectSlug: string) => ['datasets', orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) => [...datasetKeys.all(orgSlug, projectSlug), 'list'] as const,
  detail: (orgSlug: string, projectSlug: string, id: string) => [...datasetKeys.all(orgSlug, projectSlug), id] as const,
  records: (orgSlug: string, projectSlug: string, id: string) => [...datasetKeys.all(orgSlug, projectSlug), id, 'records'] as const,
}

// workflows
export const workflowKeys = {
  all: (orgSlug: string, projectSlug: string) => ['workflows', orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) => [...workflowKeys.all(orgSlug, projectSlug), 'list'] as const,
  detail: (orgSlug: string, projectSlug: string, wfSlug: string) => [...workflowKeys.all(orgSlug, projectSlug), wfSlug] as const,
}
```

**Mock test pattern (from Phase-3 hooks tests):** The existing `__tests__/helpers/mock-fetch.ts` `createMockFetch()` + `vitest.config.ts` aliases that resolve `@farsight/sdk` to the TS source already support Phase-4 surfaces without infrastructure changes.

---

## PORT-01 Vite Consumer App

### Workspace Link Pattern [VERIFIED: packages/ui/pnpm-workspace.yaml]

The Phase-3 workspace link in `packages/ui/pnpm-workspace.yaml`:
```yaml
packages:
  - '.'
  - '../../../farsight-platform/packages/sdk'
  - '../../../farsight-platform/packages/contracts'
```

The `examples/farsight-ui-consumer` app needs a **root-level** `pnpm-workspace.yaml` addition (Helm repo root) or its own `pnpm-workspace.yaml`. The simplest approach mirrors Phase-3: add `examples/farsight-ui-consumer` to the Helm root workspace so `workspace:*` resolves `@farsight/ui` to the local `packages/ui`.

**How to consume the BUILT dist (D-05):**
The `packages/ui/package.json` exports map already has `publishConfig.exports` pointing to `dist/`. The `examples/farsight-ui-consumer` Vite app must be configured to use the `publishConfig` variant. In pnpm, this is done by adding `"publishDirectory": "."` or ensuring the `build` script runs before `dev`. The recommended approach: configure the Vite app to import `@farsight/ui` and run `pnpm --filter @farsight/ui build` before the Vite dev server starts (`prebuild` script or a `turbo` pipeline).

**Vite app `index.css` (CSS import order proof, D-05/D-09):**
```css
@import "tailwindcss";
@import "@farsight/ui/theme.css";
@import "@xyflow/react/dist/style.css";
```

**Tree-shaking proof (D-05):** Import `Button` only → `vite build` → inspect bundle for absence of xyflow/Recharts chunks:
```bash
# After build:
ls dist/assets/ | grep -i xyflow   # must be empty
ls dist/assets/ | grep -i recharts  # must be empty
# OR use rollup-plugin-visualizer in vite.config.ts
```

**Tailwind `@source` for dist (the critical consumer setup):**
The `packages/ui/src/styles/theme.css` already contains `@source "../../src"` which scans the library source. When the Vite consumer imports the BUILT dist (not source), the `@source` path resolves relative to the built `dist/styles/theme.css` file. The path `../../src` would be invalid in the dist layout. **This is a critical gap to resolve in PORT-01.**

Resolution options:
1. `@source` pointing at the npm/workspace package path: add `@source "../../node_modules/@farsight/ui/dist"` (or workspace equivalent) to `examples/index.css`
2. tsdown build step copies `theme.css` with corrected `@source` path

The `@source` path in `dist/styles/theme.css` must be verified during PORT-01 implementation. The simplest fix: add `@source "../../../packages/ui/src"` to the `examples/farsight-ui-consumer/src/index.css` (absolute workspace-relative path works in monorepo dev).

---

## PORT-02 Consumer Setup Documentation

### Required Peer Versions

From `packages/ui/package.json` (verified):
```json
{
  "@clerk/react": "^6.0.0",
  "@tanstack/react-query": "^5.0.0",
  "@xyflow/react": "^12.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```
Additional required peers (added during Phase 3/4): `next-themes` (optional, Toaster theming), `sonner` (Toaster), `recharts` (charts).

### Consumer Setup Checklist (README content)

1. Install `@farsight/ui` via `workspace:*` (monorepo) or npm (published)
2. Install required peer deps
3. Add to root CSS:
   ```css
   @import "tailwindcss";
   @import "@farsight/ui/theme.css";     /* tokens + @source scan */
   @import "@xyflow/react/dist/style.css"; /* after tailwindcss */
   ```
4. Add `@source` pointing at the package dist for utility discovery (if `theme.css` @source path needs updating post-dist)
5. Wrap app root in `<FarsightProvider baseUrl="..." getToken={...} projectSlug={...}>`
6. `<ClerkProvider>` must be mounted ABOVE `<FarsightProvider>` (library assumes Clerk context above)

### Farsight Copy Runbook (PORT-02 content)

1. `pnpm --filter @farsight/ui build` — produce clean dist
2. `npx publint packages/ui` — verify exports clean
3. `npx @arethetypeswrong/cli packages/ui` — verify `.d.ts` resolution
4. Copy `packages/ui` → `~/Projects/farsight-platform/packages/ui`
5. Update Farsight `pnpm-workspace.yaml` to include `packages/ui`
6. Run `pnpm install` in Farsight root
7. In `apps/web/package.json` add `"@farsight/ui": "workspace:*"`
8. Add peer deps to `apps/web`
9. Add CSS imports to `apps/web/src/index.css`
10. Wrap `apps/web` root in `<FarsightProvider>`
11. Verify `pnpm list react -r` = one version

---

## Standard Stack

### Core (already installed, Phase 3)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@farsight/sdk` | workspace | Typed API client for all three surfaces | Thin-wrapped by Phase-3 `create-client.ts`; `client.datasets.*`, `client.workflows.*`, `client.agents.*` available |
| `@farsight/contracts` | workspace | Zod schemas for mock tests + type inference | `datasetsRoutes`, `workflowsRoutes`, `agentsRoutes` now confirmed |
| `@xyflow/react` | ^12.0.0 (peer) | Pipeline canvas + canvas-kit | Already declared as optional peer; CSS side-effect import required |
| `@tanstack/react-query` | ^5.0.0 (peer) | queryOptions factories for all surfaces | Already wired in Phase 3 |

### New installs for PORT-01

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `vite` | ^6.x | Vite consumer dev server | `[ASSUMED]` — verify current version; `@vitejs/plugin-react` companion |
| `@vitejs/plugin-react` | ^4.x | React JSX transform for Vite | `[ASSUMED]` |
| `@tailwindcss/vite` | ^4.x | Tailwind v4 Vite plugin | Already used in Phase 1 smoke apps; `[ASSUMED]` version |

No new production dependencies needed in `packages/ui` for Phase 4.

---

## Package Legitimacy Audit

> Phase 4 installs no new production packages in `packages/ui`. The only new installs are in the `examples/` Vite app (dev tools). All production dependencies were verified in Phases 1–3.

| Package | Registry | Notes | Disposition |
|---------|----------|-------|-------------|
| `vite` | npm | Battle-tested; 15M+/wk downloads; official Vite project | Approved `[ASSUMED]` — verify version at install time |
| `@vitejs/plugin-react` | npm | Official Vite plugin for React | Approved `[ASSUMED]` |
| `@tailwindcss/vite` | npm | Official Tailwind Labs Vite plugin | Approved `[ASSUMED]` |

**Packages removed due to slopcheck:** None (slopcheck not available in sandbox; all packages are well-established ecosystem tools)
**Packages flagged [SUS]:** None

*slopcheck unavailable — all `examples/` dev packages are tagged `[ASSUMED]` and the planner should add a verify-before-install checkpoint.*

---

## Architecture Patterns

### System Architecture Diagram

```
Consumer (examples/farsight-ui-consumer or apps/web)
  └─ <ClerkProvider>            (consumer-owned)
       └─ <FarsightProvider baseUrl projectSlug>   ← SEAM (Phase 3)
            │
            ├─ useTenant()  → { orgSlug, projectSlug, ... }
            ├─ useApiClient() → client.datasets.* / client.workflows.* / client.agents.*
            │
            ├── DATASETS surface
            │     ├── useDatasets()        queryOptions('datasets', orgSlug, projectSlug)
            │     ├── useDataset(id)       queryOptions detail
            │     ├── useDatasetRecords(id) paginated
            │     ├── useSearchDataset()   mutation (POST search)
            │     └── <DatasetList> <DatasetDetail> <DatasetSearch>
            │
            ├── WORKFLOWS (pipelines) surface
            │     ├── useWorkflows()       queryOptions list
            │     ├── useWorkflow(wfSlug)  queryOptions detail + definition
            │     ├── useUpdateWorkflow()  mutation (PATCH definition → new version)
            │     ├── useRunWorkflow()     mutation (POST run → runId)
            │     └── <WorkflowList> <WorkflowCanvas (xyflow)> <WorkflowRunView>
            │             └─ canvas-kit: ReactFlow + Background + Controls + Inspector
            │                  surface nodes: SourceNode / TransformNode / SinkNode
            │
            └── AGENTS surface
                  ├── useAgentMessages(agentId, chatId?)  queryOptions (polling)
                  ├── useSubmitAgentMessage()              mutation
                  └── <AgentChatView> (message list + submit form)
                          └─ canvas-kit: layout shell (not xyflow DAG)
```

### Recommended Project Structure (new directories only)

```
packages/ui/src/
├── hooks/
│   ├── use-datasets.ts          # useDatasets, useDataset, useDatasetRecords, useSearchDataset
│   ├── use-workflows.ts         # useWorkflows, useWorkflow, useUpdateWorkflow, useRunWorkflow
│   └── use-agents.ts            # useAgentMessages, useSubmitAgentMessage
├── components/
│   ├── canvas-kit/              # shared xyflow shell (no domain nodes)
│   │   ├── index.ts
│   │   ├── canvas-flow.tsx      # ReactFlow + ReactFlowProvider wrapper
│   │   ├── canvas-background.tsx
│   │   ├── canvas-controls.tsx
│   │   ├── canvas-inspector.tsx
│   │   └── canvas-palette.tsx
│   ├── datasets/
│   │   ├── index.ts
│   │   ├── dataset-list.tsx     # DataTable + columns for Dataset shape
│   │   ├── dataset-detail.tsx   # id, name, description, kind, searchBackend, status badges
│   │   ├── dataset-records.tsx  # paginated NormalizedRecord rows
│   │   └── dataset-search.tsx   # query input + discriminated-union result display
│   ├── pipelines/               # (consumer-facing name "pipelines" maps to workflows contract)
│   │   ├── index.ts
│   │   ├── workflow-list.tsx    # card/table list of Workflow items
│   │   ├── workflow-canvas.tsx  # xyflow canvas bound to PipelineDefinition
│   │   ├── workflow-run-view.tsx # run status display (runId + status badge)
│   │   └── nodes/
│   │       ├── source-node.tsx
│   │       ├── transform-node.tsx
│   │       └── sink-node.tsx
│   └── agents/
│       ├── index.ts
│       ├── agent-chat-view.tsx  # message thread + submit form
│       └── agent-message.tsx    # single message (role + parts[] renderer)
examples/
└── farsight-ui-consumer/        # PORT-01 workspace package
    ├── package.json             # deps: @farsight/ui:workspace:*, @clerk/react, react, etc.
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── index.css            # @import tailwindcss; theme.css; xyflow/dist/style.css
        ├── main.tsx
        └── App.tsx              # mounts FarsightProvider + renders primitives + canvas
```

### Pattern 1: queryOptions Factory for a Project-Scoped Surface

```typescript
// packages/ui/src/hooks/use-datasets.ts
// Source: Phase-3 use-webhooks.ts pattern
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '../provider/use-api-client'
import { useTenant } from '../provider/use-tenant'

export const datasetKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ['datasets', orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), 'list'] as const,
  detail: (orgSlug: string, projectSlug: string, id: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), id] as const,
}

export function useDatasetsQueryOptions() {
  const client = useApiClient()
  const { orgSlug, projectSlug } = useTenant()
  return queryOptions({
    queryKey: datasetKeys.list(orgSlug, projectSlug ?? ''),
    queryFn: () => client.datasets.list({
      params: { slug: orgSlug, projectSlug: projectSlug! },
    }),
    enabled: !!projectSlug,   // ← disable if no project selected
  })
}

export function useDeleteDatasetMutation() {
  const client = useApiClient()
  const { orgSlug, projectSlug } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.datasets.delete({
      params: { slug: orgSlug, projectSlug: projectSlug!, id },
    }),
    onSuccess: () => qc.invalidateQueries({
      queryKey: datasetKeys.all(orgSlug, projectSlug ?? ''),
    }),
  })
}
```

### Pattern 2: PipelineDefinition ↔ xyflow State Adapter

```typescript
// packages/ui/src/components/pipelines/workflow-canvas.tsx
// Source: pipeline-detail-client.tsx (adapted)
import type { PipelineDefinition, PipelineNode } from '@farsight/contracts'
import type { Node, Edge } from '@xyflow/react'

// Farsight PipelineNode → xyflow Node
function toFlowNode(pn: PipelineNode): Node {
  return {
    id: pn.id,
    type: nodeTypeFor(pn.type),   // maps Farsight NodeId → canvas-kit node component key
    position: pn.position ?? { x: 0, y: 0 },
    data: { type: pn.type, parameters: pn.parameters, name: pn.name, disabled: pn.disabled },
  }
}

// xyflow state → Farsight PipelineDefinition (for PATCH body)
function toDefinition(
  nodes: Node[], edges: Edge[], meta: Pick<PipelineDefinition, 'schemaVersion' | 'name' | 'trigger'>
): PipelineDefinition {
  return {
    ...meta,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.type as string,
      name: n.data.name as string | undefined,
      parameters: (n.data.parameters ?? {}) as Record<string, unknown>,
      position: n.position,
      disabled: (n.data.disabled ?? false) as boolean,
    })),
    edges: edges.map((e) => ({
      from: e.source, fromPort: 'main',
      to: e.target,   toPort: 'main',
    })),
    staticData: {},
  }
}
```

### Pattern 3: Agent Chat Polling Hook

```typescript
// packages/ui/src/hooks/use-agents.ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '../provider/use-api-client'

export const agentKeys = {
  messages: (agentDefinitionId: string, chatId?: string) =>
    ['agents', agentDefinitionId, chatId ?? 'default', 'messages'] as const,
}

export function useAgentMessagesQueryOptions(agentDefinitionId: string, chatId?: string) {
  const client = useApiClient()
  return queryOptions({
    queryKey: agentKeys.messages(agentDefinitionId, chatId),
    queryFn: () => client.agents.messages({
      params: { agentDefinitionId },
      query: chatId ? { chatId } : undefined,
    }),
    refetchInterval: 2000,   // poll every 2s for new messages while open
    refetchIntervalInBackground: false,
  })
}

export function useSubmitAgentMessage(agentDefinitionId: string) {
  const client = useApiClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { message: string; chatId?: string }) =>
      client.agents.submit({ params: { agentDefinitionId }, body }),
    onSuccess: (data) => qc.invalidateQueries({
      queryKey: agentKeys.messages(agentDefinitionId, data.chatId),
    }),
  })
}
```

### Anti-Patterns to Avoid

- **Routing inside library components:** Never call `useRouter().push()`. Always emit `onNavigate(href: string)` callbacks. DataTable row click → `onRowClick(row) => onNavigate('/datasets/${row.original.id}')`.
- **`confirm()` in delete handlers:** Already removed in Phase 2; any new code MUST use `ConfirmDialog`.
- **Hardcoded hex edge colors in xyflow:** `stroke: "#266DF0"` from Helm → replace with `'var(--color-primary)'`.
- **Storing xyflow state outside PipelineDefinition:** Do not invent a parallel node-state schema. Convert xyflow state → PipelineDefinition on save and PipelineDefinition → xyflow state on load.
- **Merging agent chat surface into the canvas-kit DAG model:** The Farsight agent contract is a chat interface, not a DAG. Do not force xyflow onto the agent surface.
- **Forgetting `enabled: !!projectSlug` on project-scoped hooks:** Without this guard, hooks fire with `projectSlug = null/undefined` and produce 404s or 400s from the API.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DAG cycle detection for PipelineDefinition | Custom cycle checker | `validatePipelineGraph()` from `@farsight/contracts/nodes/pipeline-definition` | Already exported from the contracts package; catches duplicate IDs, dangling edges, cycles |
| xyflow canvas layout | Custom positioning | `dagre` auto-layout (already in Helm `components/canvas/auto-layout.tsx`) | Port verbatim; dagre is already a Helm dependency |
| Pagination cursor logic | Custom cursor state | `PaginationQuerySchema` + `makePaginatedSchema` response shape from contracts | Standard paginated response: `{ items, nextCursor?, hasMore }` |
| Mocked fetch for tests | Hand-rolled fetch mock | `createMockFetch()` from `packages/ui/__tests__/helpers/mock-fetch.ts` | Already implemented in Phase 3; supports per-route response configuration |
| type-checking the dist artifact | Manual inspection | `npx publint packages/ui` + `npx @arethetypeswrong/cli packages/ui` | Wired in Phase 1; re-run on Phase 4 dist |
| Tree-shaking validation | Bundle size estimation | Vite build + `rollup-plugin-visualizer` | Renders a visual treemap; or check for xyflow/recharts chunk filenames in dist/assets/ |

---

## Common Pitfalls

### Pitfall 1: `projectSlug` null causes silent API failures
**What goes wrong:** Hooks for project-scoped resources (all three surfaces) fire without checking `projectSlug`. The SDK substitutes `:projectSlug` with `undefined` → encoded as `"undefined"` → 404 from the API.
**How to avoid:** Every project-scoped `queryOptions` must include `enabled: !!projectSlug` and assert `projectSlug!` in the params.
**Warning signs:** 404 errors with `"undefined"` in the request path.

### Pitfall 2: PipelineDefinition schemaVersion mismatch
**What goes wrong:** Creating a workflow with `schemaVersion: 2` (or omitting it) causes the server to reject the definition.
**How to avoid:** Always set `schemaVersion: 1` (the only valid value per the contract's `z.literal(1)`) in the `toDefinition` converter.
**Warning signs:** 422/400 from `POST/PATCH workflows` with a schema validation error.

### Pitfall 3: `PipelineNode.type` is a NodeId, not a display string
**What goes wrong:** Using Helm's type string (`"source_dataset"`) as `PipelineNode.type` instead of a valid Farsight NodeId. The server validates the NodeId pattern (`/^[a-z][a-z0-9._-]*@\d+\.\d+\.\d+$/`). Helm strings fail this regex and the workflow CRUD rejects it.
**How to avoid:** Define a constants file in `packages/ui/src/components/pipelines/node-ids.ts` with the canonical NodeIds for the MVP subset. Do NOT use Helm's free-text type strings.
**Warning signs:** Server validation error on workflow create/update with "NodeId pattern" message.

### Pitfall 4: Agent surface contract mismatch (chat vs. definitions)
**What goes wrong:** Attempting to CRUD agent definitions via the `agentsRoutes` SDK calls. The routes only expose `submit` and `messages`. Building a create/edit form against these routes will produce 404/405 errors.
**How to avoid:** Build a chat surface. Document the reconciliation (Farsight agents are static definitions referenced by ID; this phase ports the interaction surface, not the definition management).
**Warning signs:** Looking for `client.agents.list` or `client.agents.create` — these do not exist.

### Pitfall 5: xyflow CSS import in component file (not global CSS)
**What goes wrong:** Moving `import '@xyflow/react/dist/style.css'` from global entry CSS into the canvas component file. Works in some bundlers but silently breaks in others; CSS load order is no longer guaranteed after Tailwind's reset.
**How to avoid:** Document that `@xyflow/react/dist/style.css` must be imported in the consumer's global CSS after `@import "tailwindcss"`. The canvas-kit component should NOT import it directly. The jsdom render-smoke does not test CSS, so this only fails in the real Vite consumer.
**Warning signs:** Nodes visible, edges invisible in the Vite app.

### Pitfall 6: datasets `@source` path breaks in dist
**What goes wrong:** The `theme.css` `@source "../../src"` path is valid when the source tree is at `packages/ui/src/styles/theme.css`. After `tsdown` build, the file is at `packages/ui/dist/styles/theme.css` → the `@source` path resolves to `packages/ui/dist/src` (does not exist). The `examples/` Vite consumer sees no utility class generation.
**How to avoid:** Add an explicit `@source` directive in `examples/farsight-ui-consumer/src/index.css` pointing at the workspace source: `@source "../../../packages/ui/src"` (workspace-relative). For published npm, document that consumers must add `@source "./node_modules/@farsight/ui/dist"`.
**Warning signs:** Utility classes missing in the Vite app; tokens apply (CSS vars) but spacing/color utilities are not generated.

### Pitfall 7: barrel-export trap for new surfaces
**What goes wrong:** Adding components to `packages/ui/src/components/datasets/` without registering them in `src/index.ts`. They build, tsc resolves them internally, but `@farsight/ui` exports nothing new. Runtime `import { DatasetList } from '@farsight/ui'` fails with "not a module export".
**How to avoid:** Add every new public export to `packages/ui/src/index.ts` immediately when creating the component file. Per project memory note: "new packages/ui components must be re-exported from src/index.ts or they vanish from dist + public API".

---

## Runtime State Inventory

> Step 2.5: SKIPPED. Phase 4 has no rename/refactor/migration work. This is a greenfield additive phase (new components, new hooks) — no existing runtime state carries old names that need changing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build scripts, vite | ✓ | 25.8.1 | — |
| pnpm | workspace management | ✓ | inferred from Phase 1 (11.2.2) | — |
| `@xyflow/react` | canvas-kit, pipelines surface | declared as peer | ^12.0.0 | — |
| `@farsight/sdk` | all surface hooks | ✓ (workspace link) | workspace source | — |
| `@farsight/contracts` | all surface hooks + tests | ✓ (workspace link) | workspace source | — |
| `vite` | PORT-01 examples/ app | must install in examples/ | — | — |
| Live Farsight API (api.farsght.com) | manual UAT round-trip | unknown (out of scope for automated tests) | — | mocked fetchImpl for CI |

**Missing dependencies with no fallback:** None that block automated CI. Live API is only needed for manual UAT (D-03).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured at `packages/ui/vitest.config.ts`) |
| Config file | `packages/ui/vitest.config.ts` |
| Quick run command | `pnpm --filter @farsight/ui test` |
| Full suite command | `pnpm --filter @farsight/ui test && bash packages/ui/scripts/check-imports.sh && bash packages/ui/scripts/check-directives.sh` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| DSET-01 | `useDatasetsQueryOptions` fetches via mocked fetchImpl and returns typed Dataset list | unit | `npx vitest run __tests__/hooks/use-datasets.test.ts` | Wave 0 gap |
| DSET-01 | `useSearchDataset` mutation calls `POST .../search` and returns discriminated result | unit | `npx vitest run __tests__/hooks/use-datasets.test.ts` | Wave 0 gap |
| DSET-01 | `<DatasetList>` renders datasets from mock; shows EmptyState when empty; shows ErrorState on error | component | `npx vitest run __tests__/components/datasets.test.tsx` | Wave 0 gap |
| DSET-01 | Renaming `DatasetSchema.name` field → tsc error at hook call site | type check | `npx tsc --noEmit -p packages/ui/tsconfig.json` | existing |
| PIPE-01 | `useWorkflow` fetches workflow + definition via mocked fetchImpl | unit | `npx vitest run __tests__/hooks/use-workflows.test.ts` | Wave 0 gap |
| PIPE-01 | `<WorkflowCanvas>` renders nodes and edges in jsdom DOM (render-smoke) | smoke | `npx vitest run __tests__/smoke/workflow-canvas.smoke.test.tsx` | Wave 0 gap |
| PIPE-01 | `useRunWorkflow` mutation calls `POST .../run` and returns RunAccepted | unit | `npx vitest run __tests__/hooks/use-workflows.test.ts` | Wave 0 gap |
| PIPE-01 | xyflow CSS import order correct in Vite consumer + edges visually render | visual (manual) | open `examples/farsight-ui-consumer` in browser | PORT-01 Vite app |
| AGNT-01 | `useAgentMessagesQueryOptions` polls messages via mocked fetchImpl | unit | `npx vitest run __tests__/hooks/use-agents.test.ts` | Wave 0 gap |
| AGNT-01 | `useSubmitAgentMessage` mutation calls POST submit | unit | `npx vitest run __tests__/hooks/use-agents.test.ts` | Wave 0 gap |
| AGNT-01 | `<AgentChatView>` renders message list with text parts | component | `npx vitest run __tests__/components/agents.test.tsx` | Wave 0 gap |
| PORT-01 | `import { Button } from '@farsight/ui'` → bundle has no xyflow/recharts chunks | tree-shaking | `pnpm --filter @farsight/ui-consumer build && ls dist/assets/` | PORT-01 Vite build |
| PORT-01 | canvas surface renders in Vite app with edges visible | visual (manual) | browser render in `examples/farsight-ui-consumer` | PORT-01 Vite app |
| PORT-02 | `npx publint packages/ui` exits 0 after Phase 4 build | packaging | `pnpm --filter @farsight/ui build && npx publint packages/ui` | existing script |
| PORT-02 | `npx @arethetypeswrong/cli packages/ui` exits 0 | types | `pnpm --filter @farsight/ui build && npx @arethetypeswrong/cli packages/ui` | existing script |

### Key Validation Signals Per Requirement

**DSET-01:** Dataset list renders rows from a mocked `client.datasets.list` response; search renders `backend: 'vectorize'` match results with score; `enabled: !!projectSlug` prevents queries when no project.

**PIPE-01:** Workflow canvas renders `PipelineNode[]` as xyflow nodes with correct IDs; edges render; save triggers `client.workflows.update` with assembled `PipelineDefinition`; run triggers `client.workflows.run` and returns `runId`.

**AGNT-01:** Chat view displays user/assistant messages from `client.agents.messages`; submit mutation calls `client.agents.submit`; messages poll on 2s interval (paused off-tab).

**PORT-01:** The definitive signal is the Vite app building and running in a real browser: tokens apply (green primary color from theme), canvas edges are visible, importing only Button does not include xyflow.

**PORT-02:** `publint` and `attw` exit 0 on the Phase-4 dist (they should already pass from Phase 1; re-verify with new exports).

### Sampling Rate
- **Per task commit:** `pnpm --filter @farsight/ui test` exits 0 + `check-imports.sh` passes
- **Per wave merge:** Full suite + publint + attw (on dist)
- **Phase gate:** All automated tests green + Vite app renders + publint/attw clean

### Wave 0 Gaps

- [ ] `packages/ui/__tests__/hooks/use-datasets.test.ts` — queryOptions + mutations for DSET-01
- [ ] `packages/ui/__tests__/hooks/use-workflows.test.ts` — queryOptions + mutations for PIPE-01
- [ ] `packages/ui/__tests__/hooks/use-agents.test.ts` — queryOptions + mutations for AGNT-01
- [ ] `packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx` — jsdom render-smoke for xyflow nodes+edges
- [ ] `packages/ui/__tests__/components/datasets.test.tsx` — component render tests for DSET-01
- [ ] `packages/ui/__tests__/components/agents.test.tsx` — component render tests for AGNT-01
- [ ] `examples/farsight-ui-consumer/` — scaffold the PORT-01 Vite workspace package

---

## Security Domain

> `security_enforcement` key absent from `.planning/config.json` — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Clerk JWT via `FarsightProvider.getToken` — already in Phase-3 seam; no new auth code |
| V3 Session Management | Partial | Phase-3 hard-remount on org switch; projectSlug switch should also trigger `FarsightProvider` key change |
| V4 Access Control | Yes — display only | Role-aware gating: disable destructive actions when `role` is not `admin`/`owner`; actual enforcement on server via `requireOrgMember()` |
| V5 Input Validation | Yes | All SDK calls validated by Zod at contract layer; `DatasetSearchQuerySchema` validates query (1–4000 chars, topK 1–100); `PipelineDefinitionSchema` validated via `validatePipelineGraph()` before save |
| V6 Cryptography | No | No new crypto in UI layer |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant cache bleed on project switch | Information Disclosure | `projectSlug` included in all query keys + `FarsightProvider` remounts on key change (Phase-3 pattern extends to project) |
| Client-side tenancy bypass | Elevation of Privilege | Frontend never trusted; `requireOrgMember()` on every API handler; UI role gating is UX only |
| RAG search injection via query string | Tampering | `DatasetSearchQuerySchema` enforces max 4000 chars; rendered as HTML text (no `dangerouslySetInnerHTML`) |
| XSS via agent message content | Tampering | Render message `text` parts as plain text, not HTML; never `dangerouslySetInnerHTML` on agent responses |

---

## Open Questions (RESOLVED)

1. **What are the live Farsight NodeId strings for the Phase-4 MVP pipeline node subset?**
   - **RESOLVED:** Verified by reading `~/Projects/farsight-platform/apps/api/src/nodes/` — the MVP subset is `core.source.manual@1.0.0`, `core.transform.set@1.0.0`, `core.sink.dataset@1.0.0`. Hardcoded in `node-ids.ts` (plan 04-03) with a comment documenting the registry source.

2. **`projectSlug` source for the `examples/` Vite consumer app**
   - **RESOLVED:** Hardcode a test `projectSlug` (+ `orgSlug`) as dev constants in the examples app (sufficient for the PORT-01 proof); the consumer README documents that the real `apps/web` supplies these from its own routing/project selector.

3. **Agent surface scope clarification**
   - **RESOLVED (user-confirmed, R-04):** Build the **chat surface** for a consumer-provided `agentDefinitionId` (`submit` + poll `messages`) — the only contract-supported binding. AGNT-01 "definitions/canvas/run-history" is reconciled to an agent chat view. Canvas-kit is pipelines-only (D-10 amended).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Farsight live API at `api.farsght.com` has `datasets`, `workflows`, `agents` routes mounted (confirmed via `apps/api/src/index.ts` per 04-CONTEXT.md R-01) | Standard Stack | Low — 04-CONTEXT.md verified; risk is deployment lag to production |
| A2 | `pnpm list react -r` still shows one version after Phase 4 additions (no new React dep conflicts) | Environment | Low — no new React-related packages; Phase 1 pnpm.overrides already pins |
| A3 | The `examples/` Vite app can be added as a new workspace package without modifying the Helm root `pnpm-workspace.yaml` structure | PORT-01 | Medium — depends on whether the root workspace already includes `examples/*` or needs editing |
| A4 | `@xyflow/react` v12 `ReactFlowProvider` + `useNodesState`/`useEdgesState` API is unchanged from Helm's usage | canvas-kit | Low — already used in Helm; no version bump planned |
| A5 | vite/vitejs packages are their current stable versions as of 2026-05-29 | PORT-01 | Low — standard ecosystem packages; verify at install time |
| A6 | The `validatePipelineGraph()` function is exported from `@farsight/contracts` | Don't Hand-Roll | Verified directly in `pipeline-definition.ts` source |
| A7 | All `datasetsRoutes`, `workflowsRoutes`, `agentsRoutes` are re-exported from `@farsight/contracts` index | hook factories | High confidence — confirmed in contracts structure; verify at implementation |

---

## Sources

### Primary (HIGH confidence — direct source inspection)

- `~/Projects/farsight-platform/packages/contracts/src/datasets/{routes,schemas}.ts` — full datasets contract, RAG search discriminated union
- `~/Projects/farsight-platform/packages/contracts/src/agents/{routes,schemas}.ts` — agents chat contract (submit/messages)
- `~/Projects/farsight-platform/packages/contracts/src/workflows/routes.ts` — workflows CRUD + run
- `~/Projects/farsight-platform/packages/contracts/src/nodes/pipeline-definition.ts` — PipelineDefinition schema + validatePipelineGraph()
- `~/Projects/farsight-platform/packages/contracts/src/nodes/farsight-node.ts` — FarsightNode interface + NodeId pattern
- `~/Projects/farsight-platform/packages/contracts/src/nodes/node-properties.ts` — INodeProperties (inspector parameter schema)
- `~/Projects/farsight-platform/packages/sdk/src/index.ts` — createApiClient, ApiClient type shape
- `/Users/scottjensen/Projects/helm/packages/ui/src/index.ts` — current barrel (Phase 3 seam exports)
- `/Users/scottjensen/Projects/helm/packages/ui/pnpm-workspace.yaml` — workspace link pattern for SDK/contracts
- `/Users/scottjensen/Projects/helm/packages/ui/package.json` — exports map, peers, build scripts
- `/Users/scottjensen/Projects/helm/packages/ui/vitest.config.ts` — existing test infrastructure
- `/Users/scottjensen/Projects/helm/app/datasets/datasets-client.tsx` — Helm datasets source (coupling inventory)
- `/Users/scottjensen/Projects/helm/app/agents/agents-client.tsx` + `[id]/agent-canvas-client.tsx` — Helm agents source (coupling inventory)
- `/Users/scottjensen/Projects/helm/app/pipelines/[id]/pipeline-detail-client.tsx` — Helm pipeline canvas source (xyflow wiring)
- `/Users/scottjensen/Projects/helm/.planning/phases/04-contract-gated-surfaces-monorepo-port/04-CONTEXT.md` — locked decisions D-01..D-10
- `/Users/scottjensen/Projects/helm/.planning/phases/01-package-foundation-theming/01-RESEARCH.md` — packaging patterns (tsdown, publint, attw)
- `/Users/scottjensen/Projects/helm/.planning/research/PITFALLS.md` — xyflow CSS order, cache bleed, Tailwind @source pitfalls
- `/Users/scottjensen/Projects/helm/.planning/research/ARCHITECTURE.md` — layered architecture, canvas-kit split rationale

### Secondary (MEDIUM confidence)

- Tailwind v4 `@source` monorepo pattern — PITFALLS.md + Phase-1 RESEARCH.md (verified against Tailwind maintainer guidance)
- xyflow CSS import order effect on edges — PITFALLS.md §Pitfall 4 (verified against official xyflow troubleshooting docs)

---

## Metadata

**Confidence breakdown:**
- Contract shapes (datasets, workflows, agents): HIGH — read directly from source files
- Helm coupling inventory: HIGH — read directly from source files
- canvas-kit extraction structure: HIGH — derived from direct Helm source analysis
- PORT-01 Vite consumer setup: MEDIUM — @source path after dist build needs empirical verification
- Agent surface reconciliation (chat vs definitions): HIGH — contract read directly; reconciliation recommendation is clear

**Research date:** 2026-05-29
**Valid until:** 2026-07-29 (contracts are actively developed; re-check before executing if >2 weeks from this date)
