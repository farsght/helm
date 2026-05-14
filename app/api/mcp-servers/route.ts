import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await db.select().from(mcpServers)
      .where(eq(mcpServers.userId, userId))
      .orderBy(sql`${mcpServers.updatedAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch mcp servers error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
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
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 422 });
    }
    const authHeaders = body.authHeaders && typeof body.authHeaders === 'object' ? body.authHeaders : null;
    const [server] = await db.insert(mcpServers).values({
      userId,
      name: body.name,
      description: body.description ?? null,
      transport: body.transport === 'stdio' ? 'http' : 'http', // v1 http-only
      url: body.url,
      authHeadersJson: authHeaders ? JSON.stringify(authHeaders) : null,
    }).returning();
    return NextResponse.json(server, { status: 201 });
  } catch (err) {
    console.error('Create mcp server error:', err);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
