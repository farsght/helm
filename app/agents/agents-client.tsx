'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Bot, Plus, Edit, Trash2, Play } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/components/page';
import { AgentEditor } from '@/components/agent-editor';
import { AgentTestRunner } from '@/components/agent-test-runner';

export interface Agent {
  id: number;
  name: string;
  description: string | null;
  model: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchemaJson: string;
  modelParamsJson: string | null;
  maxTurns: number;
  createdAt: string;
  updatedAt: string;
}

export function AgentsClient() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testAgent, setTestAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(data => {
      setAgents(Array.isArray(data) ? data : []);
    }).catch(err => console.error('Fetch agents error:', err));
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setShowEditor(true);
  };

  const handleEdit = (a: Agent) => {
    setEditing(a);
    setShowEditor(true);
  };

  const handleSave = async (payload: {
    name: string;
    description?: string;
    model: string;
    systemPrompt: string;
    userPromptTemplate: string;
    outputSchema: { decisions: string[] };
    modelParams?: Record<string, unknown>;
  }) => {
    try {
      if (editing) {
        const updated = await apiFetch(`/api/agents/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await apiFetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setAgents(prev => [created, ...prev]);
      }
      setShowEditor(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save agent: ${msg}`);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await apiFetch(`/api/agents/${id}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== id));
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to delete agent: ${msg}`);
    }
  };

  const parseDecisions = (json: string): string[] => {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed?.decisions) ? parsed.decisions : [];
    } catch { return []; }
  };

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <PageHeader
            title="Agents"
            description="Reusable AI personas — prompts, models, and decision schemas. Use them in workflows, conversations, datasets, and more."
            actions={
              <Button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            }
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {agents.map((agent) => {
            const decisions = parseDecisions(agent.outputSchemaJson);
            return (
              <Card key={agent.id} className="bg-card border-border hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <CardTitle className="text-foreground">{agent.name}</CardTitle>
                      </div>
                      {agent.description && (
                        <CardDescription className="text-muted-foreground text-sm">
                          {agent.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      {agent.model}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent.systemPrompt && (
                    <div className="text-sm text-muted-foreground line-clamp-2 bg-background p-3 rounded-md border border-border">
                      {agent.systemPrompt}
                    </div>
                  )}
                  {decisions.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Decisions:</span>
                      {decisions.map((d) => (
                        <Badge key={d} variant="secondary" className="bg-primary/10 text-primary text-xs">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTestAgent(agent)}
                      className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(agent)}
                      className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(agent.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {agents.length === 0 && (
          <Card className="bg-card border-border p-12">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No agents yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first agent — pick a model, write a prompt, define decisions.
              </p>
              <Button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <AgentEditor
            agent={editing || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={testAgent !== null} onOpenChange={(o) => !o && setTestAgent(null)}>
        <DialogContent className="max-w-2xl bg-background border-border">
          {testAgent && <AgentTestRunner agent={testAgent} onClose={() => setTestAgent(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this agent?"
        description="This will also delete all run history for this agent. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
