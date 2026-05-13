import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db.select().from(settings).where(
      and(eq(settings.userId, userId), inArray(settings.key, ['linkedinAccessToken', 'linkedinMemberId', 'linkedinName', 'linkedinConnectedAt']))
    );

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    const connected = !!map['linkedinAccessToken'];
    return NextResponse.json({
      connected,
      name: map['linkedinName'] || undefined,
      memberId: map['linkedinMemberId'] || undefined,
      connectedAt: map['linkedinConnectedAt'] || undefined,
    });
  } catch (err) {
    console.error('GET linkedin settings error:', err);
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.delete(settings).where(
      and(eq(settings.userId, userId), inArray(settings.key, ['linkedinAccessToken', 'linkedinMemberId', 'linkedinName', 'linkedinUserAgent', 'linkedinConnectedAt']))
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE linkedin settings error:', err);
    return NextResponse.json({ error: 'Failed to disconnect LinkedIn' }, { status: 500 });
  }
}
