'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Agent } from '@/app/agents/agents-client';

const MODEL_OPTIONS = [
  { value: 'openai:gpt-4o-mini', label: 'GPT-4o mini (fast, cheap)' },
  { value: 'openai:gpt-4o', label: 'GPT-4o (balanced)' },
  { value: 'openai:gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'anthropic:claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (fast)' },
  { value: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (balanced)' },
  { value: 'anthropic:claude-3-opus-20240229', label: 'Claude 3 Opus (most capable)' },
];

interface AgentEditorProps {
  agent?: Agent;
  onSave: (payload: {
    name: string;
    description?: string;
    model: string;
    systemPrompt: string;
    userPromptTemplate: string;
    outputSchema: { decisions: string[] };
    modelParams?: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
}

function parseDecisions(json: string | undefined): string[] {
  if (!json) return ['continue', 'stop'];
  try {
    const p = JSON.parse(json);
    return Array.isArray(p?.decisions) ? p.decisions : ['continue', 'stop'];
  } catch { return ['continue', 'stop']; }
}

function parseModelParams(json: string | null | undefined): { temperature?: number } {
  if (!json) return {};
  try {
    const p = JSON.parse(json);
    return typeof p === 'object' && p !== null ? p : {};
  } catch { return {}; }
}

export function AgentEditor({ agent, onSave, onCancel }: AgentEditorProps) {
  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [model, setModel] = useState(agent?.model ?? 'openai:gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');
  const [userPromptTemplate, setUserPromptTemplate] = useState(agent?.userPromptTemplate ?? '');
  const [decisions, setDecisions] = useState<string[]>(parseDecisions(agent?.outputSchemaJson));
  const [newDecision, setNewDecision] = useState('');
  const initialTemp = parseModelParams(agent?.modelParamsJson).temperature ?? 0.7;
  const [temperature, setTemperature] = useState<number>(initialTemp);

  const addDecision = () => {
    const trimmed = newDecision.trim();
    if (!trimmed || decisions.includes(trimmed)) return;
    setDecisions([...decisions, trimmed]);
    setNewDecision('');
  };

  const removeDecision = (d: string) => {
    setDecisions(decisions.filter(x => x !== d));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name is required'); return; }
    if (decisions.length === 0) { alert('At least one decision is required'); return; }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      model,
      systemPrompt,
      userPromptTemplate,
      outputSchema: { decisions },
      modelParams: { temperature },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          {agent ? 'Edit Agent' : 'Create Agent'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Reusable AI persona. Choose a model, write the prompt, define what decisions it can return.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lead Qualifier"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this agent does (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {MODEL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Format: provider:model-id (e.g. openai:gpt-4o-mini)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a sales SDR specializing in cross-border payroll. Your job is to qualify inbound leads..."
          className="min-h-[100px] font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="userPromptTemplate">User Prompt Template</Label>
        <Textarea
          id="userPromptTemplate"
          value={userPromptTemplate}
          onChange={(e) => setUserPromptTemplate(e.target.value)}
          placeholder={'Lead: {{firstName}} {{lastName}} at {{company}}\nTitle: {{title}}\nEmail: {{email}}\n\nQualify this lead.'}
          className="min-h-[120px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use {`{{variable}}`} for substitutions. Common: firstName, lastName, email, company, title.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Decisions (output choices)</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {decisions.map((d) => (
            <Badge key={d} variant="secondary" className="bg-primary/10 text-primary pl-2 pr-1 gap-1">
              {d}
              <button
                type="button"
                onClick={() => removeDecision(d)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newDecision}
            onChange={(e) => setNewDecision(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDecision(); } }}
            placeholder="e.g. interested, not_interested, needs_info"
          />
          <Button type="button" variant="outline" onClick={addDecision}>Add</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The model must pick exactly one of these. In workflows, edges branch by decision label.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="temperature">Temperature: {temperature.toFixed(2)}</Label>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          0 = deterministic. 1 = creative. For decision-making, 0.2-0.4 works well.
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {agent ? 'Save Changes' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
}
