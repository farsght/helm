import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prospects } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospects: importProspects } = body;

    if (!Array.isArray(importProspects) || importProspects.length === 0) {
      return NextResponse.json({ error: 'No prospects provided' }, { status: 400 });
    }

    // Validate and insert prospects
    const validProspects = importProspects.filter(p => p.firstName && p.lastName);
    
    if (validProspects.length === 0) {
      return NextResponse.json({ error: 'No valid prospects found (first_name and last_name required)' }, { status: 400 });
    }

    const inserted = [];
    for (const prospect of validProspects) {
      const result = await db.insert(prospects).values({
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email || null,
        company: prospect.company || null,
        title: prospect.title || null,
        linkedinUrl: prospect.linkedinUrl || null,
      }).returning();
      
      inserted.push(result[0]);
    }

    return NextResponse.json({ 
      success: true,
      count: inserted.length,
      prospects: inserted 
    });
  } catch (err) {
    console.error('Import prospects error:', err);
    return NextResponse.json({ 
      error: 'Failed to import prospects',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
