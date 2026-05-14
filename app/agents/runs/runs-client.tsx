'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, CheckCircle2, XCircle, Loader2, Activity } from 'lucide-react';
import { PageHeader } from '@/components/page';

interface Run {
  id: number;
  agentId: number;
  agentName: string;
  invokedByType: string;
  invokedById: number | null;
  status: string;
  decision: string | null;
  reasoning: string | null;
  tokensUsed: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function RunsClient() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/agents/runs').then(r => r.json()).then(data => {
      setRuns(Array.isArray(data) ? data : []);
    }).catch(err => console.error('Fetch runs error:', err));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <PageHeader
          title="Agent Runs"
          description="Every agent invocation across the platform — workflows, manual tests, conversations, and cron jobs. Last 100 runs."
        />
      </div>

      {runs.length === 0 ? (
        <Card className="bg-card border-border p-12">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No runs yet</h3>
            <p className="text-muted-foreground">Test an agent from the library to see runs here.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const Icon = STATUS_ICON[run.status] ?? Loader2;
            const isOpen = expanded === run.id;
            return (
              <Card
                key={run.id}
                className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : run.id)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${
                      run.status === 'completed' ? 'text-green-400' :
                      run.status === 'failed' ? 'text-red-400' :
                      'text-muted-foreground animate-spin'
                    }`} />
                    <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground font-medium">{run.agentName}</span>
                    {run.decision && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        {run.decision}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {run.invokedByType}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {formatRelative(run.startedAt)}
                    </span>
                    {run.tokensUsed !== null && (
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">
                        {run.tokensUsed}t
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {run.errorMessage && (
                        <div className="text-sm text-red-300 bg-red-500/10 p-2 rounded">
                          <strong>Error:</strong> {run.errorMessage}
                        </div>
                      )}
                      {run.reasoning && (
                        <div>
                          <div className="text-xs text-muted-foreground uppercase mb-1">Reasoning</div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{run.reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
