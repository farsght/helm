import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { McpHttpClient, McpError, expandEnvVars } from '@/lib/mcp-client';

/**
 * Verify a MCP server: fetch its tool list, cache it, mark last-verified.
 * On failure, store the error message and clear the verified timestamp.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sid = Number(id);
  const [server] = await db.select().from(mcpServers)
    .where(and(eq(mcpServers.id, sid), eq(mcpServers.userId, userId))).limit(1);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let headers: Record<string, string> = {};
  if (server.authHeadersJson) {
    try { headers = expandEnvVars(JSON.parse(server.authHeadersJson)); } catch { /* malformed */ }
  }

  const client = new McpHttpClient({ url: server.url, headers, timeoutMs: 15_000 });
  try {
    const tools = await client.listTools();
    await db.update(mcpServers).set({
      toolsCacheJson: JSON.stringify(tools),
      toolsCachedAt: new Date(),
      lastVerifiedAt: new Date(),
      lastErrorMessage: null,
      updatedAt: new Date(),
    }).where(eq(mcpServers.id, sid));
    return NextResponse.json({ ok: true, toolCount: tools.length, tools });
  } catch (err) {
    const msg = err instanceof McpError ? err.message : (err instanceof Error ? err.message : String(err));
    await db.update(mcpServers).set({
      lastErrorMessage: msg,
      lastVerifiedAt: null,
      updatedAt: new Date(),
    }).where(eq(mcpServers.id, sid));
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
