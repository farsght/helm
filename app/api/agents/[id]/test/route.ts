import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { agentDefinitions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { runAgent, AgentRuntimeError, AgentNotFoundError, AgentConfigError } from '@/lib/agent-runtime';

/**
 * Manual test invocation for an agent.
 * POST body: { variables: Record<string, unknown> }
 * Returns the AgentRunResult or a structured error.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);

  const [agent] = await db
    .select()
    .from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, agentId), eq(agentDefinitions.userId, userId)))
    .limit(1);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { variables?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { body = {}; }
  const variables = body.variables ?? {};
  // Type guard: variables must be string|number|null|undefined values for the runtime.
  const cleanVars: Record<string, string | number | null | undefined> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number') {
      cleanVars[k] = v;
    } else {
      cleanVars[k] = String(v);
    }
  }

  try {
    const result = await runAgent(agentId, {
      invokedByType: 'manual',
      userId,
      variables: cleanVars,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AgentNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof AgentConfigError) return NextResponse.json({ error: err.message }, { status: 422 });
    if (err instanceof AgentRuntimeError) return NextResponse.json({ error: err.message }, { status: 500 });
    console.error('Agent test run error:', err);
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
