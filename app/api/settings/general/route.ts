import { NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

type SettingsValue = string | number | boolean | string[];

const DEFAULT_SETTINGS = {
  dailySendLimit: 50,
  sendingStartHour: 9,
  sendingEndHour: 17,
  timezone: 'America/New_York',
  delayBetweenMessages: 30,
  defaultModel: 'gpt-4o-mini',
  defaultTone: 'professional',
  autoReply: false,
  maxAutoReplies: 3,
  bannedTopics: [],
  webhookUrl: '',
};

async function getSetting(key: string): Promise<SettingsValue | null> {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (result.length === 0) return null;
  try {
    return JSON.parse(result[0].value);
  } catch {
    return result[0].value;
  }
}

async function setSetting(key: string, value: SettingsValue): Promise<void> {
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  
  if (existing.length > 0) {
    await db.update(settings)
      .set({ value: valueStr, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value: valueStr });
  }
}

export async function GET() {
  try {
    const settingsData: Record<string, SettingsValue> = { ...DEFAULT_SETTINGS };

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const value = await getSetting(key);
      if (value !== null) {
        settingsData[key] = value;
      }
    }

    return NextResponse.json(settingsData);
  } catch (err) {
    console.error('Get settings error:', err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, value as SettingsValue);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
