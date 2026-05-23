import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { listConnections, createConnection } from '@/lib/connections';
import type { ConnectionKind } from '@/lib/connections';

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const kind = request.nextUrl.searchParams.get('kind') ?? undefined;
  const status = request.nextUrl.searchParams.get('status') ?? undefined;

  try {
    const rows = await listConnections(userId, { kind, status });
    return NextResponse.json(rows);
  } catch (err) {
    console.error('List connections error:', err);
    return NextResponse.json({ error: 'Failed to list connections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as {
      kind: ConnectionKind;
      provider?: string;
      name: string;
      description?: string;
      secret: Record<string, string>;
      config?: Record<string, unknown>;
    };

    if (!body.kind) return NextResponse.json({ error: 'kind is required' }, { status: 400 });
    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!body.secret || typeof body.secret !== 'object') {
      return NextResponse.json({ error: 'secret object is required' }, { status: 400 });
    }

    const conn = await createConnection({
      userId,
      kind: body.kind,
      provider: body.provider ?? body.kind,
      name: body.name,
      description: body.description,
      secret: body.secret as unknown as import('@/lib/connections').AnySecret,
      config: body.config,
    });

    return NextResponse.json(conn, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Unique constraint violation (duplicate name)
    if (msg.includes('connections_user_name_unique')) {
      return NextResponse.json({ error: 'A connection with that name already exists' }, { status: 409 });
    }
    console.error('Create connection error:', err);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}
