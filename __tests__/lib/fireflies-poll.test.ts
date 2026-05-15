// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildSlug, renderTranscriptMarkdown, renderSummaryMarkdown, firefliesPollConfigSchema } from '@/lib/pipeline-nodes/fireflies-poll';

describe('fireflies_poll: buildSlug', () => {
  it('produces ISO-date-prefixed lowercase slug', () => {
    const date = new Date('2026-03-15T14:30:00Z');
    expect(buildSlug(date, 'Q1 Pricing Review — Enterprise')).toBe('2026-03-15-q1-pricing-review-enterprise');
  });

  it('falls back to "untitled" for empty title', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(buildSlug(date, '')).toBe('2026-01-01-untitled');
  });

  it('truncates extremely long titles', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    const long = 'a'.repeat(200);
    const slug = buildSlug(date, long);
    // 11 chars for date prefix + up to 80 for title
    expect(slug.length).toBeLessThanOrEqual(11 + 80);
  });
});

describe('fireflies_poll: renderTranscriptMarkdown', () => {
  it('groups consecutive sentences by speaker', () => {
    const md = renderTranscriptMarkdown({
      id: 'x', title: 't', date: 0, duration: 0,
      organizer_email: null, participants: null, meeting_attendees: null,
      summary: null,
      sentences: [
        { speaker_name: 'Alice', text: 'Hello.', raw_text: null },
        { speaker_name: 'Alice', text: 'How are you?', raw_text: null },
        { speaker_name: 'Bob', text: 'Good.', raw_text: null },
      ],
    });
    expect(md).toContain('**Alice:**');
    expect(md).toContain('Hello.');
    expect(md).toContain('How are you?');
    expect(md).toContain('**Bob:**');
    // Alice appears once (speaker change groups sentences)
    expect(md.match(/\*\*Alice:\*\*/g)?.length).toBe(1);
  });

  it('handles empty sentences', () => {
    const md = renderTranscriptMarkdown({
      id: 'x', title: 't', date: 0, duration: 0,
      organizer_email: null, participants: null, meeting_attendees: null,
      summary: null, sentences: [],
    });
    expect(md).toBe('');
  });

  it('skips sentences with empty text', () => {
    const md = renderTranscriptMarkdown({
      id: 'x', title: 't', date: 0, duration: 0,
      organizer_email: null, participants: null, meeting_attendees: null,
      summary: null,
      sentences: [
        { speaker_name: 'Alice', text: '', raw_text: null },
        { speaker_name: 'Alice', text: '  ', raw_text: null },
      ],
    });
    expect(md).toBe('');
  });
});

describe('fireflies_poll: renderSummaryMarkdown', () => {
  it('renders overview, gist, action_items, keywords', () => {
    const md = renderSummaryMarkdown({
      id: 'x', title: 't', date: 0, duration: 0,
      organizer_email: null, participants: null, meeting_attendees: null,
      sentences: null,
      summary: {
        overview: 'Big picture.',
        gist: 'The point.',
        short_summary: null,
        action_items: ['Do thing 1', 'Do thing 2'],
        keywords: ['pricing', 'enterprise'],
        outline: null,
      },
    });
    expect(md).toContain('## Overview\n\nBig picture.');
    expect(md).toContain('## Gist\n\nThe point.');
    expect(md).toContain('- Do thing 1');
    expect(md).toContain('- pricing');
  });

  it('handles string action_items via newline split', () => {
    const md = renderSummaryMarkdown({
      id: 'x', title: 't', date: 0, duration: 0,
      organizer_email: null, participants: null, meeting_attendees: null,
      sentences: null,
      summary: {
        overview: null, gist: null, short_summary: null,
        action_items: 'first\nsecond\nthird',
        keywords: null, outline: null,
      },
    });
    expect(md).toContain('- first');
    expect(md).toContain('- second');
    expect(md).toContain('- third');
  });
});

describe('fireflies_poll: config schema', () => {
  it('applies defaults', () => {
    const cfg = firefliesPollConfigSchema.parse({});
    expect(cfg.apiKeyEnv).toBe('FIREFLIES_API_KEY');
    expect(cfg.pageSize).toBe(25);
    expect(cfg.maxPages).toBe(40);
    expect(cfg.hostFilter).toEqual([]);
    expect(cfg.dryRun).toBe(false);
  });

  it('rejects pageSize > 100', () => {
    expect(() => firefliesPollConfigSchema.parse({ pageSize: 500 })).toThrow();
  });

  it('accepts overrides', () => {
    const cfg = firefliesPollConfigSchema.parse({
      pageSize: 50,
      sinceCursor: '2026-01-01T00:00:00Z',
      hostFilter: ['bitwage.co'],
    });
    expect(cfg.pageSize).toBe(50);
    expect(cfg.sinceCursor).toBe('2026-01-01T00:00:00Z');
    expect(cfg.hostFilter).toEqual(['bitwage.co']);
  });
});
