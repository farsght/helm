import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { testConnection } from '@/lib/connections';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const result = await testConnection(connectionId, userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Test connection error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
