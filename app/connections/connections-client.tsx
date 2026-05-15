'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Brain,
  Edit,
  Plug,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/components/page';

// ── Types ─────────────────────────────────────────────────────────────

interface Connection {
  id: number;
  userId: string;
  kind: string;
  provider: string;
  name: string;
  description: string | null;
  configJson: Record<string, unknown>;
  status: string;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
}

type SupportedKind = 'fireflies' | 'openai';

interface KindMeta {
  label: string;
  icon: React.ElementType;
  secretFields: { key: string; label: string; placeholder?: string; required?: boolean }[];
}

const KIND_META: Record<SupportedKind, KindMeta> = {
  fireflies: {
    label: 'Fireflies.ai',
    icon: Flame,
    secretFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'ff-...', required: true },
    ],
  },
  openai: {
    label: 'OpenAI',
    icon: Brain,
    secretFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', required: true },
      { key: 'baseUrl', label: 'Base URL (optional)', placeholder: 'https://api.openai.com' },
    ],
  },
};

const ALL_KINDS: SupportedKind[] = ['fireflies', 'openai'];

// ── Sub-components ────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: string }) {
  const meta = KIND_META[kind as SupportedKind];
  const Icon = meta?.icon ?? Plug;
  return <Icon className="h-5 w-5 text-muted-foreground shrink-0" />;
}

function StatusBadge({ conn }: { conn: Connection }) {
  if (conn.status === 'revoked') {
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 bg-muted/50">
        <XCircle className="h-3 w-3 mr-1" /> Revoked
      </Badge>
    );
  }
  if (conn.lastTestStatus === 'success') {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600/40 bg-green-600/10">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Healthy
      </Badge>
    );
  }
  if (conn.lastTestStatus === 'failed') {
    return (
      <Badge variant="outline" className="text-red-500 border-red-500/40 bg-red-500/10">
        <AlertTriangle className="h-3 w-3 mr-1" /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-yellow-500 border-yellow-500/40 bg-yellow-500/10">
      <Clock className="h-3 w-3 mr-1" /> Untested
    </Badge>
  );
}

// ── Create / Edit dialog ──────────────────────────────────────────────

interface ConnectionFormProps {
  open: boolean;
  editing: Connection | null;
  onClose: () => void;
  onSaved: (conn: Connection) => void;
}

