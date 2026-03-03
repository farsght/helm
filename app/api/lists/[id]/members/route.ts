import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { listMembers, prospects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = parseInt(id);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const members = await db
      .select({
        id: prospects.id,
        firstName: prospects.firstName,
        lastName: prospects.lastName,
        email: prospects.email,
        company: prospects.company,
        title: prospects.title,
      })
      .from(listMembers)
      .innerJoin(prospects, eq(listMembers.prospectId, prospects.id))
      .where(eq(listMembers.listId, listId));

    return NextResponse.json(members);
  } catch (err) {
    console.error('Fetch list members error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch list members' },
      { status: 500 }
    );
  }
}
