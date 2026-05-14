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
import { BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PageHeader, ConfirmDialog } from '@/components/page';

interface Skill {
  id: number;
  name: string;
  description: string | null;
  body: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export function SkillsClient() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then((data) => {
      setSkills(Array.isArray(data) ? data : []);
    }).catch((err) => console.error('Fetch skills error:', err));
  }, []);

  const handleSave = async (payload: { name: string; description?: string; body: string; category?: string }) => {
    try {
      if (editing) {
        const updated = await apiFetch(`/api/skills/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await apiFetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setSkills((prev) => [created, ...prev]);
      }
      setShowEditor(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await apiFetch(`/api/skills/${id}`, { method: 'DELETE' });
      setSkills((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <PageHeader
            title="Skills"
            description="Reusable markdown blocks that get loaded into your agents' system prompts. Best for HOW-to procedural knowledge — qualification frameworks, voice guides, objection-handling playbooks. Small (<10KB)."
            actions={
              <Button onClick={() => { setEditing(null); setShowEditor(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Create Skill
              </Button>
            }
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {skills.map((skill) => (
            <Card key={skill.id} className="bg-card border-border hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <CardTitle className="text-foreground">{skill.name}</CardTitle>
                    </div>
                    {skill.description && (
                      <CardDescription className="text-muted-foreground text-sm">
                        {skill.description}
                      </CardDescription>
                    )}
                  </div>
                  {skill.category && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      {skill.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground line-clamp-3 bg-background p-3 rounded-md border border-border font-mono">
                  {skill.body || '(empty)'}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{skill.body.length.toLocaleString()} chars</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(skill); setShowEditor(true); }} className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(skill.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {skills.length === 0 && (
          <Card className="bg-card border-border p-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No skills yet</h3>
              <p className="text-muted-foreground mb-6">Create your first skill — a reusable markdown block of HOW-to instructions.</p>
              <Button onClick={() => { setEditing(null); setShowEditor(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Create Skill
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <SkillEditor skill={editing || undefined} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditing(null); }} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this skill?"
        description="Agents currently using it will fall back to their base prompt only."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

interface SkillEditorProps {
  skill?: Skill;
  onSave: (payload: { name: string; description?: string; body: string; category?: string }) => void;
  onCancel: () => void;
}

function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const [name, setName] = useState(skill?.name ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [category, setCategory] = useState(skill?.category ?? '');
  const [body, setBody] = useState(skill?.body ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name required'); return; }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      body,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">{skill ? 'Edit Skill' : 'Create Skill'}</h2>
        <p className="text-sm text-muted-foreground">Markdown content is loaded into the system prompt of every agent that has this skill attached.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cross-border Payroll Qualification" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="What this skill teaches the agent (optional)" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={category ?? ''} onChange={(e) => setCategory(e.target.value)} placeholder="qualification, voice, objection-handling..." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body (Markdown)</Label>
        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[300px] font-mono text-sm" placeholder={'# When qualifying inbound leads\n\n1. Check if they have international contractors...\n2. Verify their team size is 10+...\n'} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{body.length.toLocaleString()} chars</span>
          {body.length > 10_000 && <span className="text-amber-400">⚠️ Over 10KB — consider splitting or using a knowledge resource (Tier 2).</span>}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {skill ? 'Save Changes' : 'Create Skill'}
        </Button>
      </div>
    </form>
  );
}
