import { describe, it, expect } from 'vitest';
import { chunkText, splitIntoSections, splitByCharWindow, chunkTextConfigSchema } from '@/lib/pipeline-nodes/chunk-text';
import type { PipelineRunContext } from '@/lib/pipeline-engine-types';

function makeCtx(): PipelineRunContext {
  return { pipelineId: 1, runId: 1, userId: 'u', log: [], rowsErrored: 0 };
}
function makeNode() {
  return { id: 1, pipelineId: 1, type: 'chunk_text', label: 'chunk', configJson: null, positionX: 0, positionY: 0, createdAt: new Date() };
}

describe('chunk_text: splitIntoSections', () => {
  it('splits markdown on ## headers', () => {
    const md = '## Overview\nhello\n\n## Action Items\ndo thing\n\n## Notes\nstuff';
    const sections = splitIntoSections(md);
    expect(sections.map((s) => s.header)).toEqual(['Overview', 'Action Items', 'Notes']);
    expect(sections[0]!.content).toContain('hello');
  });

  it('returns empty array for markdown with no ## headers', () => {
    expect(splitIntoSections('just a paragraph')).toEqual([]);
  });

  it('drops preamble before first ##', () => {
    const md = 'preamble text\n\n## First\nbody';
    const sections = splitIntoSections(md);
    expect(sections.length).toBe(1);
    expect(sections[0]!.header).toBe('First');
  });
});

describe('chunk_text: splitByCharWindow', () => {
  it('returns single chunk for short content', () => {
    expect(splitByCharWindow('short', 100, 10)).toEqual(['short']);
  });

  it('windows long content with overlap', () => {
    // targetTokens=10 → 40 chars, overlap=2 → 8 chars
    const content = 'a'.repeat(100);
    const chunks = splitByCharWindow(content, 10, 2);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be at most 40 chars
    expect(chunks.every((c) => c.length <= 40)).toBe(true);
  });
});

describe('chunk_text: executor', () => {
  it('fans out one input row into multiple chunk rows', async () => {
    const ctx = makeCtx();
    const node = makeNode();
    const longTranscript = `## Overview\n${'x'.repeat(500)}\n\n## Action Items\nshort thing`;
    const out = await chunkText(
      { targetTokens: 64, overlapTokens: 5 },
      [{ fireflies_id: 'fid-1', transcript: longTranscript, slug: 'meeting-1', meeting_class: 'external' }],
      node,
      ctx,
    );
    expect(out.length).toBeGreaterThan(1);
    expect(out.every((r) => r.parent_fireflies_id === 'fid-1')).toBe(true);
    expect(out.every((r) => r.parent_meeting_class === 'external')).toBe(true);
    expect(out[0]?.section_heading).toBe('Overview');
  });

  it('skips SKIP_SECTIONS', async () => {
    const ctx = makeCtx();
    const node = makeNode();
    const tx = `## Overview\nhello\n\n## Speaker Analytics\nshould be skipped\n\n## Action Items\ndo this`;
    const out = await chunkText({ targetTokens: 100 }, [{ fireflies_id: 'x', transcript: tx }], node, ctx);
    expect(out.find((r) => r.section_heading === 'Speaker Analytics')).toBeUndefined();
    expect(out.find((r) => r.section_heading === 'Overview')).toBeDefined();
  });

  it('emits full_meeting chunk when no ## sections', async () => {
    const ctx = makeCtx();
    const node = makeNode();
    const tx = 'no headers here, just paragraph text';
    const out = await chunkText({ targetTokens: 100 }, [{ fireflies_id: 'x', transcript: tx }], node, ctx);
    expect(out.length).toBe(1);
    expect(out[0]?.section_heading).toBe('full_meeting');
  });

  it('skips rows with empty transcript', async () => {
    const ctx = makeCtx();
    const node = makeNode();
    const out = await chunkText({}, [{ fireflies_id: 'x', transcript: '' }], node, ctx);
    expect(out.length).toBe(0);
  });

  it('assigns deterministic chunk IDs (sha256 of parent:index)', async () => {
    const ctx = makeCtx();
    const node = makeNode();
    const tx = '## A\ncontent here';
    const out1 = await chunkText({}, [{ fireflies_id: 'fid', transcript: tx }], node, ctx);
    const out2 = await chunkText({}, [{ fireflies_id: 'fid', transcript: tx }], node, makeCtx());
    expect(out1[0]?.chunk_id).toBe(out2[0]?.chunk_id);
  });
});

describe('chunk_text: config schema', () => {
  it('applies defaults', () => {
    const cfg = chunkTextConfigSchema.parse({});
    expect(cfg.targetTokens).toBe(512);
    expect(cfg.overlapTokens).toBe(64);
    expect(cfg.field).toBe('transcript');
    expect(cfg.sourceType).toBe('transcript');
    expect(cfg.sectionAware).toBe(true);
  });
});
