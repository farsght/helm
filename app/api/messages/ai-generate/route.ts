import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface GenerateRequest {
  prospectData: {
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
    industry?: string;
  };
  template?: {
    subject?: string;
    body: string;
  };
  campaignContext?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'direct';
  variantCount?: number;
  channel: 'email' | 'linkedin';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prospectData, template, campaignContext, tone = 'professional', variantCount = 2, channel } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are an expert SDR (Sales Development Representative) writing personalized outreach messages.
Your goal is to create engaging, authentic messages that will get responses.

Tone: ${tone}
Channel: ${channel}
${campaignContext ? `Campaign Context: ${campaignContext}` : ''}

Guidelines:
- Keep it concise and scannable
- Personalize based on prospect's role and company
- Include a clear call-to-action
- Use natural, conversational language
- Avoid generic sales pitches
- ${channel === 'email' ? 'Email subject should be compelling and non-salesy' : 'LinkedIn messages should be brief and direct'}`;

    const userPrompt = template 
      ? `Generate ${variantCount} variants of this message template for ${prospectData.firstName} ${prospectData.lastName}, ${prospectData.title || 'professional'} at ${prospectData.company || 'their company'}:

${channel === 'email' && template.subject ? `Subject: ${template.subject}` : ''}
Body: ${template.body}

Replace all variables with personalized content and add context specific to their role and company.`
      : `Generate ${variantCount} personalized ${channel} outreach messages for:
${prospectData.firstName} ${prospectData.lastName}
${prospectData.title || 'Professional'} at ${prospectData.company || 'their company'}
${prospectData.industry ? `Industry: ${prospectData.industry}` : ''}

${channel === 'email' ? 'Include a compelling subject line for each variant.' : ''}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const generatedText = completion.choices[0]?.message?.content || '';
    
    // Parse variants from response
    const variants = parseVariants(generatedText, channel, variantCount);

    return NextResponse.json({ 
      variants,
      usage: completion.usage 
    });
  } catch (err) {
    console.error('AI generate error:', err);
    return NextResponse.json({ 
      error: 'Failed to generate message',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

function parseVariants(text: string, channel: 'email' | 'linkedin', expectedCount: number) {
  const variants: Array<{ subject?: string; body: string }> = [];
  
  // Try to split by variant markers
  const variantSections = text.split(/(?:Variant|Version|Option)\s*[#\d]+:?\s*/i).filter(s => s.trim());
  
  if (variantSections.length > 1) {
    // Successful split by variant markers
    variantSections.slice(0, expectedCount).forEach(section => {
      const variant = parseEmailParts(section.trim(), channel);
      if (variant.body) {
        variants.push(variant);
      }
    });
  } else {
    // Fallback: treat entire response as single variant
    const variant = parseEmailParts(text.trim(), channel);
    if (variant.body) {
      variants.push(variant);
    }
  }

  return variants.length > 0 ? variants : [{ body: text.trim() }];
}

function parseEmailParts(text: string, channel: 'email' | 'linkedin'): { subject?: string; body: string } {
  if (channel === 'linkedin') {
    return { body: text.trim() };
  }

  // Try to extract subject line for email
  const subjectMatch = text.match(/(?:Subject|Sub):\s*(.+?)(?:\n|$)/i);
  if (subjectMatch) {
    const subject = subjectMatch[1].trim();
    const body = text.replace(/(?:Subject|Sub):\s*.+?(?:\n|$)/i, '').trim();
    return { subject, body };
  }

  // If no subject found, use first line as subject
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 1) {
    return {
      subject: lines[0].trim(),
      body: lines.slice(1).join('\n').trim()
    };
  }

  return { body: text.trim() };
}
