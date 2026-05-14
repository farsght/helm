import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type SettingsValue = string | number | boolean | string[] | null;

function parseValue(raw: string): SettingsValue {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function serializeValue(value: SettingsValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * GET /api/settings
 * Returns all settings rows for the current user as a flat key→value map.
 * Values are JSON-parsed when possible, otherwise returned as raw strings.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db.select().from(settings).where(eq(settings.userId, userId));
    const out: Record<string, SettingsValue> = {};
    for (const row of rows) {
      out[row.key] = parseValue(row.value);
    }
    return NextResponse.json(out);
  } catch (err) {
    console.error('GET settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Accepts a JSON object of { key: value } entries and upserts each one
 * scoped to the current user. Strings are stored verbatim; other JSON
 * values are stringified.
 */
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an object of key/value pairs' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      const valueStr = serializeValue(value as SettingsValue);
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.userId, userId), eq(settings.key, key)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value: valueStr, updatedAt: new Date() })
          .where(and(eq(settings.userId, userId), eq(settings.key, key)));
      } else {
        await db.insert(settings).values({ userId, key, value: valueStr });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT settings error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
