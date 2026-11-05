"use client"
// D-09 / Pitfall 5: xyflow CSS import belongs in the consumer's global CSS ONLY, NOT here.

import * as React from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from "@xyflow/react"

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
  children?: React.ReactNode
}

export function CanvasFlow({
  nodeTypes,
  edgeTypes,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onDrop,
  onDragOver,
  fitView = true,
  children,
}: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full" aria-label="Pipeline canvas">
        <ReactFlow
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView={fitView}
        >
          {children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
