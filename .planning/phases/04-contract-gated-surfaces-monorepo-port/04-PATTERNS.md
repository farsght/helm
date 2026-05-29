# Phase 4: Contract-Gated Surfaces & Monorepo Port - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 26 new/modified files across hooks, components, canvas-kit, tests, examples/
**Analogs found:** 24 / 26 (2 partial — canvas-kit CanvasFlow and PipelineDefinition adapter are novel extractions with only Helm anti-analogs)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/ui/src/hooks/use-datasets.ts` | hook | request-response (CRUD + mutation) | `packages/ui/src/hooks/use-webhooks.ts` | exact |
| `packages/ui/src/hooks/use-workflows.ts` | hook | request-response (CRUD + mutation) | `packages/ui/src/hooks/use-webhooks.ts` | exact |
| `packages/ui/src/hooks/use-agents.ts` | hook | event-driven (polling + mutation) | `packages/ui/src/hooks/use-notifications.ts` | exact |
| `packages/ui/src/components/datasets/dataset-list.tsx` | component | request-response | `packages/ui/src/components/webhooks/webhook-list.tsx` | exact |
| `packages/ui/src/components/datasets/dataset-detail.tsx` | component | request-response | `packages/ui/src/components/notifications/notification-inbox.tsx` | role-match |
| `packages/ui/src/components/datasets/dataset-records.tsx` | component | request-response | `packages/ui/src/components/data-table/data-table.tsx` | role-match |
| `packages/ui/src/components/datasets/dataset-search.tsx` | component | request-response (mutation) | `packages/ui/src/components/webhooks/webhook-list.tsx` (mutation pattern) | partial |
| `packages/ui/src/components/datasets/index.ts` | config | — | `packages/ui/src/components/webhooks/index.ts` | exact |
| `packages/ui/src/components/pipelines/workflow-list.tsx` | component | request-response | `packages/ui/src/components/webhooks/webhook-list.tsx` | exact |
| `packages/ui/src/components/pipelines/workflow-canvas.tsx` | component | CRUD + event-driven | `app/pipelines/[id]/pipeline-detail-client.tsx` (decouple) | partial |
| `packages/ui/src/components/pipelines/workflow-run-view.tsx` | component | request-response | `packages/ui/src/components/page/error-state.tsx` (status display) | role-match |
| `packages/ui/src/components/pipelines/nodes/source-node.tsx` | component | — | `app/pipelines/[id]/pipeline-node.tsx` + `components/canvas/flow-node.tsx` | partial |
| `packages/ui/src/components/pipelines/nodes/transform-node.tsx` | component | — | `app/pipelines/[id]/pipeline-node.tsx` + `components/canvas/flow-node.tsx` | partial |
| `packages/ui/src/components/pipelines/nodes/sink-node.tsx` | component | — | `app/pipelines/[id]/pipeline-node.tsx` + `components/canvas/flow-node.tsx` | partial |
| `packages/ui/src/components/pipelines/node-ids.ts` | config | — | (no analog — constants file for MVP NodeId strings) | none |
| `packages/ui/src/components/pipelines/pipeline-adapter.ts` | utility | transform | `components/canvas/auto-layout.ts` (pure fn pattern) | role-match |
| `packages/ui/src/components/pipelines/index.ts` | config | — | `packages/ui/src/components/webhooks/index.ts` | exact |
| `packages/ui/src/components/canvas-kit/canvas-flow.tsx` | component | — | `app/agents/[id]/agent-canvas-client.tsx` (xyflow wiring, decouple) | partial |
| `packages/ui/src/components/canvas-kit/canvas-background.tsx` | component | — | `app/pipelines/[id]/pipeline-detail-client.tsx` (Background usage) | partial |
| `packages/ui/src/components/canvas-kit/canvas-controls.tsx` | component | — | `app/pipelines/[id]/pipeline-detail-client.tsx` (Controls usage) | partial |
| `packages/ui/src/components/canvas-kit/canvas-minimap.tsx` | component | — | `app/agents/[id]/agent-canvas-client.tsx` (MiniMap usage) | partial |
| `packages/ui/src/components/canvas-kit/canvas-panel.tsx` | component | — | `app/pipelines/[id]/pipeline-detail-client.tsx` (Panel usage) | partial |
| `packages/ui/src/components/canvas-kit/canvas-inspector.tsx` | component | — | `app/pipelines/[id]/pipeline-detail-client.tsx` (PipelineNodeConfig panel, decouple) | partial |
| `packages/ui/src/components/canvas-kit/canvas-palette.tsx` | component | — | `components/canvas/palette.tsx` (decouple) | partial |
| `packages/ui/src/components/canvas-kit/auto-layout.ts` | utility | transform | `components/canvas/auto-layout.ts` | exact |
| `packages/ui/src/components/canvas-kit/index.ts` | config | — | `packages/ui/src/components/webhooks/index.ts` | exact |
| `packages/ui/src/components/agents/agent-chat-view.tsx` | component | event-driven (polling) | `packages/ui/src/components/notifications/notification-inbox.tsx` | exact |
| `packages/ui/src/components/agents/agent-message.tsx` | component | — | `packages/ui/src/components/notifications/notification-item.tsx` | role-match |
| `packages/ui/src/components/agents/index.ts` | config | — | `packages/ui/src/components/webhooks/index.ts` | exact |
| `packages/ui/src/index.ts` (modified) | config | — | current `packages/ui/src/index.ts` lines 58–96 | exact |
| `packages/ui/__tests__/hooks/use-datasets.test.ts` | test | — | `packages/ui/__tests__/hooks/use-webhooks.test.tsx` | exact |
| `packages/ui/__tests__/hooks/use-workflows.test.ts` | test | — | `packages/ui/__tests__/hooks/use-webhooks.test.tsx` | exact |
| `packages/ui/__tests__/hooks/use-agents.test.ts` | test | — | `packages/ui/__tests__/hooks/use-webhooks.test.tsx` | exact |
| `packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx` | test | — | `packages/ui/__tests__/smoke/page-primitives.smoke.test.tsx` | role-match |
| `packages/ui/__tests__/components/datasets.test.tsx` | test | — | `packages/ui/__tests__/components/webhook-list.test.tsx` | exact |
| `packages/ui/__tests__/components/agents.test.tsx` | test | — | `packages/ui/__tests__/components/webhook-list.test.tsx` | exact |
| `examples/farsight-ui-consumer/package.json` | config | — | `packages/ui/package.json` (exports structure) | role-match |
| `examples/farsight-ui-consumer/vite.config.ts` | config | — | (no in-repo analog) | none |
| `examples/farsight-ui-consumer/src/index.css` | config | — | documented CSS import order contract (RESEARCH.md) | none |
| `examples/farsight-ui-consumer/src/App.tsx` | component | — | (no in-repo analog for Vite app shell) | none |

---

## Pattern Assignments

### `packages/ui/src/hooks/use-datasets.ts` (hook, request-response + CRUD)

**Analog:** `packages/ui/src/hooks/use-webhooks.ts`

**Copy this file structure exactly.** Datasets is the project-scoped surface with `{ slug, projectSlug }` params — identical seam contract to webhooks.

**Imports pattern** (lines 1–21 of `use-webhooks.ts`):
```typescript
// No "use client" on hook files — only components carry the directive
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import type { /* Dataset, DatasetListResponse, etc. */ } from "@farsight/contracts"
import { useFarsightContext } from "../provider/farsight-provider"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>
```

**Key factory pattern** (lines 25–31 of `use-webhooks.ts`):
```typescript
export const datasetKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["datasets", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, id: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), id] as const,
  records: (orgSlug: string, projectSlug: string, id: string) =>
    [...datasetKeys.all(orgSlug, projectSlug), id, "records"] as const,
}
```

**`enabled: !!projectSlug` guard** (lines 45–59 of `use-webhooks.ts`):
```typescript
export function useDatasetsQueryOptions(opts?: { enabled?: boolean }) {
  const { client, tenant } = useFarsightContext()
  const ready = !!tenant.orgSlug && !!tenant.projectSlug  // D-02 guard — NEVER omit
  return queryOptions({
    queryKey: datasetKeys.list(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
    queryFn: (): Promise<DatasetListResponse> =>
      (client.datasets.list as AnyFn)({
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

**Server-confirmed delete mutation** (lines 144–158 of `use-webhooks.ts`):
```typescript
export function useDeleteDatasetMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      (client.datasets.delete as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
      }),
    // No onMutate — server-confirmed
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: datasetKeys.all(tenant.orgSlug ?? "", tenant.projectSlug ?? ""),
      }),
  })
}
```

**Search mutation** (no webhook analog — use this shape):
```typescript
export function useSearchDatasetMutation() {
  const { client, tenant } = useFarsightContext()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { query: string; topK?: number } }) =>
      (client.datasets.search as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, id },
        body,
      }),
    // No invalidation — search is stateless
  })
}
```

---

### `packages/ui/src/hooks/use-workflows.ts` (hook, request-response + CRUD)

**Analog:** `packages/ui/src/hooks/use-webhooks.ts`

Identical seam pattern to datasets. Key differences: `wfSlug` (not `id`) for the detail key; `update` returns a new `PipelineDefinition` version; `run` returns `{ runId, status, workflowId, version }`.

**Key factory:**
```typescript
export const workflowKeys = {
  all: (orgSlug: string, projectSlug: string) =>
    ["workflows", orgSlug, projectSlug] as const,
  list: (orgSlug: string, projectSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), "list"] as const,
  detail: (orgSlug: string, projectSlug: string, wfSlug: string) =>
    [...workflowKeys.all(orgSlug, projectSlug), wfSlug] as const,
}
```

**Update mutation (PATCH definition → new version):**
```typescript
export function useUpdateWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ wfSlug, body }: { wfSlug: string; body: { name?: string; definition?: PipelineDefinition; active?: boolean } }) =>
      (client.workflows.update as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, wfSlug },
        body,
      }),
    // No onMutate — definition version creation is server-confirmed
    onSettled: (_data, _err, vars) =>
      qc.invalidateQueries({
        queryKey: workflowKeys.detail(tenant.orgSlug ?? "", tenant.projectSlug ?? "", vars.wfSlug),
      }),
  })
}
```

**Run mutation (fire-and-forget, 202 Accepted):**
```typescript
export function useRunWorkflowMutation() {
  const { client, tenant } = useFarsightContext()
  return useMutation({
    mutationFn: (wfSlug: string) =>
      (client.workflows.run as AnyFn)({
        params: { slug: tenant.orgSlug!, projectSlug: tenant.projectSlug!, wfSlug },
      }),
    // No invalidation — no polling endpoint in Phase-4 contracts
  })
}
```

---

### `packages/ui/src/hooks/use-agents.ts` (hook, event-driven polling + mutation)

**Analog:** `packages/ui/src/hooks/use-notifications.ts`

Agents is polling-based (2s interval) like notifications (10s). Key difference: no `orgSlug`/`projectSlug` in agent keys — `agentDefinitionId` is consumer-provided, not tenant-derived.

**Imports pattern** (lines 1–16 of `use-notifications.ts`):
```typescript
// No "use client" on hook files
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>
```

**Key factory (no org/project scope — agent is ID-scoped):**
```typescript
export const agentKeys = {
  messages: (agentDefinitionId: string, chatId?: string) =>
    ["agents", agentDefinitionId, chatId ?? "default", "messages"] as const,
}
```

**Polling queryOptions** (mirror `use-notifications.ts` lines 44–69):
```typescript
export function useAgentMessagesQueryOptions(agentDefinitionId: string, chatId?: string) {
  const { client } = useFarsightContext()
  return queryOptions({
    queryKey: agentKeys.messages(agentDefinitionId, chatId),
    queryFn: () =>
      (client.agents.messages as AnyFn)({
        params: { agentDefinitionId },
        query: chatId ? { chatId } : undefined,
      }),
    refetchInterval: 2_000,               // 2s poll (D-07 → tighter for chat UX)
    refetchIntervalInBackground: false,   // pauses when tab hidden
    staleTime: 1_000,
    enabled: !!agentDefinitionId,
  })
}
```

**Submit mutation (then invalidate with returned chatId):**
```typescript
export function useSubmitAgentMessage(agentDefinitionId: string) {
  const { client } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { message: string; chatId?: string }) =>
      (client.agents.submit as AnyFn)({ params: { agentDefinitionId }, body }),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: agentKeys.messages(agentDefinitionId, data.chatId),
      }),
  })
}
```

---

### `packages/ui/src/components/datasets/dataset-list.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/webhooks/webhook-list.tsx`

Copy the entire structure: `"use client"` directive, `useQuery(queryOptions)`, three-branch loading/error/data, `ConfirmDialog` for delete, `onNavigate` callback prop instead of `useRouter`.

**Full component shell** (lines 1–30 of `webhook-list.tsx`):
```typescript
"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Database, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ListSkeleton } from "../page/list-skeleton"
import { EmptyState } from "../page/empty-state"
import { ErrorState } from "../page/error-state"
import { ConfirmDialog } from "../page/confirm-dialog"
import { DataTable } from "../data-table/data-table"
import { DataTableToolbar } from "../data-table/data-table-toolbar"
import { useDataTable } from "../../hooks/use-data-table"
import { useDatasetsQueryOptions, useDeleteDatasetMutation } from "../../hooks/use-datasets"
import { useTenant } from "../../provider/use-tenant"
import { cn } from "../../lib/utils"

export type DatasetListProps = {
  onNavigate?: (href: string) => void   // consumer owns routing — NEVER useRouter
  className?: string
}
```

**No-project guard and three-branch pattern** (lines 157–198 of `webhook-list.tsx`):
```typescript
export function DatasetList({ onNavigate, className }: DatasetListProps) {
  const tenant = useTenant()
  const queryOptions = useDatasetsQueryOptions()
  const { data, isLoading, isError, refetch } = useQuery(queryOptions)
  const deleteMutation = useDeleteDatasetMutation()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Dataset | null>(null)

  // D-02: no project selected — render EmptyState, query is disabled
  if (!tenant.projectSlug) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project to view its datasets."
        icon={FolderOpen}
      />
    )
  }

  if (isLoading) return <ListSkeleton count={5} />

  if (isError) {
    return (
      <ErrorState
        title="Could not load datasets"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }
  // ... data branch + ConfirmDialog (see webhook-list.tsx lines 241–292)
}
```

**Column definitions (Farsight Dataset shape — rebuild, do NOT port Helm columns):**
```typescript
// Source: Helm app/datasets/datasets-client.tsx lines 142–230 for column ColumnDef pattern
// Replace Helm DatasetRow fields with Farsight Dataset fields:
//   source → kind (raw/derived/eval), rowCount → recordCount, remove columnSchemaJson
const columns = React.useMemo<ColumnDef<Dataset>[]>(() => [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" label="Name" />,
    cell: ({ row }) => (
      <button
        className="text-sm font-medium text-left hover:underline"
        onClick={() => onNavigate?.(`/datasets/${row.original.id}`)}
      >
        {row.original.name}
      </button>
    ),
  },
  {
    id: "kind",
    accessorKey: "kind",
    cell: ({ row }) => <Badge variant="outline" className="capitalize text-xs">{row.original.kind}</Badge>,
  },
  {
    id: "recordCount",
    accessorKey: "recordCount",
    cell: ({ row }) => <span className="tabular-nums">{row.original.recordCount.toLocaleString()}</span>,
  },
  // searchBackend badge, vectorizeStatus badge, createdAt — per UI-SPEC color contract
], [onNavigate])
```

---

### `packages/ui/src/components/datasets/dataset-detail.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/notifications/notification-inbox.tsx`

Copy `"use client"`, `useQuery`, loading/error/data three-branch. The back-navigation is a prop callback, not Link.

**Back navigation pattern (decoupled from next/link):**
```typescript
// Anti-pattern (Helm app/pipelines/[id]/pipeline-detail-client.tsx line 5):
// import Link from "next/link"
// <Link href="/datasets">Back</Link>

// Correct pattern for packages/ui:
export type DatasetDetailProps = {
  datasetId: string
  backHref?: string
  onNavigate?: (href: string) => void   // consumer provides route handling
}
// ...
<Button variant="ghost" size="sm" onClick={() => onNavigate?.(backHref ?? "/datasets")}>
  <ChevronLeft className="h-4 w-4 mr-1" />Back to datasets
</Button>
```

---

### `packages/ui/src/components/datasets/dataset-search.tsx` (component, mutation)

**Analog:** mutation pattern from `packages/ui/src/components/webhooks/webhook-list.tsx` lines 200–238 (server-confirmed mutation, no optimistic update), combined with the discriminated-union result rendering from 04-RESEARCH.md.

**Key patterns:**
```typescript
"use client"

export function DatasetSearch({ datasetId }: { datasetId: string }) {
  const [query, setQuery] = React.useState("")
  const searchMutation = useSearchDatasetMutation()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate({ id: datasetId, body: { query } })
  }

  // Discriminated-union result rendering — branch on result.backend
  const result = searchMutation.data
  return (
    <form className="flex gap-2" onSubmit={handleSearch}>
      <Label className="sr-only">Search query</Label>
      <Input type="search" placeholder="Search dataset..." className="flex-1" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button type="submit" disabled={searchMutation.isPending}>
        {searchMutation.isPending ? "Searching..." : "Search dataset"}
      </Button>
    </form>
    // result branches: 'vectorize' → score Progress bar; 'none' → snippet text; 'ai_search' → key+score
    // indexingPending notice: <AlertTriangle> + amber bg per UI-SPEC
  )
}
```

---

### `packages/ui/src/components/pipelines/workflow-list.tsx` (component, request-response)

**Analog:** `packages/ui/src/components/webhooks/webhook-list.tsx`

Identical structure. The list item is a row with name + slug + active badge + version + open-canvas button. Row click triggers `onNavigate`.

**List card row pattern** (from `webhook-list.tsx` line 252, adapted):
```typescript
<div className="rounded-lg border bg-card divide-y divide-border">
  {workflows.map((wf) => (
    <div key={wf.id} className="flex items-center justify-between px-4 py-2 gap-4">
      <div>
        <p className="text-sm font-medium">{wf.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{wf.slug}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Badge variant={wf.active ? "outline" : "secondary"}
               className={wf.active ? "text-primary border-primary/30" : ""}>
          {wf.active ? "Active" : "Inactive"}
        </Badge>
        <span className="text-xs text-muted-foreground">v{wf.activeVersion ?? "—"}</span>
        <Button variant="ghost" size="icon" onClick={() => onNavigate?.(`/pipelines/${wf.slug}`)}
                aria-label="Open pipeline canvas">
          <Workflow className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ))}
</div>
```

---

### `packages/ui/src/components/pipelines/workflow-canvas.tsx` (component, CRUD + event-driven)

**Analog:** `app/pipelines/[id]/pipeline-detail-client.tsx` (source of behavior/markup to decouple from Next.js)

**Critical decoupling work vs Helm source:**
- Remove `Link from "next/link"` → `onBack?: () => void` prop
- Remove `apiFetch('/api/pipelines/:id/canvas', PUT)` → `useUpdateWorkflowMutation`
- Remove `apiFetch('/api/pipelines/:id/run', POST)` → `useRunWorkflowMutation`
- Remove `import '@xyflow/react/dist/style.css'` from the component → CSS goes in consumer global CSS only (D-09 / Pitfall 5)
- Replace `stroke: "#266DF0"` edge style → `stroke: 'var(--color-primary)'`

**xyflow wiring pattern** (from `app/agents/[id]/agent-canvas-client.tsx` lines 1–47):
```typescript
// agent-canvas-client.tsx wraps with ReactFlowProvider — replicate in CanvasFlow
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, type Node, type Edge, type NodeTypes,
} from '@xyflow/react'
// NOTE: DO NOT import '@xyflow/react/dist/style.css' here
// Consumer's global index.css handles this (see Shared Patterns)

export function WorkflowCanvas({ wfSlug, onBack }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerWorkflowCanvas wfSlug={wfSlug} onBack={onBack} />
    </ReactFlowProvider>
  )
}
```

**PipelineDefinition ↔ xyflow adapter** (pure functions, no analog — use RESEARCH.md pattern):
```typescript
// packages/ui/src/components/pipelines/pipeline-adapter.ts
import type { PipelineDefinition, PipelineNode as FPipelineNode } from '@farsight/contracts'
import type { Node, Edge } from '@xyflow/react'

// Farsight PipelineNode → xyflow Node
export function toFlowNode(pn: FPipelineNode): Node {
  return {
    id: pn.id,
    type: nodeTypeFor(pn.type),  // maps Farsight NodeId string → canvas nodeTypes key
    position: pn.position ?? { x: 0, y: 0 },
    data: { type: pn.type, parameters: pn.parameters, name: pn.name, disabled: pn.disabled },
  }
}

// xyflow state → Farsight PipelineDefinition (assembled on Save)
export function toDefinition(
  nodes: Node[], edges: Edge[],
  // schemaVersion is NOT in the Pick — always hardcoded literal 1 below (Pitfall 2); never caller-supplied
  meta: Pick<PipelineDefinition, 'name' | 'trigger'>
): PipelineDefinition {
  return {
    ...meta,
    schemaVersion: 1,  // ALWAYS literal 1 — server rejects anything else (Pitfall 2)
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.type as string,   // Must be valid Farsight NodeId (Pitfall 3)
      name: n.data.name as string | undefined,
      parameters: (n.data.parameters ?? {}) as Record<string, unknown>,
      position: n.position,
      disabled: (n.data.disabled ?? false) as boolean,
    })),
    edges: edges.map((e) => ({
      from: e.source, fromPort: 'main',  // always 'main' in v1
      to: e.target,   toPort: 'main',
    })),
    staticData: {},
  }
}
```

---

### `packages/ui/src/components/pipelines/nodes/source-node.tsx` (and transform-node, sink-node)

**Analog:** `app/pipelines/[id]/pipeline-node.tsx` + `components/canvas/flow-node.tsx` for node anatomy.

**Node inner structure from `components/canvas/flow-node.tsx` lines 64–122 (adapt, drop hardcoded hex colors):**
```typescript
// flow-node.tsx line 85–86 — ANTI-PATTERN to fix:
// className="!bg-primary !border-2 !border-background"  ← use token, not hardcoded hex

// Correct pattern for canvas-kit nodes:
import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'
import { cn } from '../../lib/utils'

export const SourceNode = memo(({ data, selected }: { data: PipelineNodeData; selected?: boolean }) => (
  <div className={cn(
    "relative rounded-lg border-2 bg-card w-[200px] shadow-sm transition-all",
    "border-border",           // default border token — not hardcoded
    selected && "ring-2 ring-primary",
    data.disabled && "opacity-50 pointer-events-none",
  )}>
    {/* Accent strip — source = chart-1 */}
    <div className="h-1 rounded-t-lg bg-[var(--color-chart-1)]" />
    <Handle type="target" position={Position.Left}
            className="!bg-primary !border-primary" />
    <div className="p-2">
      <div className="text-xs font-medium truncate">{data.name ?? "Source"}</div>
      <code className="text-[10px] text-muted-foreground font-mono truncate block">{data.type}</code>
    </div>
    <Handle type="source" position={Position.Right}
            className="!bg-primary !border-primary" />
  </div>
))
```

---

### `packages/ui/src/components/pipelines/node-ids.ts` (config)

**No analog** — new constants file. Use this structure:
```typescript
// MVP node-type subset for Phase 4 canvas (D-08)
// These NodeId strings must match the live Farsight node registry.
// Pattern: /^[a-z][a-z0-9._-]*@\d+\.\d+\.\d+$/ (Pitfall 3)
// FIXME: verify actual NodeId strings against Farsight API before executing
export const NODE_IDS = {
  SOURCE_DATASET: "core.source.dataset@1.0.0",
  TRANSFORM_FILTER: "core.transform.filter@1.0.0",
  SINK_DATASET: "core.sink.dataset@1.0.0",
} as const

// Maps Farsight NodeId → xyflow nodeTypes key (used by toFlowNode)
export function nodeTypeFor(farsightNodeId: string): string {
  if (farsightNodeId.startsWith("core.source.")) return "source"
  if (farsightNodeId.startsWith("core.transform.")) return "transform"
  if (farsightNodeId.startsWith("core.sink.")) return "sink"
  return "source"  // fallback
}
```

---

### `packages/ui/src/components/canvas-kit/canvas-flow.tsx` (component, xyflow shell)

**Analog (partial):** `app/agents/[id]/agent-canvas-client.tsx` lines 1–47 (xyflow provider wiring, decouple from Next/apiFetch).

**What to extract:**
```typescript
"use client"

import { ReactFlow, ReactFlowProvider, type NodeTypes, type EdgeTypes } from '@xyflow/react'
// DO NOT import '@xyflow/react/dist/style.css' — goes in consumer global CSS only

export type CanvasFlowProps = {
  nodeTypes: NodeTypes
  edgeTypes?: EdgeTypes
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onDrop?: (event: React.DragEvent) => void
  onDragOver?: (event: React.DragEvent) => void
  fitView?: boolean
  children?: React.ReactNode  // for Background, Controls, MiniMap, Palette, Inspector slots
}

export function CanvasFlow(props: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full" aria-label="Pipeline canvas">
        <ReactFlow {...props}>
          {props.children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
```

---

### `packages/ui/src/components/canvas-kit/canvas-palette.tsx` (component)

**Analog:** `components/canvas/palette.tsx` (port verbatim, decouple from Helm-specific types).

**Drag-start pattern** (lines 108–116 of `palette.tsx`):
```typescript
// palette.tsx lines 108–116 — copy drag-to-canvas pattern:
onDragStart={(event) => {
  const payload = JSON.stringify({ kind: item.kind, type: item.type, label: item.label });
  event.dataTransfer.setData("application/farsight-palette", payload);  // rename data key
  event.dataTransfer.effectAllowed = "move";
  onDragStart?.(item);
}}

// Plus keyboard-accessible Enter/Space alternative (new in Phase 4, no Helm analog):
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    onAddNode?.(item.type)  // adds node at canvas center — required a11y alternative
  }
}}
```

---

### `packages/ui/src/components/canvas-kit/auto-layout.ts` (utility, transform)

**Analog:** `components/canvas/auto-layout.ts` — **port verbatim**. Pure function, no Next.js coupling, no imports to change.

```typescript
// Copy exactly from components/canvas/auto-layout.ts (all 35 lines)
// Change nothing — the dagre API and Node/Edge types from @xyflow/react are identical
import dagre from "dagre"
import type { Node, Edge } from "@xyflow/react"

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] { /* ... */ }
```

---

### `packages/ui/src/components/agents/agent-chat-view.tsx` (component, event-driven polling)

**Analog:** `packages/ui/src/components/notifications/notification-inbox.tsx`

This is the closest match — both poll on an interval, show loading/error/empty, and render a list of items. The key structural difference is the chat composer at the bottom.

**Shell from `notification-inbox.tsx` lines 1–123 (adapt):**
```typescript
"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { MessageCircle, Bot, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { ScrollArea } from "../ui/scroll-area"
import { Skeleton } from "../ui/skeleton"
import { ErrorState } from "../page/error-state"
import { EmptyState } from "../page/empty-state"
import { AgentMessage } from "./agent-message"
import { useAgentMessagesQueryOptions, useSubmitAgentMessage } from "../../hooks/use-agents"

export type AgentChatViewProps = {
  agentDefinitionId: string
  agentLabel?: string
  chatId?: string
  interval?: number | false  // polling interval, default 2000
}

export function AgentChatView({ agentDefinitionId, agentLabel, chatId, interval }: AgentChatViewProps) {
  const queryOptions = useAgentMessagesQueryOptions(agentDefinitionId, chatId)
  const { data, isLoading, isError, refetch, isFetching } = useQuery(queryOptions)
  const submitMutation = useSubmitAgentMessage(agentDefinitionId)
  const [message, setMessage] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const messages = data?.messages ?? []

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    submitMutation.mutate({ message, chatId }, {
      onError: () => toast.error("Could not send message. Try again."),
    })
    setMessage("")
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2 flex-shrink-0">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-base font-medium">{agentLabel ?? agentDefinitionId}</h2>
        {isFetching && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
        <span className="sr-only" aria-live="polite">{isFetching ? "New messages" : ""}</span>
      </div>

      {/* Message list — mirrors notification-inbox.tsx lines 81–119 */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div role="log" aria-label="Chat messages" aria-live="polite" className="p-4 space-y-2">
          {isLoading ? (
            /* 3 skeleton rows per UI-SPEC */
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          ) : isError ? (
            <ErrorState title="Could not load messages" description="Check your connection and try again." onRetry={refetch} />
          ) : messages.length === 0 ? (
            <EmptyState title="Start a conversation" description="Send a message to begin." icon={MessageCircle} />
          ) : (
            messages.map((msg) => <AgentMessage key={msg.id} message={msg} />)
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-card px-4 py-2 flex-shrink-0">
        <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
          <Textarea
            placeholder="Message the agent..."
            className="flex-1 min-h-[80px] resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit(e as any) }}
            aria-label="Message input"
            aria-describedby="composer-hint"
          />
          <span id="composer-hint" className="sr-only">Press Ctrl+Enter to send</span>
          <Button type="submit" size="icon" disabled={!message.trim() || submitMutation.isPending}
                  aria-label="Send message" className="flex-shrink-0 self-end">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

---

### `packages/ui/src/components/agents/agent-message.tsx` (component)

**Analog:** `packages/ui/src/components/notifications/notification-item.tsx` (single item row component pattern).

**Role-based bubble pattern (no analog — use UI-SPEC):**
```typescript
"use client"

import { cn } from "../../lib/utils"
import { Bot } from "lucide-react"

type AgentMessagePart = { type: string; text?: string }
type Message = { id: string; role: "user" | "assistant" | "system"; parts: AgentMessagePart[]; createdAt?: string }

export function AgentMessage({ message }: { message: Message }) {
  const { role, parts } = message

  if (role === "system") {
    return <p className="text-xs text-muted-foreground italic text-center my-2 px-4">
      {parts.filter(p => p.type === "text").map(p => p.text).join("")}
    </p>
  }

  return (
    <article
      aria-label={`${role} message`}
      className={cn("flex items-end gap-2 mb-2", role === "user" ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      {role === "user"
        ? <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium flex-shrink-0">U</div>
        : <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-muted-foreground" /></div>
      }
      {/* Bubble */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2",
        role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
      )}>
        {parts.filter(p => p.type === "text").map((p, i) => (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{p.text}</p>
          // Never dangerouslySetInnerHTML — XSS via agent response content (RESEARCH.md security)
        ))}
      </div>
    </article>
  )
}
```

---

### `packages/ui/src/index.ts` (modified — barrel registration)

**Analog:** Current `packages/ui/src/index.ts` lines 58–96 (Phase-3 hook + surface + provider block pattern).

**Block to append** (mirror Phase-3 block structure exactly):
```typescript
// Dataset hooks (Phase 4)
export { datasetKeys, useDatasetsQueryOptions, useDatasetQueryOptions, useDatasetRecordsQueryOptions, useDeleteDatasetMutation, useSearchDatasetMutation } from './hooks/use-datasets'

// Dataset surfaces (Phase 4)
export { DatasetList } from './components/datasets/dataset-list'
export type { DatasetListProps } from './components/datasets/dataset-list'
export { DatasetDetail } from './components/datasets/dataset-detail'
export type { DatasetDetailProps } from './components/datasets/dataset-detail'
export { DatasetRecords } from './components/datasets/dataset-records'
export { DatasetSearch } from './components/datasets/dataset-search'

// Workflow (pipeline) hooks (Phase 4)
export { workflowKeys, useWorkflowsQueryOptions, useWorkflowQueryOptions, useCreateWorkflowMutation, useUpdateWorkflowMutation, useRunWorkflowMutation, useDeleteWorkflowMutation } from './hooks/use-workflows'

// Workflow (pipeline) surfaces (Phase 4)
export { WorkflowList } from './components/pipelines/workflow-list'
export type { WorkflowListProps } from './components/pipelines/workflow-list'
export { WorkflowCanvas } from './components/pipelines/workflow-canvas'
export type { WorkflowCanvasProps } from './components/pipelines/workflow-canvas'
export { WorkflowRunView } from './components/pipelines/workflow-run-view'
export { toFlowNode, toDefinition } from './components/pipelines/pipeline-adapter'
export { NODE_IDS, nodeTypeFor } from './components/pipelines/node-ids'

// Canvas-kit (Phase 4)
export { CanvasFlow } from './components/canvas-kit/canvas-flow'
export type { CanvasFlowProps } from './components/canvas-kit/canvas-flow'
export { CanvasBackground } from './components/canvas-kit/canvas-background'
export { CanvasControls } from './components/canvas-kit/canvas-controls'
export { CanvasMiniMap } from './components/canvas-kit/canvas-minimap'
export { CanvasPanel } from './components/canvas-kit/canvas-panel'
export { CanvasInspector } from './components/canvas-kit/canvas-inspector'
export { CanvasPalette } from './components/canvas-kit/canvas-palette'
export type { PaletteItem } from './components/canvas-kit/canvas-palette'
export { autoLayout } from './components/canvas-kit/auto-layout'

// Agent hooks (Phase 4)
export { agentKeys, useAgentMessagesQueryOptions, useSubmitAgentMessage } from './hooks/use-agents'

// Agent surfaces (Phase 4)
export { AgentChatView } from './components/agents/agent-chat-view'
export type { AgentChatViewProps } from './components/agents/agent-chat-view'
export { AgentMessage } from './components/agents/agent-message'
```

**CRITICAL:** Every new file added to `packages/ui/src/` MUST be registered here or it vanishes from the dist public API (see project memory: "tsdown barrel-export trap").

---

### `packages/ui/__tests__/hooks/use-datasets.test.ts` (test)

**Analog:** `packages/ui/__tests__/hooks/use-webhooks.test.tsx` — **copy structure exactly**.

**Full test structure** (lines 1–52 of `use-webhooks.test.tsx`):
```typescript
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { datasetKeys, useDatasetsQueryOptions } from "../../src/hooks/use-datasets"
import { TestProvider } from "../helpers/test-provider"

describe("useDatasets — DSET-01", () => {
  it("datasetKeys.list includes orgSlug and projectSlug", () => {
    const key = datasetKeys.list("my-org", "my-project")
    expect(key).toContain("my-org")
    expect(key).toContain("my-project")
    expect(Array.isArray(key)).toBe(true)
  })

  it("datasetKeys.list different org/project → different key", () => {
    const keyA = datasetKeys.list("org-a", "project-a")
    const keyB = datasetKeys.list("org-b", "project-b")
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB))
  })

  it("useDatasetsQueryOptions disabled when projectSlug is null", () => {
    const { result } = renderHook(() => useDatasetsQueryOptions(), {
      wrapper: ({ children }) => (
        <TestProvider orgSlug="my-org" projectSlug={null}>{children}</TestProvider>
      ),
    })
    expect(result.current.enabled).toBe(false)
  })

  it("useDatasetsQueryOptions enabled when orgSlug and projectSlug present", () => {
    const { result } = renderHook(() => useDatasetsQueryOptions(), {
      wrapper: ({ children }) => (
        <TestProvider orgSlug="my-org" projectSlug="my-project">{children}</TestProvider>
      ),
    })
    expect(result.current.enabled).toBe(true)
  })
})
```

---

### `packages/ui/__tests__/components/datasets.test.tsx` (test)

**Analog:** `packages/ui/__tests__/components/webhook-list.test.tsx` — **copy fixture + QC seeding pattern**.

```typescript
// Copy the fixture factory + freshQCWithData pattern (lines 29–55 of webhook-list.test.tsx):
function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    id: "ds_aaaaaaaaaaaaaaaa",
    projectId: "proj_1",
    name: "Test Dataset",
    kind: "raw",
    searchBackend: "none",
    recordCount: 42,
    vectorizeStatus: "none",
    aiSearchStatus: "none",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function freshQCWithData(items: Dataset[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: Infinity }, mutations: { retry: 0 } } })
  qc.setQueryData(datasetKeys.list(TEST_ORG, TEST_PROJECT), { items, nextCursor: undefined, hasMore: false })
  return qc
}
```

---

### `packages/ui/__tests__/smoke/workflow-canvas.smoke.test.tsx` (test)

**Analog:** `packages/ui/__tests__/smoke/page-primitives.smoke.test.tsx` (jsdom render-smoke pattern).

**jsdom assertions for xyflow (from RESEARCH.md §xyflow render-smoke):**
```typescript
// xyflow renders SVG in real browser; in jsdom assert DOM presence, not visual correctness
it("WorkflowCanvas renders ReactFlow container in DOM", () => {
  const { container } = render(<WorkflowCanvas wfSlug="test-wf" />, {
    wrapper: ({ children }) => (
      <TestProvider orgSlug="test-org" projectSlug="test-project">{children}</TestProvider>
    ),
  })
  // Assert container div exists (not edge visibility — that's the Vite app's job)
  expect(container.querySelector('.react-flow')).not.toBeNull()
})

it("WorkflowCanvas with seeded nodes renders node elements in DOM", () => {
  // Pre-seed QC with a workflow + definition containing 2 nodes
  const qc = freshQCWithWorkflow({ nodes: [makeNode("n1"), makeNode("n2")], edges: [] })
  const { container } = render(<WorkflowCanvas wfSlug="test-wf" />, {
    wrapper: ({ children }) => <TestProvider queryClient={qc}>{children}</TestProvider>,
  })
  // react-flow__node elements exist with data-id matching input nodes
  const nodeEls = container.querySelectorAll('.react-flow__node')
  expect(nodeEls.length).toBe(2)
})
```

---

### `examples/farsight-ui-consumer/package.json` (config)

**Analog:** `packages/ui/package.json` (exports pattern) + Phase-3 workspace link mechanism.

```json
{
  "name": "@farsight/ui-consumer-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @farsight/ui build && vite",
    "build": "pnpm --filter @farsight/ui build && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@farsight/ui": "workspace:*",
    "@clerk/react": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@xyflow/react": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^1.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.x",
    "@vitejs/plugin-react": "^4.x",
    "vite": "^6.x"
  }
}
```

**Root `pnpm-workspace.yaml` addition** (mirror Phase-3 `packages/ui/pnpm-workspace.yaml` lines 1–4):
```yaml
# In helm root pnpm-workspace.yaml — add examples/ package:
packages:
  - 'packages/*'
  - 'examples/*'              # add this line to resolve workspace:* for the examples app
```

---

### `examples/farsight-ui-consumer/src/index.css` (config)

**No in-repo analog** — the CSS import order is the D-09 locked contract. Use exactly:

```css
@import "tailwindcss";
@import "@farsight/ui/theme.css";          /* tokens + @source — but @source path may be stale after dist build */
@import "@xyflow/react/dist/style.css";    /* MUST come AFTER tailwindcss reset (D-09 / Pitfall 5) */

/* R-05: @source fix — theme.css @source path breaks in dist. Add explicit @source: */
@source "../../../packages/ui/src";        /* workspace-relative monorepo dev path */
/* For published npm consumers: @source "./node_modules/@farsight/ui/dist" */
```

---

## Shared Patterns

### "use client" placement
**Source:** All Phase-3 component files (e.g., `packages/ui/src/components/webhooks/webhook-list.tsx` line 1)
**Apply to:** All `.tsx` component files in `components/datasets/`, `components/pipelines/`, `components/agents/`, `components/canvas-kit/` that use hooks.
**Do NOT apply to:** Hook files (`hooks/use-*.ts`), utility files (`pipeline-adapter.ts`, `auto-layout.ts`), `index.ts` barrel files, `node-ids.ts`.

```typescript
"use client"  // FIRST LINE of every component file that calls useState/useQuery/etc.
```

### AnyFn SDK cast workaround
**Source:** `packages/ui/src/hooks/use-webhooks.ts` lines 34–35
**Apply to:** All three new hook files (`use-datasets.ts`, `use-workflows.ts`, `use-agents.ts`)

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>
// Usage: (client.datasets.list as AnyFn)({ params: { ... } })
```

### `useFarsightContext()` over separate hooks
**Source:** `packages/ui/src/hooks/use-webhooks.ts` line 38 + `use-notifications.ts` line 17
**Apply to:** All new hook files.

```typescript
// Use useFarsightContext() (returns { client, tenant }) not useApiClient() + useTenant() separately
const { client, tenant } = useFarsightContext()
// Then: client.datasets.list, tenant.orgSlug, tenant.projectSlug, tenant.userId
```

### `enabled: !!projectSlug` guard
**Source:** `packages/ui/src/hooks/use-webhooks.ts` lines 47–48, 57–58
**Apply to:** All three new hook files — every `queryOptions` for a project-scoped resource.

```typescript
const ready = !!tenant.orgSlug && !!tenant.projectSlug  // D-02 guard
return queryOptions({
  // ...
  enabled: (opts?.enabled ?? true) && ready,   // NEVER skip this
})
```

### onMutate → rollback optimistic pattern
**Source:** `packages/ui/src/hooks/use-webhooks.ts` lines 86–116 (`useUpdateWebhookMutation`)
**Apply to:** `useUpdateWorkflowMutation` if optimistic save is desired (Phase 4 uses server-confirmed save — only apply if explicitly scoped to optimistic).

```typescript
onMutate: async (vars) => {
  await qc.cancelQueries({ queryKey: key })
  const prev = qc.getQueryData(key)
  qc.setQueryData(key, (old) => { /* apply optimistic delta */ })
  return { prev }  // snapshot for rollback
},
onError: (_err, _vars, ctx) => {
  if (ctx?.prev) qc.setQueryData(key, ctx.prev)
},
onSettled: () => qc.invalidateQueries({ queryKey: key }),
```

### `data-slot` attribute on component root
**Source:** `packages/ui/src/components/webhooks/webhook-list.tsx` line 242
**Apply to:** All new surface component root `<div>` elements (for testing + style hooks).

```typescript
<div data-slot="dataset-list" className={cn("space-y-4", className)}>
<div data-slot="workflow-list" className={cn("", className)}>
<div data-slot="agent-chat-view" className="flex flex-col h-full bg-background">
```

### Named exports only (no default exports)
**Source:** All Phase-3 hook and component files
**Apply to:** Every new file.

```typescript
// Correct:
export function DatasetList(...) { ... }
export function useDatasetsQueryOptions(...) { ... }

// NEVER:
export default function DatasetList(...) { ... }
```

### Relative import depth in packages/ui/src/
**Source:** `packages/ui/src/components/webhooks/webhook-list.tsx` lines 26–28
**Apply to:** All new component files.

```typescript
// From components/datasets/dataset-list.tsx:
import { useDatasetsQueryOptions } from "../../hooks/use-datasets"  // up 2 dirs
import { useTenant } from "../../provider/use-tenant"               // up 2 dirs
import { EmptyState } from "../page/empty-state"                    // up 1 dir, sibling
import { cn } from "../../lib/utils"                                // up 2 dirs
// NEVER: import { ... } from "@farsight/ui" (circular) or absolute paths
```

### No router imports in library code
**Source:** `packages/ui/src/components/notifications/notification-inbox.tsx` line 29 (onNavigate prop)
**Apply to:** All new surface components.

```typescript
// ANTI-PATTERN (from app/datasets/datasets-client.tsx lines 5, 248):
// import { useRouter } from "next/navigation"
// router.push(`/datasets/${id}`)

// CORRECT in packages/ui:
export type DatasetListProps = { onNavigate?: (href: string) => void }
// Usage: onNavigate?.(`/datasets/${row.original.id}`)
```

### `confirm()` → `ConfirmDialog` for destructive actions
**Source:** `packages/ui/src/components/webhooks/webhook-list.tsx` lines 148–156, 264–291
**Apply to:** Dataset delete in `DatasetList`.

```typescript
// ANTI-PATTERN (from app/datasets/datasets-client.tsx line 131):
// if (!confirm("Delete this dataset and all its rows?")) return

// CORRECT:
const [deleteOpen, setDeleteOpen] = React.useState(false)
// ... <ConfirmDialog open={deleteOpen} ... destructive={true} />
```

### Token colors instead of hardcoded hex
**Source:** `packages/ui/src/components/canvas-kit/canvas-background.tsx` (to be written)
**Apply to:** All canvas-kit and pipeline node components.

```typescript
// ANTI-PATTERN (from components/canvas/flow-node.tsx — the Helm source uses hardcoded colors):
// "border-blue-500/60 text-blue-300 bg-blue-500/10"  ← Tailwind color names = hardcoded
// stroke: "#266DF0"                                   ← explicit hex (RESEARCH.md anti-pattern)

// CORRECT in canvas-kit:
// Use CSS variable tokens from theme.css:
// stroke: 'var(--color-primary)'          — edges
// stroke: 'var(--color-border)'           — default edges
// className="border-border"               — node border
// className="ring-primary"                — selected node ring
// "bg-[var(--color-chart-1)]"             — source node accent strip
```

### Index barrel for each surface directory
**Source:** `packages/ui/src/components/webhooks/` (contains `index.ts` that re-exports)
**Apply to:** `components/datasets/index.ts`, `components/pipelines/index.ts`, `components/agents/index.ts`, `components/canvas-kit/index.ts`

```typescript
// components/datasets/index.ts
export { DatasetList } from './dataset-list'
export type { DatasetListProps } from './dataset-list'
export { DatasetDetail } from './dataset-detail'
// ... etc. — mirrors components/webhooks/index.ts structure
```

---

## No Analog Found

Files with no close match in the codebase (planner uses RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/ui/src/components/pipelines/node-ids.ts` | config | — | Constants file for Farsight NodeId strings; no precedent in packages/ui |
| `packages/ui/src/components/pipelines/pipeline-adapter.ts` | utility | transform | PipelineDefinition↔xyflow bidirectional adapter is new; Helm uses a DB schema, not the Farsight contract |
| `examples/farsight-ui-consumer/vite.config.ts` | config | — | No Vite app exists in this repo; use standard @tailwindcss/vite + @vitejs/plugin-react setup |
| `examples/farsight-ui-consumer/src/App.tsx` | component | — | No Vite app shell exists; scaffold from scratch with FarsightProvider + ClerkProvider wrapper |
| `examples/farsight-ui-consumer/src/index.css` | config | — | CSS import order contract is documented (D-09), no in-repo analog |

---

## Metadata

**Analog search scope:**
- `packages/ui/src/hooks/` — Phase-3 hook templates (primary)
- `packages/ui/src/components/webhooks/` + `notifications/` — Phase-3 component templates (primary)
- `app/datasets/datasets-client.tsx`, `app/pipelines/[id]/pipeline-detail-client.tsx`, `app/agents/[id]/agent-canvas-client.tsx` — Helm port sources (behavior reference, anti-analogs for framework coupling)
- `components/canvas/auto-layout.ts`, `components/canvas/flow-node.tsx`, `components/canvas/palette.tsx` — canvas extraction sources
- `packages/ui/__tests__/hooks/use-webhooks.test.tsx`, `__tests__/components/webhook-list.test.tsx` — test templates (primary)
- `packages/ui/__tests__/smoke/page-primitives.smoke.test.tsx` — jsdom smoke test template
- `packages/ui/__tests__/helpers/` — shared test infrastructure (no changes needed)

**Files scanned:** 22 source files read directly
**Pattern extraction date:** 2026-05-29
