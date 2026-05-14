'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { Play, Loader2 } from 'lucide-react';
import type { Agent } from '@/app/agents/agents-client';

interface AgentTestRunnerProps {
  agent: Agent;
  onClose: () => void;
}

interface TestResult {
  runId: number;
  decision: string;
  reasoning: string;
  tokensUsed: number | null;
}

/**
 * Extract {{variable}} names from a template string.
 * Returns unique names in order of first appearance.
 */
function extractVariables(template: string): string[] {
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

export function AgentTestRunner({ agent, onClose }: AgentTestRunnerProps) {
  const variables = useMemo(() => {
    return Array.from(new Set([
      ...extractVariables(agent.systemPrompt),
      ...extractVariables(agent.userPromptTemplate),
    ]));
  }, [agent.systemPrompt, agent.userPromptTemplate]);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map(v => [v, '']))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch(`/api/agents/${agent.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: values }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Test: {agent.name}</h2>
        <p className="text-sm text-muted-foreground">
          Fill in template variables and run the agent live. Results are logged to agent runs.
        </p>
      </div>

      {variables.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          This agent has no template variables. It will run with the prompts as-written.
        </p>
      ) : (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Variables</Label>
          {variables.map((v) => (
            <div key={v} className="space-y-1">
              <Label htmlFor={`var-${v}`} className="text-xs font-mono">{`{{${v}}}`}</Label>
              <Input
                id={`var-${v}`}
                value={values[v] ?? ''}
                onChange={(e) => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Value for ${v}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleRun} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
          ) : (
            <><Play className="h-4 w-4 mr-2" />Run Agent</>
          )}
        </Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Decision:</span>
            <Badge className="bg-primary/10 text-primary">{result.decision}</Badge>
            {result.tokensUsed !== null && (
              <span className="ml-auto text-xs text-muted-foreground">{result.tokensUsed} tokens</span>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reasoning</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{result.reasoning}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Run #{result.runId} — saved to history.
          </div>
        </div>
      )}
    </div>
  );
}
