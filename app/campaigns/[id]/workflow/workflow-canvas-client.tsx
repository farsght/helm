'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Sparkles, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { FlowNode, getOutputPorts, type FlowNodeData } from '@/components/canvas/flow-node';
import { Palette, type PaletteItem } from '@/components/canvas/palette';
import { autoLayout } from '@/components/canvas/auto-layout';
import { apiFetch } from '@/lib/api';

const nodeTypes: NodeTypes = { flow: FlowNode };

interface AgentRow { id: number; name: string; outputSchemaJson: string; }
interface ValidationError {
  kind: string;
  message: string;
  nodeId?: number;
  nodeIds?: number[];
  edgeIds?: number[];
}

interface CanvasProps { campaignId: number; }

export function WorkflowCanvasClient(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
}

function InnerCanvas({ campaignId }: CanvasProps) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null);

  // Maps RF node ids -> the original DB id (so we can save back correctly).
  // New nodes have synthetic 'new-xxx' ids; the API resolves them.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('Workflow');

  // ── Load workflow + agent options ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wf, agentList, campaign] = await Promise.all([
          apiFetch(`/api/campaigns/${campaignId}/workflow`),
          apiFetch('/api/agents'),
          apiFetch(`/api/campaigns/${campaignId}`).catch(() => null),
        ]);
        if (cancelled) return;
        if (campaign?.name) setCampaignName(campaign.name);
        setAgents(agentList ?? []);

        const dbNodes = (wf.nodes ?? []) as Array<{
          id: number; type: string; label: string; configJson: string | null;
          positionX: number; positionY: number;
        }>;
        const dbEdges = (wf.edges ?? []) as Array<{
          id: number; sourceNodeId: number; targetNodeId: number;
          label: string | null; conditionJson: string | null;
        }>;

        let rfNodes: Node<FlowNodeData>[] = dbNodes.map((n) => {
          let config: Record<string, unknown> = {};
          try { if (n.configJson) config = JSON.parse(n.configJson); } catch {}
          return {
            id: String(n.id),
            type: 'flow',
            position: { x: n.positionX, y: n.positionY },
            data: { type: n.type, label: n.label, config },
          };
        });
        const rfEdges: Edge[] = dbEdges.map((e) => ({
          id: `e-${e.id}`,
          source: String(e.sourceNodeId),
          target: String(e.targetNodeId),
          sourceHandle: e.label ?? 'next',
          label: e.label ?? undefined,
          animated: true,
        }));

        // Auto-layout if any node is at (0,0) — likely never positioned.
        if (rfNodes.length > 0 && rfNodes.every((n) => n.position.x === 0 && n.position.y === 0)) {
          rfNodes = autoLayout(rfNodes, rfEdges) as Node<FlowNodeData>[];
        }

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch (err) {
        console.error('Load workflow error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [campaignId, setNodes, setEdges]);

  // ── Edge connection ─────────────────────────────────────────────
  const onConnect: OnConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge({
      ...conn,
      animated: true,
      label: conn.sourceHandle ?? undefined,
      style: { stroke: '#266DF0', strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  // ── Drop from palette ───────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/aisdr-palette');
    if (!raw || !rfInstance || !reactFlowWrapper.current) return;
    let payload: { kind: string; type: string; label: string };
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.kind !== 'flow') return; // workflow canvas accepts flow nodes only
    const position = rfInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const newNode: Node<FlowNodeData> = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'flow',
      position,
      data: {
        type: payload.type,
        label: payload.label,
        config: defaultConfigForType(payload.type),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [rfInstance, setNodes]);

  // ── Validate via server (returns structured errors) ─────────────
  const runValidation = useCallback(async () => {
    try {
      // Save first as draft (validator runs server-side against persisted state)
      // but we can also validate optimistically by POSTing the in-memory graph.
      // Simpler v1: save (which doesn't run validator), then call activate's
      // dry-run endpoint. To avoid adding a route, we just save+reload and
      // surface errors from the next activate attempt. For now: do a local
      // sanity check — full validator runs at /activate.
      const localErrors: ValidationError[] = [];
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const n of nodes) {
        if (n.data.type === 'ai_agent') {
          const config = (n.data.config ?? {}) as { agentId?: unknown; decisions?: unknown };
          if (typeof config.agentId !== 'number') {
            localErrors.push({ kind: 'ai_agent_missing_agent_id', nodeId: parseInt(n.id) || 0, message: `AI agent node "${n.data.label}" must reference an agent.` });
          }
          const outgoing = edges.filter((e) => e.source === n.id);
          const decisions = Array.isArray(config.decisions) ? (config.decisions as string[]) : [];
          if (decisions.length > 0) {
            const labels = outgoing.map((e) => e.sourceHandle ?? e.label).filter(Boolean);
            const missing = decisions.filter((d) => !labels.includes(d));
            if (missing.length > 0) {
              localErrors.push({ kind: 'ai_agent_edges_must_match_decisions', nodeId: parseInt(n.id) || 0, message: `Missing edges for: ${missing.join(', ')}` });
            }
          }
        }
        if (n.data.type === 'condition' || n.data.type === 'ai_decision') {
          const outgoing = edges.filter((e) => e.source === n.id);
          const labels = new Set(outgoing.map((e) => e.sourceHandle ?? e.label));
          if (outgoing.length !== 2 || !labels.has('yes') || !labels.has('no')) {
            localErrors.push({ kind: 'branching_edges_must_be_yes_no', nodeId: parseInt(n.id) || 0, message: `"${n.data.label}" needs edges labeled yes and no` });
          }
        }
      }
      // Orphan edges
      for (const e of edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
          localErrors.push({ kind: 'edge_dangling', message: 'Dangling edge — source or target missing.' });
        }
      }
      setErrors(localErrors);
      return localErrors;
    } catch (err) {
      console.error('Validation error:', err);
      return [];
    }
  }, [nodes, edges]);

  // Apply error highlights to node data on every validation change
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      const nodeErrors = errors.filter((e) => String(e.nodeId) === n.id).map((e) => e.message);
      return { ...n, data: { ...n.data, errors: nodeErrors.length > 0 ? nodeErrors : undefined } };
    }));
  }, [errors, setNodes]);

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          data: { type: n.data.type, label: n.data.label, config: n.data.config ?? {} },
          position: n.position,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.sourceHandle ?? e.label ?? null,
        })),
      };
      await apiFetch(`/api/campaigns/${campaignId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Reload to get DB-assigned ids
      const wf = await apiFetch(`/api/campaigns/${campaignId}/workflow`);
      const dbNodes = wf.nodes as Array<{ id: number; positionX: number; positionY: number }>;
      // Map: match by position (since we just inserted in order, this is fragile but adequate v1).
      // Better: have the API return the id map. For now reload from DB authoritatively.
      const rfNodes: Node<FlowNodeData>[] = (wf.nodes as Array<{ id: number; type: string; label: string; configJson: string | null; positionX: number; positionY: number; }>).map((n) => {
        let config: Record<string, unknown> = {};
        try { if (n.configJson) config = JSON.parse(n.configJson); } catch {}
        return {
          id: String(n.id),
          type: 'flow',
          position: { x: n.positionX, y: n.positionY },
          data: { type: n.type, label: n.label, config },
        };
      });
      const rfEdges: Edge[] = (wf.edges as Array<{ id: number; sourceNodeId: number; targetNodeId: number; label: string | null }>).map((e) => ({
        id: `e-${e.id}`, source: String(e.sourceNodeId), target: String(e.targetNodeId), sourceHandle: e.label ?? 'next', label: e.label ?? undefined, animated: true,
      }));
      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSaving(false);
    }
  }, [campaignId, nodes, edges, setNodes, setEdges]);

  const handleAutoArrange = useCallback(() => {
    setNodes((nds) => autoLayout(nds, edges) as Node<FlowNodeData>[]);
  }, [edges, setNodes]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading workflow...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${campaignId}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="font-medium text-foreground">{campaignName}</h1>
            <p className="text-xs text-muted-foreground">Workflow canvas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 ? (
            <span className="flex items-center gap-1 text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">
              <AlertTriangle className="h-3 w-3" />{errors.length} issue{errors.length === 1 ? '' : 's'}
            </span>
          ) : nodes.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-300">
              <CheckCircle2 className="h-3 w-3" />Looks valid
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={runValidation}>
            <Sparkles className="h-4 w-4 mr-1" />Validate
          </Button>
          <Button size="sm" variant="ghost" onClick={handleAutoArrange}>Auto-arrange</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        <Palette sections={['flow']} />
        <div ref={reactFlowWrapper} className="flex-1 bg-background relative">
          <ReactFlow<Node<FlowNodeData>, Edge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setRfInstance}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#266DF0', strokeWidth: 2 },
            }}
            connectionRadius={30}
          >
            <Background gap={20} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} pannable zoomable />
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground/70 max-w-md px-4">
                  <p className="text-sm">Drag a node from the palette to get started.</p>
                  <p className="text-xs mt-2">Tip: start with an email or ai_agent node. Wire decision edges by dragging from each output port.</p>
                </div>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Inspector */}
        {selectedNode && (
          <InspectorPanel
            node={selectedNode}
            agents={agents}
            onChange={(updated) => setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...updated } } : n))}
            onDelete={() => {
              setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
              setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
              setSelectedNodeId(null);
            }}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Inspector — right-side panel for editing a selected node
// ────────────────────────────────────────────────────────────────────

interface InspectorProps {
  node: Node<FlowNodeData>;
  agents: AgentRow[];
  onChange: (patch: Partial<FlowNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function InspectorPanel({ node, agents, onChange, onDelete, onClose }: InspectorProps) {
  const config = (node.data.config ?? {}) as Record<string, unknown>;

  return (
    <div className="w-80 shrink-0 border-l border-border bg-card/30 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Inspector</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">Label</label>
        <input
          value={node.data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2 py-1.5 text-sm rounded-md border border-input bg-background text-foreground"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">Type</label>
        <div className="text-sm font-mono text-foreground bg-background border border-border rounded-md px-2 py-1.5">
          {node.data.type}
        </div>
      </div>

      {/* Type-specific config */}
      {node.data.type === 'ai_agent' && (
        <AiAgentConfig
          config={config}
          agents={agents}
          onChange={(c) => onChange({ config: c })}
        />
      )}

      {node.data.type === 'wait' && (
        <SimpleConfigField
          label="Duration"
          value={(config.duration as string) ?? '1 day'}
          placeholder="1 day, 2 hours, 30 minutes"
          onChange={(v) => onChange({ config: { ...config, duration: v } })}
        />
      )}

      {node.data.type === 'condition' && (
        <SimpleConfigField
          label="Check (e.g. replied)"
          value={(config.check as string) ?? 'replied'}
          placeholder="replied, opened, clicked"
          onChange={(v) => onChange({ config: { ...config, check: v } })}
        />
      )}

      {node.data.type === 'email' && (
        <>
          <SimpleConfigField
            label="Subject"
            value={(config.subject as string) ?? ''}
            placeholder="Quick question about {{company}}"
            onChange={(v) => onChange({ config: { ...config, subject: v } })}
          />
          <SimpleConfigField
            label="Body"
            value={(config.body as string) ?? ''}
            placeholder="Hi {{firstName}}..."
            multiline
            onChange={(v) => onChange({ config: { ...config, body: v } })}
          />
        </>
      )}

      {node.data.type === 'tag' && (
        <SimpleConfigField
          label="Tag name"
          value={(config.tag as string) ?? ''}
          placeholder="qualified-lead"
          onChange={(v) => onChange({ config: { ...config, tag: v } })}
        />
      )}

      {node.data.type === 'switch' && (
        <>
          <SimpleConfigField
            label="Expression"
            value={(config.expression as string) ?? ''}
            placeholder="prospect.title"
            onChange={(v) => onChange({ config: { ...config, expression: v } })}
          />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Cases</label>
            {((config.cases as Array<{ label: string; when: string }>) ?? []).map((c, i) => (
              <div key={i} className="flex gap-1">
                <input
                  className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs"
                  placeholder="label"
                  value={c.label}
                  onChange={(e) => {
                    const cases = [...((config.cases as Array<{ label: string; when: string }>) ?? [])];
                    cases[i] = { ...cases[i], label: e.target.value };
                    onChange({ config: { ...config, cases } });
                  }}
                />
                <input
                  className="flex-1 bg-input border border-border rounded px-2 py-1 text-xs"
                  placeholder="value to match"
                  value={c.when}
                  onChange={(e) => {
                    const cases = [...((config.cases as Array<{ label: string; when: string }>) ?? [])];
                    cases[i] = { ...cases[i], when: e.target.value };
                    onChange({ config: { ...config, cases } });
                  }}
                />
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300 text-xs px-1"
                  onClick={() => {
                    const cases = ((config.cases as Array<{ label: string; when: string }>) ?? []).filter((_, j) => j !== i);
                    onChange({ config: { ...config, cases } });
                  }}
                >×</button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const cases = [...((config.cases as Array<{ label: string; when: string }>) ?? []), { label: `case_${(((config.cases as unknown[]) ?? []).length) + 1}`, when: '' }];
                onChange({ config: { ...config, cases } });
              }}
              className="text-xs"
            >+ Add case</Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <input
                type="checkbox"
                checked={!!config.defaultCase}
                onChange={(e) => onChange({ config: { ...config, defaultCase: e.target.checked } })}
              />
              Add fallthrough "default" edge
            </label>
          </div>
        </>
      )}

      {node.data.type === 'wait_for_event' && (
        <>
          <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded p-2">
            Suspends the workflow until an external event arrives on the hook token <code className="font-mono">wait:&lt;cp_id&gt;:{node.id}</code>. POST to <code className="font-mono">/.well-known/workflow/v1/webhook/&lt;token&gt;</code> to resume.
          </div>
          <SimpleConfigField
            label="Event type"
            value={(config.eventType as string) ?? ''}
            placeholder="reply | click | approval | custom"
            onChange={(v) => onChange({ config: { ...config, eventType: v } })}
          />
        </>
      )}

      {node.data.type === 'sub_workflow' && (
        <SimpleConfigField
          label="Sub-campaign ID"
          value={String((config.subCampaignId as number) ?? '')}
          placeholder="42"
          onChange={(v) => {
            const n = parseInt(v, 10);
            onChange({ config: { ...config, subCampaignId: isNaN(n) ? undefined : n } });
          }}
        />
      )}

      {node.data.errors && node.data.errors.length > 0 && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 space-y-1">
          {node.data.errors.map((e, i) => (<div key={i}>⚠️ {e}</div>))}
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full">
          Delete Node
        </Button>
      </div>
    </div>
  );
}

function SimpleConfigField({ label, value, placeholder, onChange, multiline }: {
  label: string; value: string; placeholder?: string; multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</label>
      <Tag
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-2 py-1.5 text-sm rounded-md border border-input bg-background text-foreground ${multiline ? 'min-h-[80px]' : ''}`}
      />
    </div>
  );
}

