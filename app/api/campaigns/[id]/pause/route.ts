import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [campaign] = await db.update(campaigns)
      .set({ 
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, parseInt(id)))
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
