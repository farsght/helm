import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function fireWebhook(event: string, data: unknown) {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, 'webhookUrl')).limit(1);
    const url = result[0]?.value;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, ts: Date.now() }),
    }).catch(() => {});
  } catch {
    // Don't let webhook failures break the main flow
  }
}
