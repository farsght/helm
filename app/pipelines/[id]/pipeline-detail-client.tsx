"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { ArrowLeft, Loader2, Play, Save, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { PipelineNode } from "./pipeline-node";

const nodeTypes = { pipeline: PipelineNode };

interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  status: string;
  lastRunAt: string | null;
}

interface DbNode {
  id: number;
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  configJson: string | null;
  triggerConfig?: Record<string, unknown> | null;
}

interface DbEdge {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  label: string | null;
}

interface PipelineRun {
  id: number;
  status: string;
  rowsInput: number;
  rowsOutput: number;
  rowsErrored: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface NodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config: Record<string, unknown>;
}

// ─── Node Palette ────────────────────────────────────────────────────

const PALETTE_GROUPS = [
  {
    label: "Source",
    items: [{ type: "source_dataset", label: "Dataset Source" }],
  },
  {
    label: "Transform",
    items: [
      { type: "map_fields", label: "Map Fields" },
      { type: "filter", label: "Filter Rows" },
      { type: "clean", label: "Clean Data" },
      { type: "deduplicate", label: "Deduplicate" },
      { type: "ai_classify", label: "AI Classify" },
      { type: "split", label: "Split" },
      { type: "enrich", label: "Enrich" },
      { type: "run_notebook", label: "Run Notebook" },
    ],
  },
  {
    label: "Meetings",
    items: [
      { type: "fireflies_poll", label: "Fireflies Poll" },
      { type: "persist_raw_pair", label: "Persist Raw (vault)" },
      { type: "classify_meeting", label: "Classify Meeting" },
      { type: "extract_entities", label: "Extract Entities" },
      { type: "chunk_text", label: "Chunk Text" },
      { type: "embed", label: "Embed Chunks" },
      { type: "promote_meetings", label: "→ Meetings (Neon)" },
      { type: "promote_entities", label: "→ Entities (Neon)" },
      { type: "promote_chunks", label: "→ Chunks (Neon, pgvector)" },
    ],
  },
  {
    label: "Output",
    items: [
      { type: "promote_prospects", label: "→ Prospects" },
      { type: "promote_companies", label: "→ Companies" },
      { type: "promote_contacts", label: "→ Contacts" },
      { type: "promote_deals", label: "→ Deals" },
      { type: "promote_segment", label: "→ Segment" },
    ],
  },
];

