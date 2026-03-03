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
        status: 'active',
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
      message: 'Campaign activated successfully'
    });
  } catch (err) {
    console.error('Activate campaign error:', err);
    return NextResponse.json({ 
      error: 'Failed to activate campaign',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
