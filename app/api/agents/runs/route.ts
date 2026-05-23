import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { agentRuns, agentDefinitions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Join to surface the agent name in the list view.
    const rows = await db
      .select({
        id: agentRuns.id,
        agentId: agentRuns.agentId,
        agentName: agentDefinitions.name,
        invokedByType: agentRuns.invokedByType,
        invokedById: agentRuns.invokedById,
        status: agentRuns.status,
        decision: agentRuns.decision,
        reasoning: agentRuns.reasoning,
        tokensUsed: agentRuns.tokensUsed,
        errorMessage: agentRuns.errorMessage,
        startedAt: agentRuns.startedAt,
        completedAt: agentRuns.completedAt,
      })
      .from(agentRuns)
      .innerJoin(agentDefinitions, eq(agentRuns.agentId, agentDefinitions.id))
      .where(eq(agentRuns.userId, userId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(100);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch agent runs error:', err);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
