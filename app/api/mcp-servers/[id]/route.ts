import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function loadServer(id: number, userId: string) {
  const [row] = await db.select().from(mcpServers)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.userId, userId))).limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const row = await loadServer(Number(id), userId);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sid = Number(id);
  const existing = await loadServer(sid, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === 'string') updates.name = body.name;
    if ('description' in body) updates.description = body.description;
    if (typeof body.url === 'string') updates.url = body.url;
    if ('authHeaders' in body) {
      updates.authHeadersJson = body.authHeaders ? JSON.stringify(body.authHeaders) : null;
    }
    const [updated] = await db.update(mcpServers).set(updates).where(eq(mcpServers.id, sid)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update mcp server error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const sid = Number(id);
  const existing = await loadServer(sid, userId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.delete(mcpServers).where(eq(mcpServers.id, sid));
  return NextResponse.json({ ok: true });
}
