import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface ReplyRequest {
  conversationHistory: Array<{
    direction: 'outbound' | 'inbound';
    body: string;
    sentAt?: Date;
  }>;
  prospectData: {
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
  };
  tone?: 'professional' | 'casual' | 'friendly' | 'direct';
}

export async function POST(request: NextRequest) {
  try {
    const body: ReplyRequest = await request.json();
    const { conversationHistory, prospectData, tone = 'professional' } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    if (!conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'Conversation history required' }, { status: 400 });
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .map(msg => `${msg.direction === 'outbound' ? 'You' : prospectData.firstName}: ${msg.body}`)
      .join('\n\n');

    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage.direction !== 'inbound') {
      return NextResponse.json({ error: 'Last message must be from prospect' }, { status: 400 });
    }

    const systemPrompt = `You are an expert SDR helping draft a reply to a prospect's message.
Analyze the conversation context and suggest an appropriate response.

Prospect: ${prospectData.firstName} ${prospectData.lastName}, ${prospectData.title || 'professional'} at ${prospectData.company || 'their company'}
Tone: ${tone}

Guidelines:
- Be helpful and genuine
- Address their questions or concerns directly
- Move the conversation forward with a clear next step
- Keep it concise
- Match the tone and style of the conversation
- If they're interested, suggest a meeting or call
- If they have objections, address them empathetically`;

    const userPrompt = `Here's the conversation so far:

${conversationContext}

Draft a thoughtful reply that will keep the conversation moving forward.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const suggestedReply = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      reply: suggestedReply.trim(),
      usage: completion.usage 
    });
  } catch (err) {
    console.error('AI reply error:', err);
    return NextResponse.json({ 
      error: 'Failed to generate reply',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
