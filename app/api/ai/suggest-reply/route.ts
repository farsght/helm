import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

/**
 * POST /api/ai/suggest-reply
 * Suggest an AI reply for a prospect conversation.
 * Thin wrapper around /api/messages/ai-reply with a simplified interface.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      conversationHistory,
      prospectData,
      tone = 'professional',
      // Simplified single-message interface
      receivedMessage,
      prospectName,
      prospectCompany,
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Support both full conversationHistory and simplified single-message mode
    const history: Array<{ direction: 'outbound' | 'inbound'; body: string }> =
      conversationHistory ??
      (receivedMessage ? [{ direction: 'inbound', body: receivedMessage }] : null);

    if (!history || history.length === 0) {
      return NextResponse.json({ error: 'conversationHistory or receivedMessage required' }, { status: 400 });
    }

    const prospect = prospectData ?? {
      firstName: prospectName?.split(' ')[0] ?? 'the prospect',
      lastName: prospectName?.split(' ').slice(1).join(' ') ?? '',
      company: prospectCompany,
    };

    const conversationContext = history
      .map(m => `${m.direction === 'outbound' ? 'You' : (prospect.firstName ?? 'Prospect')}: ${m.body}`)
      .join('\n\n');

    const lastMessage = history[history.length - 1];
    if (lastMessage.direction !== 'inbound') {
      return NextResponse.json({ error: 'Last message must be from prospect (inbound)' }, { status: 400 });
    }

    const systemPrompt = `You are an expert SDR helping draft a reply to a prospect's message.
Prospect: ${prospect.firstName} ${prospect.lastName ?? ''}${prospect.company ? `, at ${prospect.company}` : ''}
Tone: ${tone}
Guidelines: be genuine, address their message directly, suggest a clear next step, keep it concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Conversation so far:\n\n${conversationContext}\n\nDraft a reply.` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ reply, suggestions: [reply], usage: completion.usage });
  } catch (err) {
    console.error('AI suggest-reply error:', err);
    return NextResponse.json({
      error: 'Failed to generate reply suggestion',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
