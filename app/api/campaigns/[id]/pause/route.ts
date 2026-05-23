import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const [campaign] = await db.update(campaigns)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, parseInt(id)), eq(campaigns.userId, userId)))
      .returning();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign paused successfully'
    });
  } catch (err) {
    console.error('Pause campaign error:', err);
    return NextResponse.json({
      error: 'Failed to pause campaign',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
