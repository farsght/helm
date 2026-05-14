import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { agentDefinitions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(agentDefinitions)
      .where(eq(agentDefinitions.userId, userId))
      .orderBy(sql`${agentDefinitions.updatedAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch agents error:', err);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 422 });
    }

    // Output schema validation: must be { decisions: string[] } with at least one entry.
    let outputSchemaJson = '{"decisions":["continue","stop"]}';
    if (body.outputSchema) {
      const decisions = body.outputSchema.decisions;
      if (!Array.isArray(decisions) || decisions.length === 0 || !decisions.every((d: unknown) => typeof d === 'string' && d.length > 0)) {
        return NextResponse.json({ error: 'outputSchema.decisions must be a non-empty array of strings' }, { status: 422 });
      }
      outputSchemaJson = JSON.stringify({ decisions });
    }

    const [agent] = await db
      .insert(agentDefinitions)
      .values({
        userId,
        name: body.name,
        description: body.description ?? null,
        model: body.model || 'openai:gpt-4o-mini',
        systemPrompt: body.systemPrompt || '',
        userPromptTemplate: body.userPromptTemplate || '',
        modelParamsJson: body.modelParams ? JSON.stringify(body.modelParams) : null,
        outputSchemaJson,
        maxTurns: body.maxTurns ?? 5,
      })
      .returning();
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    console.error('Create agent error:', err);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
