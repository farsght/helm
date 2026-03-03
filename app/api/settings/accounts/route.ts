import { NextResponse } from 'next/server';
import { db } from '@/db';
import { connectedAccounts } from '@/db/schema';

export async function GET() {
  try {
    const accounts = await db.select().from(connectedAccounts);
    return NextResponse.json(accounts);
  } catch (err) {
    console.error('Get accounts error:', err);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await db.insert(connectedAccounts).values({
      type: body.type,
      name: body.name,
      configJson: JSON.stringify(body.config),
      status: 'active',
    }).returning();

    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('Create account error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
