'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Bot } from 'lucide-react';
import Link from 'next/link';
import { FlowNode, type FlowNodeData } from '@/components/canvas/flow-node';
import { ResourceNode, type ResourceNodeData } from '@/components/canvas/resource-node';
import { Palette } from '@/components/canvas/palette';
import { apiFetch } from '@/lib/api';

const nodeTypes: NodeTypes = { flow: FlowNode, resource: ResourceNode };

interface AgentRow {
  id: number; name: string; description: string | null; model: string;
  systemPrompt: string; userPromptTemplate: string;
  modelParamsJson: string | null; outputSchemaJson: string; maxTurns: number;
}
interface SkillRow { id: number; name: string; category: string | null; }
interface McpRow { id: number; name: string; toolsCacheJson: string | null; }

interface AttachedSkill { skillId: number; name: string; position: number; }
interface AttachedMcp { mcpServerId: number; name: string; }

interface CanvasProps { agentId: number; }

export function AgentCanvasClient(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
}

/**
 * Agent Library canvas — visual builder for ONE agent.
 *
 * The agent itself is a center 'flow' node (purely visual — there's nothing
 * upstream/downstream within this view). Resources (skills + MCP) appear as
 * 'resource' circles connected via dashed edges to the agent.
 *
 * Save behavior: we don't persist positions yet (no schema column). Saving
 * here writes attachments via the same PUT /api/agents/:id/skills and
 * /api/agents/:id/mcp endpoints. Positions are reset to auto-layout on
 * each load. Future: add agent_canvas_layout JSON column.
 */
