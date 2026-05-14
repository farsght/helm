'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plug, Plus, Edit, Trash2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/components/page';

interface McpServer {
  id: number;
  name: string;
  description: string | null;
  url: string;
  authHeadersJson: string | null;
  toolsCacheJson: string | null;
  lastVerifiedAt: string | null;
  lastErrorMessage: string | null;
}

interface McpTool {
  name: string;
  description?: string;
}

export function McpServersClient() {
  const router = useRouter();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<McpServer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/mcp-servers').then((r) => r.json()).then((data) => {
      setServers(Array.isArray(data) ? data : []);
    }).catch((err) => console.error('Fetch mcp servers error:', err));
  }, []);

  const handleSave = async (payload: { name: string; description?: string; url: string; authHeaders?: Record<string, string> }) => {
    try {
      if (editing) {
        const updated = await apiFetch(`/api/mcp-servers/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await apiFetch('/api/mcp-servers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setServers((prev) => [created, ...prev]);
      }
      setShowEditor(false); setEditing(null); router.refresh();
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleVerify = async (id: number) => {
    setVerifying(id);
    try {
      const result = await apiFetch(`/api/mcp-servers/${id}/verify`, { method: 'POST' });
      alert(`✅ Verified — found ${result.toolCount} tools`);
      const updated = await apiFetch(`/api/mcp-servers/${id}`);
      setServers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      alert(`❌ Verification failed: ${err instanceof Error ? err.message : 'Unknown'}`);
      const updated = await apiFetch(`/api/mcp-servers/${id}`).catch(() => null);
      if (updated) setServers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await apiFetch(`/api/mcp-servers/${id}`, { method: 'DELETE' });
      setServers((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const parseTools = (json: string | null): McpTool[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <PageHeader
            title="MCP Servers"
            description="Tool surfaces for agents. Each server exposes a set of tools (search, query, write) that agents can call during their reasoning loop. Different from Connections — these are agent-mediated, non-deterministic."
            actions={
              <Button onClick={() => { setEditing(null); setShowEditor(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Add Server
              </Button>
            }
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {servers.map((server) => {
            const tools = parseTools(server.toolsCacheJson);
            const isHealthy = server.lastVerifiedAt && !server.lastErrorMessage;
            const hasError = !!server.lastErrorMessage;
            return (
              <Card key={server.id} className="bg-card border-border hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Plug className="h-4 w-4 text-primary" />
                        <CardTitle className="text-foreground">{server.name}</CardTitle>
                        {isHealthy && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                        {hasError && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      </div>
                      {server.description && (
                        <CardDescription className="text-muted-foreground text-sm">
                          {server.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground font-mono break-all bg-background p-2 rounded border border-border">
                    {server.url}
                  </div>
                  {hasError && (
                    <div className="text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/30">
                      {server.lastErrorMessage}
                    </div>
                  )}
                  {tools.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{tools.length} tools</div>
                      <div className="flex flex-wrap gap-1">
                        {tools.slice(0, 6).map((t) => (
                          <Badge key={t.name} variant="secondary" className="bg-primary/10 text-primary text-xs font-mono">{t.name}</Badge>
                        ))}
                        {tools.length > 6 && <span className="text-xs text-muted-foreground">+{tools.length - 6} more</span>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => handleVerify(server.id)} disabled={verifying === server.id} className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent">
                      <RefreshCw className={`h-4 w-4 mr-1 ${verifying === server.id ? 'animate-spin' : ''}`} />
                      {verifying === server.id ? 'Checking...' : 'Verify'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(server); setShowEditor(true); }} className="text-muted-foreground hover:text-foreground hover:bg-accent">
                      <Edit className="h-4 w-4 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(server.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {servers.length === 0 && (
          <Card className="bg-card border-border p-12">
            <div className="text-center">
              <Plug className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No MCP servers yet</h3>
              <p className="text-muted-foreground mb-6">Connect your first HTTP MCP server. Once verified, attach it to any agent.</p>
              <Button onClick={() => { setEditing(null); setShowEditor(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />Add Server
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <McpServerEditor server={editing || undefined} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete this MCP server?" description="Agents currently using it will lose access to its tools." confirmLabel="Delete" destructive onConfirm={handleDelete} />
    </>
  );
}

interface McpServerEditorProps {
  server?: McpServer;
  onSave: (payload: { name: string; description?: string; url: string; authHeaders?: Record<string, string> }) => void;
  onCancel: () => void;
}

function McpServerEditor({ server, onSave, onCancel }: McpServerEditorProps) {
  const initialHeaders = server?.authHeadersJson ? safeParseObject(server.authHeadersJson) : {};
  const [name, setName] = useState(server?.name ?? '');
  const [description, setDescription] = useState(server?.description ?? '');
  const [url, setUrl] = useState(server?.url ?? '');
  const [headersText, setHeadersText] = useState(JSON.stringify(initialHeaders, null, 2));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name required'); return; }
    if (!url.trim()) { alert('URL required'); return; }
    let authHeaders: Record<string, string> | undefined;
    const trimmed = headersText.trim();
    if (trimmed && trimmed !== '{}') {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') authHeaders = parsed;
      } catch {
        alert('Auth headers must be valid JSON'); return;
      }
    }
    onSave({ name: name.trim(), description: description.trim() || undefined, url: url.trim(), authHeaders });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">{server ? 'Edit MCP Server' : 'Add MCP Server'}</h2>
        <p className="text-sm text-muted-foreground">HTTP MCP server. After saving, click Verify to fetch its tool list.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HubSpot" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="What this server provides (optional)" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/v1" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="headers">Auth Headers (JSON)</Label>
        <Textarea id="headers" value={headersText} onChange={(e) => setHeadersText(e.target.value)} className="min-h-[120px] font-mono text-sm" placeholder='{"Authorization": "Bearer ${HUBSPOT_TOKEN}"}' />
        <p className="text-xs text-muted-foreground">
          Use {'${ENV_VAR}'} to reference environment variables (recommended for secrets).
        </p>
      </div>
      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {server ? 'Save Changes' : 'Add Server'}
        </Button>
      </div>
    </form>
  );
}

function safeParseObject(s: string): Record<string, unknown> {
  try { const p = JSON.parse(s); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
}
