import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations, prospects, connectedAccounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

interface SendMessageRequest {
  prospectId: number;
  campaignId?: number;
  nodeId?: number;
  channel: 'email' | 'linkedin';
  subject?: string;
  body: string;
  bodyHtml?: string;
  aiGenerated?: boolean;
  variantId?: number;
  scheduledAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { 
      prospectId, 
      campaignId, 
      nodeId, 
      channel, 
      subject, 
      body: messageBody, 
      bodyHtml,
      aiGenerated = false,
      variantId,
      scheduledAt 
    } = body;

    // Get prospect details
    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    // Create message record
    const [message] = await db.insert(messages).values({
      campaignId: campaignId || null,
      prospectId,
      nodeId: nodeId || null,
      channel,
      direction: 'outbound',
      subject,
      body: messageBody,
      bodyHtml,
      status: scheduledAt ? 'scheduled' : 'draft',
      aiGenerated,
      variantId: variantId || null,
      sentAt: null,
    }).returning();

    // If not scheduled, send immediately
    if (!scheduledAt) {
      if (channel === 'email') {
        await sendEmail(message, prospect);
      } else if (channel === 'linkedin') {
        await sendLinkedInMessage(message, prospect);
      }
    }

    // Update or create conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.prospectId, prospectId));

    if (conversation) {
      await db.update(conversations)
        .set({ 
          lastMessageAt: new Date(),
          campaignId: campaignId || conversation.campaignId 
        })
        .where(eq(conversations.id, conversation.id));
    } else {
      await db.insert(conversations).values({
        prospectId,
        campaignId: campaignId || null,
        status: 'new',
        lastMessageAt: new Date(),
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ 
      error: 'Failed to send message',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface Message {
  id: number;
  subject: string | null;
  body: string | null;
  bodyHtml: string | null;
}

interface Prospect {
  id: number;
  email: string | null;
}

async function sendEmail(message: Message, prospect: Prospect) {
  try {
    // Get email account configuration
    const [account] = await db.select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.type, 'email'));

    if (!account || !account.configJson) {
      console.error('No email account configured');
      await db.update(messages)
        .set({ status: 'failed' })
        .where(eq(messages.id, message.id));
      return;
    }

    const config = JSON.parse(account.configJson);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host || process.env.SMTP_HOST,
      port: config.port || parseInt(process.env.SMTP_PORT || '587'),
      secure: config.secure || false,
      auth: {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASS,
      },
    });

    // Send email
    if (!prospect.email) {
      throw new Error('Prospect has no email address');
    }
    
    await transporter.sendMail({
      from: config.from || process.env.SMTP_FROM,
      to: prospect.email,
      subject: message.subject || '',
      text: message.body || '',
      html: message.bodyHtml || message.body || '',
    });

    // Update message status
    await db.update(messages)
      .set({ 
        status: 'sent',
        sentAt: new Date()
      })
      .where(eq(messages.id, message.id));

  } catch (err) {
    console.error('Email send error:', err);
    await db.update(messages)
      .set({ status: 'failed' })
      .where(eq(messages.id, message.id));
    throw err;
  }
}

async function sendLinkedInMessage(message: Message, prospect: Prospect) {
  // Placeholder for LinkedIn integration (Phase 3)
  console.log('LinkedIn message placeholder:', {
    prospectId: prospect.id,
    messageId: message.id,
    body: message.body
  });

  // Update message status to sent (simulated)
  await db.update(messages)
    .set({ 
      status: 'sent',
      sentAt: new Date()
    })
    .where(eq(messages.id, message.id));
}
