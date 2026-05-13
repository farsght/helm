import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fireWebhook } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, event } = body as { messageId: string; event: 'open' | 'click' | 'reply' };

    const msgId = parseInt(messageId);
    if (isNaN(msgId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    const updates: Record<string, Date | string> = {};
    const now = new Date();

    if (event === 'open') {
      updates.openedAt = now;
      updates.status = 'opened';
    } else if (event === 'click') {
      updates.status = 'clicked';
    } else if (event === 'reply') {
      updates.repliedAt = now;
      updates.status = 'replied';
    }

    if (Object.keys(updates).length > 0) {
      await db.update(messages).set(updates).where(eq(messages.id, msgId));
      if (event === 'reply') {
        const [msg] = await db.select().from(messages).where(eq(messages.id, msgId));
        if (msg) {
          await fireWebhook('reply_received', { prospectId: msg.prospectId, messageId: msgId });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
