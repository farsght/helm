"use client"
// D-09 / Pitfall 5: xyflow CSS is imported in the consumer's global CSS only (not here).

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { DetailSkeleton } from "../page/detail-skeleton"
import { ErrorState } from "../page/error-state"
import { CanvasFlow } from "../canvas-kit/canvas-flow"
import { CanvasBackground } from "../canvas-kit/canvas-background"
import { CanvasControls } from "../canvas-kit/canvas-controls"
import { CanvasMiniMap } from "../canvas-kit/canvas-minimap"
import { CanvasPalette } from "../canvas-kit/canvas-palette"
import { CanvasInspector } from "../canvas-kit/canvas-inspector"
import { toFlowNode, toDefinition, validatePipelineGraph } from "./pipeline-adapter"
import { NODE_IDS, nodeTypeFor } from "./node-ids"
import { SourceNode } from "./nodes/source-node"
import { TransformNode } from "./nodes/transform-node"
import { SinkNode } from "./nodes/sink-node"
import { WorkflowRunView } from "./workflow-run-view"
import {
  useWorkflowQueryOptions,
  useUpdateWorkflowMutation,
  useRunWorkflowMutation,
} from "../../hooks/use-workflows"
import type { PaletteItem } from "../canvas-kit/canvas-palette"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowCanvasProps = {
  wfSlug: string
  onBack?: () => void
  showMiniMap?: boolean
  className?: string
}

type RunResult = {
  runId: string
  status: "accepted" | "running" | "completed" | "failed" | string
}

// ─── nodeTypes — memoized OUTSIDE render per xyflow docs ─────────────────────
// Defined at module scope to guarantee stable reference across renders.
// MUST NOT be inside the component body (would create new object on each render).

const NODE_TYPES = {
  source: SourceNode,
  transform: TransformNode,
  sink: SinkNode,
} as const

// ─── Palette items ────────────────────────────────────────────────────────────

const PALETTE_ITEMS: PaletteItem[] = [
  { type: NODE_IDS.SOURCE_MANUAL, label: "Source", kind: "source" },
  { type: NODE_IDS.TRANSFORM_SET, label: "Transform", kind: "transform" },
  { type: NODE_IDS.SINK_DATASET, label: "Sink", kind: "sink" },
]

// ─── WorkflowCanvas ───────────────────────────────────────────────────────────

