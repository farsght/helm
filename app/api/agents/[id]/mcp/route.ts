import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { agentDefinitions, mcpServers, agentMcpLinks } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function ensureOwnedAgent(agentId: number, userId: string) {
  const [a] = await db.select().from(agentDefinitions)
    .where(and(eq(agentDefinitions.id, agentId), eq(agentDefinitions.userId, userId))).limit(1);
  return a ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agent = await ensureOwnedAgent(Number(id), userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rows = await db.select({
    mcpServerId: mcpServers.id,
    name: mcpServers.name,
    url: mcpServers.url,
    description: mcpServers.description,
    toolsCacheJson: mcpServers.toolsCacheJson,
    enabledToolsJson: agentMcpLinks.enabledToolsJson,
    linkId: agentMcpLinks.id,
  }).from(agentMcpLinks)
    .innerJoin(mcpServers, eq(agentMcpLinks.mcpServerId, mcpServers.id))
    .where(eq(agentMcpLinks.agentId, agent.id));
  return NextResponse.json(rows);
}

/**
 * Replace MCP server attachments.
 * Body: { servers: Array<{ mcpServerId: number, enabledTools?: string[] }> }
 * enabledTools null/undefined = all tools exposed.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const agentId = Number(id);
  const agent = await ensureOwnedAgent(agentId, userId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (!Array.isArray(body.servers)) {
    return NextResponse.json({ error: 'servers must be an array' }, { status: 422 });
  }

  const owned = await db.select({ id: mcpServers.id }).from(mcpServers)
    .where(eq(mcpServers.userId, userId));
  const ownedSet = new Set(owned.map((r) => r.id));

  const entries: Array<{ agentId: number; mcpServerId: number; enabledToolsJson: string | null }> = [];
  for (const s of body.servers) {
    if (typeof s?.mcpServerId !== 'number' || !ownedSet.has(s.mcpServerId)) {
      return NextResponse.json({ error: `Invalid mcpServerId: ${s?.mcpServerId}` }, { status: 422 });
    }
    let enabledToolsJson: string | null = null;
    if (Array.isArray(s.enabledTools)) {
      if (!s.enabledTools.every((t: unknown) => typeof t === 'string')) {
        return NextResponse.json({ error: 'enabledTools must be string[]' }, { status: 422 });
      }
      enabledToolsJson = JSON.stringify(s.enabledTools);
    }
    entries.push({ agentId, mcpServerId: s.mcpServerId, enabledToolsJson });
  }

  await db.delete(agentMcpLinks).where(eq(agentMcpLinks.agentId, agentId));
  if (entries.length > 0) {
    await db.insert(agentMcpLinks).values(entries);
  }
  return NextResponse.json({ ok: true, count: entries.length });
}
