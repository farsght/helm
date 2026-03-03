"use client";

import { useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./workflow/workflow-node";
import { NodePalette } from "./workflow/node-palette";
import { NodeConfigPanel } from "./workflow/node-config-panel";
import { Button } from "./ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

const nodeTypes = {
  workflow: WorkflowNode,
};

interface WorkflowNodeData {
  label: string;
  type: string;
  config: Record<string, unknown>;
  prospectCount: number;
}

interface DbNode {
  id: number;
  positionX: number;
  positionY: number;
  label: string;
  type: string;
  configJson: string | null;
}

interface DbEdge {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  label: string | null;
}

interface CampaignCanvasProps {
  campaignId: number;
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
}

export function CampaignCanvas({ initialNodes, initialEdges }: CampaignCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<{
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: (options?: { padding?: number }) => void;
  } | null>(null);

  // Convert DB nodes to React Flow nodes
  useEffect(() => {
    if (!initialNodes || !initialEdges) return;
    const flowNodes: Node<WorkflowNodeData>[] = initialNodes.map((node) => ({
      id: node.id.toString(),
      type: "workflow",
      position: { x: node.positionX, y: node.positionY },
      data: {
        label: node.label,
        type: node.type,
        config: node.configJson ? JSON.parse(node.configJson) : {},
        prospectCount: 0,
      },
    }));
    setNodes(flowNodes);

    const flowEdges: Edge[] = initialEdges.map((edge) => ({
      id: edge.id.toString(),
      source: edge.sourceNodeId.toString(),
      target: edge.targetNodeId.toString(),
      label: edge.label ?? undefined,
      animated: true,
      style: { stroke: "#266DF0", strokeWidth: 2 },
    }));
    setEdges(flowEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        animated: true,
        style: { stroke: "#266DF0", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      // TODO: Save to database
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: "workflow",
        position,
        data: {
          label: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          type,
          config: {},
          prospectCount: 0,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      // TODO: Save to database
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleZoomIn = () => {
    reactFlowInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance?.zoomOut();
  };

  const handleFitView = () => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  };

  const handleNodeUpdate = (nodeId: string, updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates,
            },
          };
        }
        return node;
      })
    );
    // TODO: Save to database
  };

  return (
    <div className="relative w-full h-full bg-[#1B1B1F]">
      <NodePalette />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#1B1B1F]"
        style={{ background: "#1B1B1F" }}
      >
        <Background
          color="#3A3A40"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <MiniMap
          nodeColor="#266DF0"
          maskColor="rgba(27, 27, 31, 0.8)"
          style={{
            background: "#25252A",
            border: "1px solid #3A3A40",
          }}
        />
        <Controls
          showInteractive={false}
          className="bg-[#25252A] border border-[#3A3A40] [&>button]:bg-[#25252A] [&>button]:border-[#3A3A40] [&>button]:text-white [&>button:hover]:bg-[#3A3A40]"
        />
        <Panel position="top-right" className="flex gap-2">
          <Button
            onClick={handleZoomIn}
            size="icon"
            variant="outline"
            className="bg-[#25252A] border-[#3A3A40] text-white hover:bg-[#3A3A40]"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleZoomOut}
            size="icon"
            variant="outline"
            className="bg-[#25252A] border-[#3A3A40] text-white hover:bg-[#3A3A40]"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleFitView}
            size="icon"
            variant="outline"
            className="bg-[#25252A] border-[#3A3A40] text-white hover:bg-[#3A3A40]"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </Panel>
      </ReactFlow>
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
