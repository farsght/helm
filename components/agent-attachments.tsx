'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Plug, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Skill { id: number; name: string; description: string | null; category: string | null; }
interface McpServer { id: number; name: string; description: string | null; toolsCacheJson: string | null; }
interface McpTool { name: string; description?: string; }

interface AttachedSkill { skillId: number; name: string; position: number; }
interface AttachedMcp { mcpServerId: number; name: string; enabledToolsJson: string | null; toolsCacheJson: string | null; }

/**
 * Shows two collapsible sections — Skills and MCP Servers — for managing
 * what's attached to a given agent. Used inside the agent editor and
 * (later) as an inline panel on the agent canvas.
 */
export function AgentAttachments({ agentId }: { agentId: number }) {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allServers, setAllServers] = useState<McpServer[]>([]);
  const [attachedSkillIds, setAttachedSkillIds] = useState<number[]>([]);
  const [attachedMcp, setAttachedMcp] = useState<Map<number, string[] | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSkills, setOpenSkills] = useState(true);
  const [openMcp, setOpenMcp] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [skills, servers, attSkills, attMcp] = await Promise.all([
          apiFetch('/api/skills'),
          apiFetch('/api/mcp-servers'),
          apiFetch(`/api/agents/${agentId}/skills`),
          apiFetch(`/api/agents/${agentId}/mcp`),
        ]);
        if (cancelled) return;
        setAllSkills(skills);
        setAllServers(servers);
        setAttachedSkillIds((attSkills as AttachedSkill[]).map((s) => s.skillId));
        const mcpMap = new Map<number, string[] | null>();
        for (const m of attMcp as AttachedMcp[]) {
          let enabled: string[] | null = null;
          if (m.enabledToolsJson) {
            try { const parsed = JSON.parse(m.enabledToolsJson); if (Array.isArray(parsed)) enabled = parsed; } catch {}
          }
          mcpMap.set(m.mcpServerId, enabled);
        }
        setAttachedMcp(mcpMap);
      } catch (err) {
        console.error('Load attachments error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  const toggleSkill = (id: number) => {
    setAttachedSkillIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleMcp = (id: number) => {
    setAttachedMcp((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, null); // all tools enabled
      return next;
    });
  };

  const toggleMcpTool = (serverId: number, toolName: string) => {
    setAttachedMcp((prev) => {
      const next = new Map(prev);
      const server = allServers.find((s) => s.id === serverId);
      const allTools = parseToolList(server?.toolsCacheJson ?? null).map((t) => t.name);
      const current = next.get(serverId);
      // null = all enabled; explicit array = whitelist
      const currentSet = new Set(current ?? allTools);
      if (currentSet.has(toolName)) currentSet.delete(toolName); else currentSet.add(toolName);
      // If the resulting set equals all tools, collapse to null (= all)
      if (currentSet.size === allTools.length && allTools.every((t) => currentSet.has(t))) {
        next.set(serverId, null);
      } else {
        next.set(serverId, Array.from(currentSet));
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        apiFetch(`/api/agents/${agentId}/skills`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillIds: attachedSkillIds }),
        }),
        apiFetch(`/api/agents/${agentId}/mcp`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            servers: Array.from(attachedMcp.entries()).map(([mcpServerId, enabledTools]) => ({
              mcpServerId, enabledTools: enabledTools ?? undefined,
            })),
          }),
        }),
      ]);
      alert('Attachments saved ✓');
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skills */}
      <div className="space-y-3">
        <button type="button" onClick={() => setOpenSkills((o) => !o)} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
          {openSkills ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <BookOpen className="h-4 w-4" />
          Skills
          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{attachedSkillIds.length}</Badge>
        </button>
        {openSkills && (
          <div className="pl-6 space-y-2">
            {allSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No skills yet — create some in Agents → Skills.</p>
            ) : (
              allSkills.map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded p-2 -ml-2">
                  <Checkbox checked={attachedSkillIds.includes(s.id)} onCheckedChange={() => toggleSkill(s.id)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{s.name}</span>
                      {s.category && <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{s.category}</Badge>}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* MCP Servers */}
      <div className="space-y-3">
        <button type="button" onClick={() => setOpenMcp((o) => !o)} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
          {openMcp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Plug className="h-4 w-4" />
          MCP Servers
          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{attachedMcp.size}</Badge>
        </button>
        {openMcp && (
          <div className="pl-6 space-y-3">
            {allServers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No MCP servers yet — add some in Integrations → MCP Servers.</p>
            ) : (
              allServers.map((s) => {
                const tools = parseToolList(s.toolsCacheJson);
                const attached = attachedMcp.has(s.id);
                const enabled = attachedMcp.get(s.id); // null = all, array = whitelist
                return (
                  <div key={s.id} className="border border-border rounded-md p-3 bg-card/50">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={attached} onCheckedChange={() => toggleMcp(s.id)} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{s.name}</div>
                        {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{tools.length} tools available</p>
                      </div>
                    </label>
                    {attached && tools.length > 0 && (
                      <div className="mt-3 pl-6 space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase">Tools available to agent</Label>
                        <div className="grid grid-cols-2 gap-1">
                          {tools.map((t) => {
                            const isOn = enabled === null || (enabled !== undefined && enabled.includes(t.name));
                            return (
                              <label key={t.name} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                                <Checkbox checked={isOn} onCheckedChange={() => toggleMcpTool(s.id, t.name)} />
                                <span className="font-mono text-foreground">{t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Attachments'}
        </Button>
      </div>
    </div>
  );
}

function parseToolList(json: string | null): McpTool[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p : []; } catch { return []; }
}
