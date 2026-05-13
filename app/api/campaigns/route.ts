import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId));
    return NextResponse.json(allCampaigns);
  } catch (err) {
    console.error('Fetch campaigns error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const [campaign] = await db.insert(campaigns).values({
      userId,
      name: body.name,
      description: body.description,
      status: body.status || 'draft',
      scheduleJson: body.scheduleJson ? JSON.stringify(body.scheduleJson) : null,
      aiPersonaJson: body.aiPersonaJson ? JSON.stringify(body.aiPersonaJson) : null,
      listId: body.listId,
    }).returning();
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error('Create campaign error:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
