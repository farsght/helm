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
  Mail,
  Sheet,
  Slack,
  Database,
  Send,
  Building2,
  Plug,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/components/page';

// ── Types ─────────────────────────────────────────────────────────────

interface Connection {
  id: number;
  userId: string;
  kind: string;
  name: string;
  metadataJson: string | null;
  status: string;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type ConnectionKind =
  | 'fireflies'
  | 'openai'
  | 'hubspot'
  | 'slack'
  | 'resend'
  | 'postgres'
  | 'gmail'
  | 'google_sheets';

interface KindMeta {
  label: string;
  icon: React.ElementType;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
}

const KIND_META: Record<ConnectionKind, KindMeta> = {
  fireflies: {
    label: 'Fireflies.ai',
    icon: Flame,
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'ff-...' }],
  },
  openai: {
    label: 'OpenAI',
    icon: Brain,
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }],
  },
  hubspot: {
    label: 'HubSpot',
    icon: Building2,
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'pat-na1-...',
      },
    ],
  },
  slack: {
    label: 'Slack',
    icon: Slack,
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
    ],
  },
  resend: {
    label: 'Resend',
    icon: Send,
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_...' }],
  },
  postgres: {
    label: 'Postgres',
    icon: Database,
    fields: [
      {
        key: 'connectionString',
        label: 'Connection String',
        type: 'password',
        placeholder: 'postgresql://user:pass@host/db',
      },
    ],
  },
  gmail: {
    label: 'Gmail',
    icon: Mail,
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'ya29...' },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        type: 'password',
        placeholder: '1//...',
      },
    ],
  },
  google_sheets: {
    label: 'Google Sheets',
    icon: Sheet,
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'ya29...' },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        type: 'password',
        placeholder: '1//...',
      },
    ],
  },
};

const ALL_KINDS = Object.keys(KIND_META) as ConnectionKind[];

// ── Status badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return (
      <Badge variant="outline" className="text-green-600 border-green-600/40 bg-green-600/10">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
      </Badge>
    );
  if (status === 'error')
    return (
      <Badge variant="outline" className="text-red-500 border-red-500/40 bg-red-500/10">
        <AlertTriangle className="h-3 w-3 mr-1" /> Error
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-yellow-500 border-yellow-500/40 bg-yellow-500/10">
      <Clock className="h-3 w-3 mr-1" /> {status}
    </Badge>
  );
}

// ── Kind icon ─────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: string }) {
  const meta = KIND_META[kind as ConnectionKind];
  const Icon = meta?.icon ?? Plug;
  return <Icon className="h-5 w-5 text-muted-foreground" />;
}

// ── Add connection dialog ─────────────────────────────────────────────

interface AddDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conn: Connection) => void;
}

function AddConnectionDialog({ open, onClose, onCreated }: AddDialogProps) {
  const [kind, setKind] = useState<ConnectionKind | ''>('');
  const [name, setName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const kindMeta = kind ? KIND_META[kind] : null;

  const reset = useCallback(() => {
    setKind('');
    setName('');
    setFieldValues({});
    setError('');
    setSubmitting(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind || !kindMeta) return;
    setSubmitting(true);
    setError('');

    // Build credentials object from field values
    const credentials: Record<string, string> = {};
    for (const field of kindMeta.fields) {
      const val = fieldValues[field.key] ?? '';
      if (!val.trim()) {
        setError(`${field.label} is required`);
        setSubmitting(false);
        return;
      }
      credentials[field.key] = val.trim();
    }

    try {
      const conn = await apiFetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name: name.trim() || kindMeta.label, credentials }),
      });
      onCreated(conn as Connection);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Kind selector */}
          <div className="space-y-1.5">
            <Label>Integration</Label>
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v as ConnectionKind);
                setFieldValues({});
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
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label>Name (label)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kindMeta ? `e.g. Bitwage ${kindMeta.label}` : 'e.g. My Connection'}
            />
          </div>

          {/* Kind-specific fields */}
          {kindMeta?.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                type={field.type ?? 'text'}
                value={fieldValues[field.key] ?? ''}
                onChange={(e) =>
                  setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                autoComplete="off"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!kind || submitting}>
              {submitting ? 'Saving…' : 'Add Connection'}
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
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  useEffect(() => {
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

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const result = await apiFetch(`/api/connections/${id}/test`, { method: 'POST' });
      if (result.ok) {
        alert('✅ Connection is healthy');
      } else {
        alert(`❌ Test failed: ${result.error ?? 'Unknown error'}`);
      }
      // Refresh to pick up updated status
      const updated = await apiFetch(`/api/connections/${id}`).catch(() => null);
      if (updated) {
        setConns((prev) => prev.map((c) => (c.id === id ? (updated as Connection) : c)));
      }
    } catch (err) {
      alert(`❌ Test failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/connections/${id}`, { method: 'DELETE' });
      setConns((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setDeleteId(null);
    }
  };

  const handleCreated = (conn: Connection) => {
    setConns((prev) => [conn, ...prev]);
    router.refresh();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Connections"
          description="Manage API credentials for your external integrations. Credentials are encrypted at rest."
        />
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Connection
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : conns.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <Plug className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No connections yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conns.map((conn) => {
            const meta = KIND_META[conn.kind as ConnectionKind];
            const isTesting = testing === conn.id;

            return (
              <Card key={conn.id} className="bg-card border-border flex flex-col">
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
                    <StatusBadge status={conn.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex flex-col gap-3 flex-1 justify-end">
                  {conn.lastTestedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last tested:{' '}
                      {new Date(conn.lastTestedAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTest(conn.id)}
                      disabled={isTesting}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isTesting ? 'animate-spin' : ''}`} />
                      {isTesting ? 'Testing…' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(conn.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddConnectionDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      {deleteId !== null && (
        <ConfirmDialog
          open={deleteId !== null}
          onOpenChange={(o) => { if (!o) setDeleteId(null); }}
          title="Delete Connection"
          description="This will permanently delete the connection and its encrypted credentials. Pipelines using this connection's ID will need to be updated."
          onConfirm={() => handleDelete(deleteId)}
          destructive
        />
      )}
    </div>
  );
}