export function WorkflowCanvas({
  wfSlug,
  onBack,
  showMiniMap = true,
  className,
}: WorkflowCanvasProps) {
  const queryOpts = useWorkflowQueryOptions(wfSlug)
  const { data: workflow, isLoading, isError, refetch } = useQuery(queryOpts)

  const updateMutation = useUpdateWorkflowMutation()
  const runMutation = useRunWorkflowMutation()

  const [runResult, setRunResult] = React.useState<RunResult | null>(null)
  const [isDirty, setIsDirty] = React.useState(false)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)

  // ─── xyflow state ────────────────────────────────────────────────────────────
  // Initialised from PipelineDefinition once data loads.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // ─── Sync xyflow state from loaded definition ────────────────────────────────
  React.useEffect(() => {
    if (!workflow?.definition) return
    const flowNodes = workflow.definition.nodes.map(toFlowNode)
    const flowEdges: Edge[] = workflow.definition.edges.map(
      (e: { from: string; to: string }, i: number) => ({
        id: `e-${i}`,
        source: e.from,
        target: e.to,
      })
    )
    setNodes(flowNodes)
    setEdges(flowEdges)
    setIsDirty(false)
  }, [workflow?.definition, setNodes, setEdges])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleNodesChange(changes: Parameters<typeof onNodesChange>[0]) {
    onNodesChange(changes)
    setIsDirty(true)
  }

  function handleEdgesChange(changes: Parameters<typeof onEdgesChange>[0]) {
    onEdgesChange(changes)
    setIsDirty(true)
  }

  function handleConnect(connection: Connection) {
    setEdges((eds) => addEdge(connection, eds))
    setIsDirty(true)
  }

  function handleNodeClick(_event: React.MouseEvent, node: Node) {
    setSelectedNode(node)
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    const raw = event.dataTransfer.getData("application/farsight-palette")
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as { kind: string; type: string; label: string }
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: nodeTypeFor(payload.type),
        position: { x: event.clientX - 100, y: event.clientY - 40 },
        data: {
          type: payload.type,
          parameters: {},
          name: payload.label,
          disabled: false,
        },
      }
      setNodes((nds) => [...nds, newNode])
      setIsDirty(true)
    } catch {
      // Ignore invalid drag payloads
    }
  }

  function handleAddNodeFromPalette(type: string) {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeTypeFor(type),
      position: { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: {
        type,
        parameters: {},
        name: PALETTE_ITEMS.find((i) => i.type === type)?.label ?? "Node",
        disabled: false,
      },
    }
    setNodes((nds) => [...nds, newNode])
    setIsDirty(true)
  }

  function handleSave() {
    if (!workflow) return
    const def = toDefinition(nodes, edges, {
      name: workflow.name,
      trigger: workflow.definition?.trigger ?? { kind: "manual" },
    })
    const errors = validatePipelineGraph(def)
    if (errors.length > 0) {
      toast.error("Pipeline has errors: " + errors.join(", "))
      return
    }
    updateMutation.mutate(
      { wfSlug, body: { definition: def } },
      {
        onSuccess: () => {
          toast.success("Pipeline saved.")
          setIsDirty(false)
        },
        onError: () => {
          toast.error("Could not save pipeline. Try again.")
        },
      }
    )
  }

  function handleRun() {
    runMutation.mutate(wfSlug, {
      onSuccess: (data) => {
        setRunResult({
          runId: (data as { runId: string }).runId,
          status: (data as { status: string }).status,
        })
      },
      onError: () => {
        toast.error("Could not start pipeline run. Try again.")
      },
    })
  }

  // ─── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={cn("flex-1 p-8", className)}>
        <DetailSkeleton />
      </div>
    )
  }

  if (isError || !workflow) {
    return (
      <div className={cn("flex-1 p-8", className)}>
        <ErrorState
          title="Could not load pipeline"
          description="Check your connection and try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  const isSaving = updateMutation.isPending
  const isRunning = runMutation.isPending

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2 flex-shrink-0">
        {/* Left: back + name + active badge */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Back to pipeline list"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-medium ml-1">{workflow.name}</h2>
          <Badge
            variant={workflow.active ? "outline" : "secondary"}
            className={workflow.active ? "text-primary border-primary/30 ml-2" : "ml-2"}
          >
            {workflow.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Right: save + run buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save pipeline"}
          </Button>
          <Button size="sm" disabled={isRunning} onClick={handleRun}>
            {isRunning ? "Running..." : "Run pipeline"}
          </Button>
        </div>
      </div>

      {/* Run result status bar (shown after run triggered) */}
      {runResult && (
        <div className="px-4 pt-2">
          <WorkflowRunView
            runResult={runResult}
            onDismiss={() => setRunResult(null)}
          />
        </div>
      )}

      {/* Canvas area */}
      <div className="relative flex-1 h-full">
        <CanvasFlow
          nodeTypes={NODE_TYPES}
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          fitView
        >
          <CanvasBackground />
          <CanvasControls />
          {showMiniMap && <CanvasMiniMap />}
          <CanvasPalette
            items={PALETTE_ITEMS}
            onAddNode={handleAddNodeFromPalette}
          />
          <CanvasInspector
            open={selectedNode !== null}
            title={
              selectedNode
                ? ((selectedNode.data as { name?: string }).name ?? "Node inspector")
                : undefined
            }
            onClose={() => setSelectedNode(null)}
          >
            {selectedNode && (
              <div className="space-y-2">
                <code className="text-xs font-mono text-muted-foreground block">
                  {(selectedNode.data as { type?: string }).type}
                </code>
                {Object.entries(
                  (selectedNode.data as { parameters?: Record<string, unknown> })
                    .parameters ?? {}
                ).map(([key, value]: [string, unknown]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium">{key}:</span>{" "}
                    <span className="text-muted-foreground font-mono">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CanvasInspector>
        </CanvasFlow>
      </div>
    </div>
  )
}