function AiAgentConfig({ config, agents, onChange }: {
  config: Record<string, unknown>;
  agents: AgentRow[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const agentId = typeof config.agentId === 'number' ? config.agentId : null;
  const decisions = Array.isArray(config.decisions) ? (config.decisions as string[]) : [];

  // When agent picked, snapshot its decisions so validator + UI match
  const handlePickAgent = (id: number) => {
    const ag = agents.find((a) => a.id === id);
    if (!ag) return;
    let agDecisions: string[] = [];
    try {
      const parsed = JSON.parse(ag.outputSchemaJson);
      if (Array.isArray(parsed?.decisions)) agDecisions = parsed.decisions;
    } catch {}
    onChange({ ...config, agentId: id, decisions: agDecisions });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground uppercase tracking-wide">Agent</label>
      <select
        value={agentId ?? ''}
        onChange={(e) => handlePickAgent(parseInt(e.target.value))}
        className="w-full px-2 py-1.5 text-sm rounded-md border border-input bg-background text-foreground"
      >
        <option value="">— pick an agent —</option>
        {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
      </select>
      {decisions.length > 0 && (
        <>
          <label className="text-xs text-muted-foreground uppercase tracking-wide mt-3 block">Decision Edges</label>
          <p className="text-xs text-muted-foreground">
            Connect each output port to a downstream node:
          </p>
          <div className="space-y-1">
            {decisions.map((d) => (
              <div key={d} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-primary">→ {d}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Initial configJson scaffold for a newly-dropped node. Keeps node type
 * authoring narrow and validator-passing immediately after drop.
 */
function defaultConfigForType(type: string): Record<string, unknown> {
  switch (type) {
    case 'ai_agent':
      return { agentId: null, decisions: [] };
    case 'switch':
      return { expression: 'prospect.title', cases: [{ label: 'case_1', when: '' }], defaultCase: false };
    case 'wait_for_event':
      return { eventType: 'reply' };
    case 'sub_workflow':
      return { subCampaignId: null };
    case 'wait':
      return { duration: '1 day' };
    case 'condition':
      return { check: '' };
    default:
      return {};
  }
}
