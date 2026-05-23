import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { getConnection, updateConnection } from '@/lib/connections';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const conn = await getConnection(connectionId, userId);
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(conn);
  } catch (err) {
    console.error('Get connection error:', err);
    return NextResponse.json({ error: 'Failed to get connection' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
      secret?: Record<string, string>;
    };

    const conn = await updateConnection(connectionId, userId, {
      name: body.name,
      description: body.description,
      config: body.config,
      secret: body.secret as unknown as import('@/lib/connections').AnySecret | undefined,
    });
    return NextResponse.json(conn);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (msg.includes('revoked')) return NextResponse.json({ error: msg }, { status: 409 });
    if (msg.includes('connections_user_name_unique')) {
      return NextResponse.json({ error: 'A connection with that name already exists' }, { status: 409 });
    }
    console.error('Update connection error:', err);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}