function PipelinePalette() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="absolute left-4 top-4 z-10 w-56 bg-card border-border shadow-xl">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm">Add Node</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="px-4 pb-4 space-y-3">
            {PALETTE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-primary text-sm"
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Node Config Panel ───────────────────────────────────────────────

function PipelineNodeConfig({
  node,
  pipelineId,
  isSource,
  onUpdate,
  onClose,
  getAllNodes,
  getAllEdges,
}: {
  node: Node<NodeData>;
  pipelineId: number;
  isSource: boolean;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onClose: () => void;
  getAllNodes: () => Node<NodeData>[];
  getAllEdges: () => Edge[];
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(
    (node.data.config as Record<string, unknown>) || {}
  );
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    (node.data.triggerConfig as Record<string, unknown>) || { kind: "manual" }
  );
  const [datasets, setDatasets] = useState<Array<{ id: number; name: string; rowCount: number }>>([]);
  const [notebooks, setNotebooks] = useState<Array<{ id: number; name: string }>>([]);
  const [firefliesConns, setFirefliesConns] = useState<Array<{ id: number; name: string }>>([]);
  const [openaiConns, setOpenaiConns] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetch("/api/datasets").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setDatasets(d); }).catch(() => {});
    fetch("/api/notebooks").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setNotebooks(d); }).catch(() => {});
    fetch("/api/connections?kind=fireflies&status=active").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setFirefliesConns(d); }).catch(() => {});
    fetch("/api/connections?kind=openai&status=active").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setOpenaiConns(d); }).catch(() => {});
  }, []);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // 1. Push config into React Flow state
      onUpdate(node.id, { config, triggerConfig });
      // 2. Persist full canvas to DB (nodes state may not reflect the above
      //    update synchronously, so we merge manually for the API payload)
      const updatedNodes = getAllNodes().map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, config, triggerConfig } } : n
      );
      const edges = getAllEdges();
      await apiFetch(`/api/pipelines/${pipelineId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: updatedNodes, edges }),
      });
      toast.success("Node saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const type = String(node.data.type);

  const renderFields = () => {
    switch (type) {
      case "source_dataset":
        return (
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select
              value={String(config.datasetId ?? "")}
              onValueChange={(v) => setConfig({ ...config, datasetId: parseInt(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name} ({d.rowCount.toLocaleString()} rows)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "filter":
        return (
          <>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input value={String(config.field ?? "")} onChange={(e) => setConfig({ ...config, field: e.target.value })} placeholder="e.g. email" />
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select value={String(config.operator ?? "not_empty")} onValueChange={(v) => setConfig({ ...config, operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["equals", "not_equals", "contains", "not_empty", "is_empty", "gt", "lt"].map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={String(config.value ?? "")} onChange={(e) => setConfig({ ...config, value: e.target.value })} placeholder="Filter value" />
            </div>
          </>
        );

      case "map_fields":
        return (
          <div className="space-y-2">
            <Label>Mappings (from → to, one per line)</Label>
            <Textarea
              rows={6}
              value={String(config.mappingsText ?? "")}
              onChange={(e) => setConfig({ ...config, mappingsText: e.target.value })}
              placeholder={"source_col → target_field\nemail → email_address"}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Format: source_column → target_field</p>
          </div>
        );

      case "clean":
        return (
          <div className="space-y-2">
            <Label>Operations (field:operation, one per line)</Label>
            <Textarea
              rows={6}
              value={String(config.operationsText ?? "")}
              onChange={(e) => setConfig({ ...config, operationsText: e.target.value })}
              placeholder={"email:normalize_email\nphone:normalize_phone\nname:trim"}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Operations: trim, lowercase, uppercase, normalize_phone, normalize_email, remove_special_chars</p>
          </div>
        );

      case "deduplicate":
        return (
          <>
            <div className="space-y-2">
              <Label>Dedup Fields (comma-separated)</Label>
              <Input value={String(config.fields ?? "")} onChange={(e) => setConfig({ ...config, fields: e.target.value })} placeholder="email, phone" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="keepFirst"
                checked={Boolean(config.keepFirst ?? true)}
                onChange={(e) => setConfig({ ...config, keepFirst: e.target.checked })}
              />
              <Label htmlFor="keepFirst">Keep first occurrence</Label>
            </div>
          </>
        );

      case "ai_classify":
        return (
          <>
            <div className="space-y-2">
              <Label>Input Field</Label>
              <Input value={String(config.field ?? "")} onChange={(e) => setConfig({ ...config, field: e.target.value })} placeholder="e.g. description" />
            </div>
            <div className="space-y-2">
              <Label>Output Field</Label>
              <Input value={String(config.outputField ?? "")} onChange={(e) => setConfig({ ...config, outputField: e.target.value })} placeholder="e.g. category" />
            </div>
            <div className="space-y-2">
              <Label>Categories (comma-separated)</Label>
              <Input value={String(config.categories ?? "")} onChange={(e) => setConfig({ ...config, categories: e.target.value })} placeholder="hot, warm, cold" />
            </div>
            <div className="space-y-2">
              <Label>Classification Prompt</Label>
              <Textarea rows={4} value={String(config.prompt ?? "")} onChange={(e) => setConfig({ ...config, prompt: e.target.value })} placeholder="Classify the following text into one of the categories..." />
            </div>
          </>
        );

      case "split":
        return (
          <>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input value={String(config.field ?? "")} onChange={(e) => setConfig({ ...config, field: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select value={String(config.operator ?? "not_empty")} onValueChange={(v) => setConfig({ ...config, operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["equals", "not_equals", "contains", "not_empty", "is_empty", "gt", "lt"].map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={String(config.value ?? "")} onChange={(e) => setConfig({ ...config, value: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Creates two output edges: "matches" and "no match"</p>
          </>
        );

      case "enrich":
        return (
          <div className="p-3 rounded-md bg-muted/30 text-sm text-muted-foreground">
            Coming soon — provider integration pending (Phantombuster, Clearbit, Hunter).
          </div>
        );

      case "run_notebook":
        return (
          <>
            <div className="space-y-2">
              <Label>Notebook</Label>
              <Select value={String(config.notebookId ?? "")} onValueChange={(v) => setConfig({ ...config, notebookId: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Select notebook" /></SelectTrigger>
                <SelectContent>
                  {notebooks.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output Field</Label>
              <Input value={String(config.outputField ?? "")} onChange={(e) => setConfig({ ...config, outputField: e.target.value })} placeholder="e.g. notebook_result" />
            </div>
          </>
        );

      case "promote_prospects":
      case "promote_companies":
      case "promote_contacts":
      case "promote_deals": {
        const entity = type.replace("promote_", "");
        return (
          <div className="space-y-2">
            <Label>Field Mappings (source → {entity} field, one per line)</Label>
            <Textarea
              rows={6}
              value={String(config.mappingsText ?? "")}
              onChange={(e) => setConfig({ ...config, mappingsText: e.target.value })}
              placeholder={`email → email\nfirst_name → firstName`}
              className="font-mono text-xs"
            />
          </div>
        );
      }

      case "promote_segment":
        return (
          <div className="space-y-2">
            <Label>Segment name to create/update</Label>
            <Input value={String(config.segmentName ?? "")} onChange={(e) => setConfig({ ...config, segmentName: e.target.value })} placeholder="e.g. Pipeline Output Q1" />
          </div>
        );

      // ─── Meetings pipeline nodes ──────────────────────────────────
      // Form fields mirror the Zod schemas in lib/pipeline-nodes/*.ts.

      case "fireflies_poll": {
        const hasLegacyEnvVar = Boolean(config.apiKeyEnv);
        return (
          <>
            {hasLegacyEnvVar && (
              <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                ⚠️ Legacy env-var config detected. Select a connection below to migrate.
              </p>
            )}
            <div className="space-y-2">
              <Label>Fireflies Connection</Label>
              {firefliesConns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No Fireflies connections found.{" "}
                  <a href="/connections" className="underline text-primary">Create one in /connections.</a>
                </p>
              ) : (
                <Select
                  value={String(config.connectionId ?? "")}
                  onValueChange={(v) => setConfig({ ...config, connectionId: parseInt(v), apiKeyEnv: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Fireflies connection…" />
                  </SelectTrigger>
                  <SelectContent>
                    {firefliesConns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Since cursor (ISO date, optional)</Label>
              <Input value={String(config.sinceCursor ?? "")} onChange={(e) => setConfig({ ...config, sinceCursor: e.target.value || undefined })} placeholder="e.g. 2026-01-01T00:00:00Z" />
            </div>
            <div className="space-y-2">
              <Label>Page size</Label>
              <Input type="number" value={String(config.pageSize ?? 25)} onChange={(e) => setConfig({ ...config, pageSize: parseInt(e.target.value) || 25 })} />
            </div>
            <div className="space-y-2">
              <Label>Max pages</Label>
              <Input type="number" value={String(config.maxPages ?? 40)} onChange={(e) => setConfig({ ...config, maxPages: parseInt(e.target.value) || 40 })} />
            </div>
            <p className="text-xs text-muted-foreground">Dedupes against meetings.fireflies_id — already-imported meetings are skipped.</p>
          </>
        );
      }

      case "persist_raw_pair":
        return (
          <>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prp-enabled"
                checked={Boolean(config.enabled ?? true)}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <Label htmlFor="prp-enabled">Write to vault (uncheck to pass through)</Label>
            </div>
            <div className="space-y-2">
              <Label>Vault root</Label>
              <Input value={String(config.vaultRoot ?? "")} onChange={(e) => setConfig({ ...config, vaultRoot: e.target.value })} placeholder="$VAULT_ROOT or absolute path" />
            </div>
            <div className="space-y-2">
              <Label>Subdir</Label>
              <Input value={String(config.subdir ?? "Knowledge Base/Sources/Fireflies/Raw")} onChange={(e) => setConfig({ ...config, subdir: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Writes transcript + summary markdown pair under {`{vaultRoot}/{subdir}/`}.</p>
          </>
        );

      case "classify_meeting": {
        const hasLegacy = Boolean(config.openaiApiKeyEnv);
        return (
          <>
            {hasLegacy && (
              <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                ⚠️ Legacy env-var config detected. Select an OpenAI connection to migrate.
              </p>
            )}
            <div className="space-y-2">
              <Label>OpenAI Connection</Label>
              {openaiConns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No OpenAI connections found.{" "}
                  <a href="/connections" className="underline text-primary">Create one in /connections.</a>
                </p>
              ) : (
                <Select
                  value={String(config.connectionId ?? "")}
                  onValueChange={(v) => setConfig({ ...config, connectionId: parseInt(v), openaiApiKeyEnv: undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Select an OpenAI connection…" /></SelectTrigger>
                  <SelectContent>
                    {openaiConns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={String(config.model ?? "gpt-4o-mini")} onChange={(e) => setConfig({ ...config, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prompt version tag</Label>
              <Input value={String(config.promptVersionTag ?? "netrunner-v1")} onChange={(e) => setConfig({ ...config, promptVersionTag: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Internal domains (comma-separated)</Label>
              <Input value={String(config.internalDomains ?? "bitwage.co,paystand.com")} onChange={(e) => setConfig({ ...config, internalDomains: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Retry count</Label>
              <Input type="number" value={String(config.retryCount ?? 3)} onChange={(e) => setConfig({ ...config, retryCount: parseInt(e.target.value) || 0 })} />
            </div>
            <p className="text-xs text-muted-foreground">VERBATIM netrunner Pass 1 prompt. Forces gtm_stage=[] for internal meetings.</p>
          </>
        );
      }

      case "extract_entities": {
        const hasLegacy = Boolean(config.openaiApiKeyEnv);
        return (
          <>
            {hasLegacy && (
              <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                ⚠️ Legacy env-var config detected. Select an OpenAI connection to migrate.
              </p>
            )}
            <div className="space-y-2">
              <Label>OpenAI Connection</Label>
              {openaiConns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No OpenAI connections found.{" "}
                  <a href="/connections" className="underline text-primary">Create one in /connections.</a>
                </p>
              ) : (
                <Select
                  value={String(config.connectionId ?? "")}
                  onValueChange={(v) => setConfig({ ...config, connectionId: parseInt(v), openaiApiKeyEnv: undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Select an OpenAI connection…" /></SelectTrigger>
                  <SelectContent>
                    {openaiConns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={String(config.model ?? "gpt-4o-mini")} onChange={(e) => setConfig({ ...config, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prompt version tag</Label>
              <Input value={String(config.promptVersionTag ?? "netrunner-v1")} onChange={(e) => setConfig({ ...config, promptVersionTag: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Max input chars</Label>
              <Input type="number" value={String(config.maxInputChars ?? 12000)} onChange={(e) => setConfig({ ...config, maxInputChars: parseInt(e.target.value) || 12000 })} />
            </div>
            <div className="space-y-2">
              <Label>Retry count</Label>
              <Input type="number" value={String(config.retryCount ?? 3)} onChange={(e) => setConfig({ ...config, retryCount: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ee-dryrun" checked={Boolean(config.dryRun ?? false)} onChange={(e) => setConfig({ ...config, dryRun: e.target.checked })} />
              <Label htmlFor="ee-dryrun">Dry run (emit empty entity stubs, no LLM call)</Label>
            </div>
            <p className="text-xs text-muted-foreground">Extracts people / companies / products / features / partner_type. Internal meetings → partner_type=&apos;none&apos;.</p>
          </>
        );
      }

      case "chunk_text":
        return (
          <>
            <div className="space-y-2">
              <Label>Source field</Label>
              <Input value={String(config.field ?? "transcript")} onChange={(e) => setConfig({ ...config, field: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Source type</Label>
              <Select value={String(config.sourceType ?? "transcript")} onValueChange={(v) => setConfig({ ...config, sourceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transcript">transcript</SelectItem>
                  <SelectItem value="summary">summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target tokens per chunk</Label>
              <Input type="number" value={String(config.targetTokens ?? 512)} onChange={(e) => setConfig({ ...config, targetTokens: parseInt(e.target.value) || 512 })} />
            </div>
            <div className="space-y-2">
              <Label>Overlap tokens</Label>
              <Input type="number" value={String(config.overlapTokens ?? 64)} onChange={(e) => setConfig({ ...config, overlapTokens: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ct-section"
                checked={Boolean(config.sectionAware ?? true)}
                onChange={(e) => setConfig({ ...config, sectionAware: e.target.checked })}
              />
              <Label htmlFor="ct-section">Section-aware (split on ## headers first)</Label>
            </div>
            <p className="text-xs text-muted-foreground">Fan-out: 1 input row → N chunk rows. Skips Speaker Analytics &amp; Attendance sections.</p>
          </>
        );

      case "embed": {
        const hasLegacy = Boolean(config.openaiApiKeyEnv);
        return (
          <>
            {hasLegacy && (
              <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                ⚠️ Legacy env-var config detected. Select an OpenAI connection to migrate.
              </p>
            )}
            <div className="space-y-2">
              <Label>OpenAI Connection</Label>
              {openaiConns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No OpenAI connections found.{" "}
                  <a href="/connections" className="underline text-primary">Create one in /connections.</a>
                </p>
              ) : (
                <Select
                  value={String(config.connectionId ?? "")}
                  onValueChange={(v) => setConfig({ ...config, connectionId: parseInt(v), openaiApiKeyEnv: undefined })}
                >
                  <SelectTrigger><SelectValue placeholder="Select an OpenAI connection…" /></SelectTrigger>
                  <SelectContent>
                    {openaiConns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={String(config.model ?? "text-embedding-3-small")} onChange={(e) => setConfig({ ...config, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Content field</Label>
              <Input value={String(config.contentField ?? "content")} onChange={(e) => setConfig({ ...config, contentField: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Batch size</Label>
              <Input type="number" value={String(config.batchSize ?? 100)} onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 100 })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="emb-dryrun" checked={Boolean(config.dryRun ?? false)} onChange={(e) => setConfig({ ...config, dryRun: e.target.checked })} />
              <Label htmlFor="emb-dryrun">Dry run (zero-vectors, no OpenAI call)</Label>
            </div>
            <p className="text-xs text-muted-foreground">1536-dim vectors. Per-batch error isolation — survivors continue, failures get embedding_error.</p>
          </>
        );
      }

      case "promote_meetings":
        return (
          <>
            <div className="space-y-2">
              <Label>Workflow on insert</Label>
              <Input value={String(config.workflowOnInsert ?? "unprocessed")} onChange={(e) => setConfig({ ...config, workflowOnInsert: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pm-classified"
                checked={Boolean(config.markClassified ?? true)}
                onChange={(e) => setConfig({ ...config, markClassified: e.target.checked })}
              />
              <Label htmlFor="pm-classified">Bump workflow → &apos;classified&apos; when classify_meeting ran</Label>
            </div>
            <p className="text-xs text-muted-foreground">Upserts by <code>fireflies_id</code>. Idempotent — re-running updates in place. Adds <code>meeting_db_id</code> to downstream rows.</p>
          </>
        );

      case "promote_entities":
        return (
          <>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pe-features"
                checked={Boolean(config.includeFeatures ?? false)}
                onChange={(e) => setConfig({ ...config, includeFeatures: e.target.checked })}
              />
              <Label htmlFor="pe-features">Include features (noisy — off by default)</Label>
            </div>
            <p className="text-xs text-muted-foreground">Upserts entities (person/company/product) keyed on (user, name, type). Records mentions in <code>entity_mentions</code>, bumping count on re-mention. Resolves meeting_id from fireflies_id, so it can run before or after promote_meetings as long as the meeting row exists.</p>
          </>
        );

      case "promote_chunks":
        return (
          <>
            <div className="space-y-2">
              <Label>Embedding model (record-keeping)</Label>
              <Input value={String(config.embeddingModel ?? "text-embedding-3-small")} onChange={(e) => setConfig({ ...config, embeddingModel: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pc-skip"
                checked={Boolean(config.skipMissingEmbeddings ?? true)}
                onChange={(e) => setConfig({ ...config, skipMissingEmbeddings: e.target.checked })}
              />
              <Label htmlFor="pc-skip">Skip rows without embedding</Label>
            </div>
            <p className="text-xs text-muted-foreground">Writes to <code>meeting_chunks</code> with pgvector(1536). Upserts by (meeting_id, chunk_index). Requires the parent meeting to exist — connect downstream of promote_meetings, or just ensure it ran first.</p>
          </>
        );

      default:
        return <p className="text-muted-foreground text-sm">No configuration needed.</p>;
    }
  };

  return (
    <Card className="absolute right-4 top-4 w-80 z-10 bg-card border-border shadow-xl max-h-[calc(100vh-32px)] flex flex-col">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{String(node.data.label)}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-muted-foreground">
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={String(node.data.label)}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="bg-background border-border"
          />
        </div>
        {isSource && (
          <div className="space-y-3 p-3 rounded-md border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trigger</Label>
              <span className="text-[10px] text-muted-foreground">source node</span>
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select
                value={String(triggerConfig.kind ?? "manual")}
                onValueChange={(v) => setTriggerConfig({ ...triggerConfig, kind: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (▶ button)</SelectItem>
                  <SelectItem value="cron">Cron (scheduled)</SelectItem>
                  <SelectItem value="webhook">Webhook (coming soon)</SelectItem>
                  <SelectItem value="event">Event (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {triggerConfig.kind === "cron" && (
              <div className="space-y-2">
                <Label>Schedule (cron expression, UTC)</Label>
                <Input
                  value={String(triggerConfig.schedule ?? "")}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, schedule: e.target.value })}
                  placeholder="0 * * * *  (every hour)"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Standard 5-field cron. Cron worker scans every minute; sub-minute precision not supported.
                </p>
              </div>
            )}
            {triggerConfig.kind === "webhook" && (
              <div className="space-y-2">
                <Label>Secret</Label>
                <div className="flex gap-2">
                  <Input
                    value={String(triggerConfig.secret ?? "")}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, secret: e.target.value })}
                    placeholder="Generate or paste a secret token"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const s = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
                      setTriggerConfig({ ...triggerConfig, secret: s });
                    }}
                  >
                    Gen
                  </Button>
                </div>
                <Label className="pt-2">Webhook URL</Label>
                <div className="p-2 rounded bg-background border border-border font-mono text-[10px] break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/pipelines/{pipelineId}/webhook/{node.id}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  POST a JSON object or array of objects to this URL with header{" "}
                  <code className="text-[10px]">X-Webhook-Secret: &lt;secret&gt;</code>{" "}
                  (or query param <code className="text-[10px]">?secret=…</code>). Body becomes the source row(s). Save the node first so the URL stays stable.
                </p>
              </div>
            )}
            {triggerConfig.kind === "event" && (
              <p className="text-xs text-muted-foreground">Not yet wired. Falls back to manual.</p>
            )}
          </div>
        )}
        {renderFields()}
        <Button onClick={save} disabled={saving} className="w-full" size="sm">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Run History ─────────────────────────────────────────────────────

function RunHistory({ pipelineId }: { pipelineId: number }) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);

  useEffect(() => {
    fetch(`/api/pipelines/${pipelineId}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [pipelineId]);

  if (runs.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">No runs yet.</p>;
  }

  return (
    <div className="p-6 space-y-3">
      {runs.map((run) => (
        <Card key={run.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>
                  {run.status}
                </Badge>
                <span className="text-xs text-muted-foreground">Run #{run.id}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(run.startedAt).toLocaleString()}
                {run.completedAt && ` → ${new Date(run.completedAt).toLocaleString()}`}
              </p>
              {run.errorMessage && <p className="text-xs text-destructive mt-1">{run.errorMessage}</p>}
            </div>
            <div className="text-right text-sm tabular-nums">
              <p>{run.rowsInput.toLocaleString()} in</p>
              <p className="text-green-500">{run.rowsOutput.toLocaleString()} out</p>
              {run.rowsErrored > 0 && <p className="text-destructive">{run.rowsErrored.toLocaleString()} err</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function PipelineDetailClient({ id }: { id: string }) {
  const pipelineId = parseInt(id);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [rfInstance, setRfInstance] = useState<{
    screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number };
    zoomIn: () => void;
    zoomOut: () => void;
    fitView: (o?: { padding?: number }) => void;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, canvas] = await Promise.all([
          apiFetch(`/api/pipelines/${pipelineId}`),
          apiFetch(`/api/pipelines/${pipelineId}/canvas`),
        ]);
        setPipeline(p);
        const flowNodes: Node<NodeData>[] = (canvas.nodes as DbNode[]).map((n) => ({
          id: n.id.toString(),
          type: "pipeline",
          position: { x: n.positionX, y: n.positionY },
          data: {
            label: n.label,
            type: n.type,
            config: n.configJson ? JSON.parse(n.configJson) : {},
            triggerConfig: (n.triggerConfig && typeof n.triggerConfig === 'object') ? n.triggerConfig : { kind: 'manual' },
          },
        }));
        const flowEdges: Edge[] = (canvas.edges as DbEdge[]).map((e) => ({
          id: e.id.toString(),
          source: e.sourceNodeId.toString(),
          target: e.targetNodeId.toString(),
          label: e.label ?? undefined,
          animated: true,
          style: { stroke: "#266DF0", strokeWidth: 2 },
        }));
        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error("Load pipeline error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pipelineId, setNodes, setEdges]);

  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge({ ...conn, animated: true, style: { stroke: "#266DF0", strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  // Only close the inspector via the explicit close/save actions.
  // Pane clicks should not reset the inspector — the Select portal (rendered
  // outside the React Flow DOM) can accidentally trigger onPaneClick via
  // React's synthetic event bubbling, which would cause the inspector to
  // unmount/remount and lose in-progress edits.
  const onPaneClick = useCallback(() => {/* intentionally no-op */}, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow");
    if (!type || !rfInstance) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const label = PALETTE_GROUPS.flatMap((g) => g.items).find((i) => i.type === type)?.label ?? type;
    const newNode: Node<NodeData> = {
      id: `node-${Date.now()}`,
      type: "pipeline",
      position,
      data: { label, type, config: {}, triggerConfig: { kind: 'manual' } },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance, setNodes]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)
    );
  }, [setNodes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/pipelines/${pipelineId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      toast.success("Pipeline saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await apiFetch(`/api/pipelines/${pipelineId}/run`, { method: "POST" });
      toast.success(`Run ${result.status}: ${result.rowsOutput ?? 0} rows processed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Link href="/pipelines">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{pipeline?.name ?? `Pipeline #${pipelineId}`}</h1>
              {pipeline && (
                <Badge variant="secondary" className="capitalize">{pipeline.status}</Badge>
              )}
            </div>
            {pipeline?.description && <p className="text-sm text-muted-foreground">{pipeline.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="canvas" className="h-full flex flex-col">
          <TabsList className="px-6 bg-background border-b border-border rounded-none h-10">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="runs">Run History</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="flex-1 m-0 p-0 relative">
            <div className="relative w-full h-full">
              <PipelinePalette />
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
                onInit={setRfInstance}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.5 }}
                minZoom={0.2}
                maxZoom={1.5}
                className="bg-background"
                style={{ background: "var(--background)" }}
              >
                <Background color="var(--border)" variant={BackgroundVariant.Dots} gap={20} size={1} />
                <MiniMap
                  nodeColor="var(--primary)"
                  maskColor="color-mix(in oklab, var(--background) 80%, transparent)"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                />
                <Controls
                  showInteractive={false}
                  className="bg-card border border-border [&>button]:bg-card [&>button]:border-border [&>button]:text-foreground [&>button:hover]:bg-accent"
                />
                <Panel position="top-right" className="flex gap-2">
                  <Button onClick={() => rfInstance?.zoomIn()} size="icon" variant="outline" className="bg-card border-border">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => rfInstance?.zoomOut()} size="icon" variant="outline" className="bg-card border-border">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => rfInstance?.fitView({ padding: 0.2 })} size="icon" variant="outline" className="bg-card border-border">
                    <Maximize className="h-4 w-4" />
                  </Button>
                </Panel>
              </ReactFlow>
              {selectedNode && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <PipelineNodeConfig
                    key={selectedNode.id}
                    node={selectedNode}
                    pipelineId={pipelineId}
                    isSource={!edges.some((e) => e.target === selectedNode.id)}
                    onUpdate={handleNodeUpdate}
                    onClose={() => setSelectedNode(null)}
                    getAllNodes={() => nodes}
                    getAllEdges={() => edges}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="runs" className="flex-1 overflow-auto">
            <RunHistory pipelineId={pipelineId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