function InnerCanvas({ agentId }: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<FlowNodeData | ResourceNodeData>, Edge> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData | ResourceNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [allSkills, setAllSkills] = useState<SkillRow[]>([]);
  const [allMcp, setAllMcp] = useState<McpRow[]>([]);

  // ── Load agent + all resources + current attachments ───────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, skills, servers, attSkills, attMcp] = await Promise.all([
          apiFetch(`/api/agents/${agentId}`),
          apiFetch('/api/skills'),
          apiFetch('/api/mcp-servers'),
          apiFetch(`/api/agents/${agentId}/skills`),
          apiFetch(`/api/agents/${agentId}/mcp`),
        ]);
        if (cancelled) return;
        setAgent(a);
        setAllSkills(skills ?? []);
        setAllMcp(servers ?? []);

        // Build the visual graph
        const newNodes: Node<FlowNodeData | ResourceNodeData>[] = [];
        const newEdges: Edge[] = [];

        // Center: agent
        newNodes.push({
          id: 'agent',
          type: 'flow',
          position: { x: 320, y: 200 },
          data: {
            type: 'ai_agent',
            label: a.name,
            config: { agentId, decisions: [] },
          } as FlowNodeData,
        });

        // Skills above-left
        (attSkills as AttachedSkill[]).forEach((s, i) => {
          const id = `skill-${s.skillId}`;
          newNodes.push({
            id,
            type: 'resource',
            position: { x: 80 + (i * 130), y: 400 },
            data: { resourceType: 'skill', label: s.name } as ResourceNodeData,
          });
          newEdges.push({
            id: `e-skill-${s.skillId}`,
            source: id, target: 'agent',
            animated: false,
            style: { stroke: '#9ca3af', strokeWidth: 1.5, strokeDasharray: '4 3' },
            label: 'skill',
          });
        });

        // MCP servers to the right
        (attMcp as AttachedMcp[]).forEach((m, i) => {
          const id = `mcp-${m.mcpServerId}`;
          newNodes.push({
            id,
            type: 'resource',
            position: { x: 600 + (i * 130), y: 400 },
            data: { resourceType: 'mcp', label: m.name } as ResourceNodeData,
          });
          newEdges.push({
            id: `e-mcp-${m.mcpServerId}`,
            source: id, target: 'agent',
            animated: false,
            style: { stroke: '#9ca3af', strokeWidth: 1.5, strokeDasharray: '4 3' },
            label: 'tool',
          });
        });

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error('Load agent canvas error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId, setNodes, setEdges]);

  // ── Drop from palette ──────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/aisdr-palette');
    if (!raw || !rfInstance) return;
    let payload: { kind: string; type: string; label: string };
    try { payload = JSON.parse(raw); } catch { return; }

    // Agent canvas only accepts resources (skill, mcp). The center agent is
    // immutable from the palette.
    if (payload.kind !== 'resource') {
      alert('Only resources can be dropped here. Skills + MCP servers from the palette.');
      return;
    }
    const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

    // Generic skill / mcp placeholder — user must edit detail via inspector
    const tempId = `new-${payload.type}-${Date.now()}`;
    const data: ResourceNodeData = {
      resourceType: payload.type as ResourceNodeData['resourceType'],
      label: `(unset ${payload.label})`,
    };
    setNodes((nds) => [
      ...nds,
      { id: tempId, type: 'resource', position, data },
    ]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${tempId}`,
        source: tempId, target: 'agent',
        animated: false,
        style: { stroke: '#9ca3af', strokeWidth: 1.5, strokeDasharray: '4 3' },
        label: payload.type === 'skill' ? 'skill' : 'tool',
      },
    ]);
  }, [rfInstance, setNodes, setEdges]);

  // ── Resource picker — when user clicks an unset resource node ──
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'resource' && String(node.id).startsWith('new-')) {
      setPickerFor(node.id);
    }
  }, []);

  const pickResource = (nodeId: string, resourceId: number, name: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== nodeId) return n;
      const rt = (n.data as ResourceNodeData).resourceType;
      const newId = `${rt}-${resourceId}`;
      return { ...n, id: newId, data: { ...n.data, label: name, resourceId } as ResourceNodeData };
    }));
    setEdges((eds) => eds.map((e) => {
      if (e.source === nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        const rt = node ? (node.data as ResourceNodeData).resourceType : 'skill';
        return { ...e, id: `e-${rt}-${resourceId}`, source: `${rt}-${resourceId}` };
      }
      return e;
    }));
    setPickerFor(null);
  };

  // ── Save: serialize attachments ────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const skillIds: number[] = [];
      const mcpServers: { mcpServerId: number }[] = [];
      for (const n of nodes) {
        if (n.type !== 'resource') continue;
        const data = n.data as ResourceNodeData & { resourceId?: number };
        if (!data.resourceId && !n.id.match(/^(skill|mcp)-\d+$/)) continue; // skip unset
        // Parse id from node id
        const m = n.id.match(/^(skill|mcp)-(\d+)$/);
        if (!m) continue;
        const rid = parseInt(m[2]);
        if (m[1] === 'skill') skillIds.push(rid);
        else if (m[1] === 'mcp') mcpServers.push({ mcpServerId: rid });
      }
      await Promise.all([
        apiFetch(`/api/agents/${agentId}/skills`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillIds }),
        }),
        apiFetch(`/api/agents/${agentId}/mcp`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servers: mcpServers }),
        }),
      ]);
      alert('Saved ✓');
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSaving(false);
    }
  }, [agentId, nodes]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading agent canvas...</div>;
  if (!agent) return <div className="p-8 text-red-400">Agent not found.</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between border-b border-border bg-card/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/agents">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="font-medium text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />{agent.name}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{agent.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save Attachments'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <Palette sections={['resource']} />
        <div ref={reactFlowWrapper} className="flex-1 bg-background relative">
          <ReactFlow<Node<FlowNodeData | ResourceNodeData>, Edge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setRfInstance}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background gap={20} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {/* Resource picker overlay */}
          {pickerFor && (
            <ResourcePickerOverlay
              nodeType={(nodes.find((n) => n.id === pickerFor)?.data as ResourceNodeData)?.resourceType ?? 'skill'}
              skills={allSkills}
              servers={allMcp}
              onPick={(id, name) => pickResource(pickerFor, id, name)}
              onCancel={() => setPickerFor(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ResourcePickerOverlay({ nodeType, skills, servers, onPick, onCancel }: {
  nodeType: 'skill' | 'mcp' | 'model' | 'memory' | 'knowledge';
  skills: SkillRow[];
  servers: McpRow[];
  onPick: (id: number, name: string) => void;
  onCancel: () => void;
}) {
  const items = nodeType === 'skill'
    ? skills.map((s) => ({ id: s.id, name: s.name, sub: s.category ?? '' }))
    : nodeType === 'mcp'
      ? servers.map((s) => ({ id: s.id, name: s.name, sub: '' }))
      : [];
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10" onClick={onCancel}>
      <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-medium text-foreground mb-3">
          Pick a {nodeType === 'skill' ? 'Skill' : nodeType === 'mcp' ? 'MCP Server' : nodeType}
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No {nodeType}s yet. Create one first.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => onPick(it.id, it.name)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 text-sm text-foreground"
              >
                <div>{it.name}</div>
                {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
              </button>
            ))}
          </div>
        )}
        <div className="pt-3 mt-3 border-t border-border flex justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