function ConnectionForm({ open, editing, onClose, onSaved }: ConnectionFormProps) {
  const isEdit = editing !== null;

  const [kind, setKind] = useState<SupportedKind | ''>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [secretFields, setSecretFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Seed fields when editing
  useEffect(() => {
    if (editing) {
      setKind(editing.kind as SupportedKind);
      setName(editing.name);
      setDescription(editing.description ?? '');
      setSecretFields({});
    }
  }, [editing]);

  const reset = useCallback(() => {
    setKind('');
    setName('');
    setDescription('');
    setSecretFields({});
    setError('');
    setSubmitting(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const kindMeta = kind ? KIND_META[kind] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind || !kindMeta) return;
    setSubmitting(true);
    setError('');

    const secret: Record<string, string> = {};
    for (const field of kindMeta.secretFields) {
      const val = secretFields[field.key]?.trim() ?? '';
      if (field.required && !val && !isEdit) {
        setError(`${field.label} is required`);
        setSubmitting(false);
        return;
      }
      if (val) secret[field.key] = val;
    }

    try {
      let conn: Connection;
      if (isEdit) {
        const patch: Record<string, unknown> = {
          name: name.trim() || editing!.name,
          description: description || null,
        };
        if (Object.keys(secret).length > 0) patch.secret = secret;
        conn = await apiFetch(`/api/connections/${editing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } else {
        conn = await apiFetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            provider: kind,
            name: name.trim() || kindMeta.label,
            description: description || undefined,
            secret,
          }),
        });
      }
      onSaved(conn as Connection);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Connection' : 'Add Connection'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Kind selector (read-only when editing) */}
          <div className="space-y-1.5">
            <Label>Integration</Label>
            {isEdit ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <KindIcon kind={kind} />
                {KIND_META[kind as SupportedKind]?.label ?? kind}
              </div>
            ) : (
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as SupportedKind);
                  setSecretFields({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select integration…" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kindMeta ? `e.g. Bitwage ${kindMeta.label}` : 'e.g. My Connection'}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this connection for?"
              rows={2}
            />
          </div>

          {/* Secret fields */}
          {kindMeta?.secretFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>
                {field.label}
                {isEdit && !field.required && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(leave blank to keep existing)</span>
                )}
              </Label>
              <Input
                type="password"
                value={secretFields[field.key] ?? ''}
                onChange={(e) =>
                  setSecretFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={isEdit ? '••••••••' : field.placeholder}
                autoComplete="off"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={(!kind && !isEdit) || submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Connection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main client ───────────────────────────────────────────────────────

export function ConnectionsClient() {
  const router = useRouter();
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('all');

  const fetchConns = useCallback(() => {
    fetch('/api/connections')
      .then((r) => r.json())
      .then((data) => {
        setConns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch connections error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConns();
  }, [fetchConns]);

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const result = await apiFetch(`/api/connections/${id}/test`, { method: 'POST' }) as { ok: boolean; error?: string };
      if (result.ok) {
        // Refresh card to show new lastTestStatus
        const updated = await apiFetch(`/api/connections/${id}`).catch(() => null);
        if (updated) setConns((prev) => prev.map((c) => (c.id === id ? (updated as Connection) : c)));
      } else {
        const updated = await apiFetch(`/api/connections/${id}`).catch(() => null);
        if (updated) setConns((prev) => prev.map((c) => (c.id === id ? (updated as Connection) : c)));
        // Show error hint (non-blocking)
        console.warn(`Connection test failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Test error:', err);
    } finally {
      setTesting(null);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await apiFetch(`/api/connections/${id}/revoke`, { method: 'POST' });
      setConns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'revoked' } : c)),
      );
      router.refresh();
    } catch (err) {
      alert(`Failed to revoke: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setRevokeId(null);
    }
  };

  const handleSaved = (conn: Connection) => {
    setConns((prev) => {
      const existing = prev.findIndex((c) => c.id === conn.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = conn;
        return next;
      }
      return [conn, ...prev];
    });
    router.refresh();
  };

  const filtered = kindFilter === 'all' ? conns : conns.filter((c) => c.kind === kindFilter);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Connections"
          description="Manage API credentials for pipeline integrations. Secrets are AES-256-GCM encrypted at rest."
        />
        <Button onClick={() => { setEditing(null); setShowForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Connection
        </Button>
      </div>

      {/* Kind filter */}
      {conns.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={kindFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setKindFilter('all')}
          >
            All
          </Button>
          {ALL_KINDS.map((k) => (
            <Button
              key={k}
              variant={kindFilter === k ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setKindFilter(k)}
            >
              {KIND_META[k].label}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <Plug className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {conns.length === 0
                ? 'No connections yet. Add a Fireflies or OpenAI connection to get started.'
                : 'No connections match the selected filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((conn) => {
            const meta = KIND_META[conn.kind as SupportedKind];
            const isTesting = testing === conn.id;
            const isRevoked = conn.status === 'revoked';

            return (
              <Card
                key={conn.id}
                className={`bg-card border-border flex flex-col ${isRevoked ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <KindIcon kind={conn.kind} />
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">
                          {conn.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {meta?.label ?? conn.kind}
                        </CardDescription>
                      </div>
                    </div>
                    <StatusBadge conn={conn} />
                  </div>
                  {conn.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {conn.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex flex-col gap-3 flex-1 justify-end">
                  {/* Last test diagnostics */}
                  {conn.lastTestedAt && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        Tested:{' '}
                        {new Date(conn.lastTestedAt).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                      {conn.lastTestStatus === 'failed' && conn.lastTestError && (
                        <p className="text-red-500 line-clamp-1 text-[11px]">
                          {conn.lastTestError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!isRevoked && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleTest(conn.id)}
                          disabled={isTesting}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 mr-1.5 ${isTesting ? 'animate-spin' : ''}`}
                          />
                          {isTesting ? 'Testing…' : 'Test'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(conn);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeId(conn.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConnectionForm
        open={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {revokeId !== null && (
        <ConfirmDialog
          open={revokeId !== null}
          onOpenChange={(o) => { if (!o) setRevokeId(null); }}
          title="Revoke Connection"
          description="This will revoke the connection. Pipelines using this connection will fail at runtime. This cannot be undone."
          onConfirm={() => handleRevoke(revokeId)}
          destructive
        />
      )}
    </div>
  );
}
