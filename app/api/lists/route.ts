import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lists } from '@/db/schema';

export async function GET() {
  try {
    const allLists = await db.select().from(lists);
    return NextResponse.json(allLists);
  } catch (err) {
    console.error('Fetch lists error:', err);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [list] = await db.insert(lists).values({
      name: body.name,
      description: body.description,
      type: body.type || 'static',
      filterJson: body.filterJson ? JSON.stringify(body.filterJson) : null,
    }).returning();
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error('Create list error:', err);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
