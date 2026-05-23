import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { revokeConnection } from '@/lib/connections';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await revokeConnection(connectionId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('Revoke connection error:', err);
    return NextResponse.json({ error: 'Failed to revoke connection' }, { status: 500 });
  }
}
