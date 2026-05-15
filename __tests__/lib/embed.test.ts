// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { embed, embedConfigSchema } from '@/lib/pipeline-nodes/embed';
import type { PipelineRunContext } from '@/lib/pipeline-engine-types';

function makeCtx(): PipelineRunContext {
  return { pipelineId: 1, runId: 1, userId: 'u', log: [], rowsErrored: 0 };
}
function makeNode() {
  return { id: 1, pipelineId: 1, type: 'embed', label: 'e', configJson: null, positionX: 0, positionY: 0, createdAt: new Date(), triggerConfig: null };
}

describe('embed: dryRun', () => {
  it('emits zero-vectors when dryRun=true (no OpenAI call)', async () => {
    const ctx = makeCtx();
    const out = await embed(
      { connectionId: 1, dryRun: true },
      [{ chunk_id: 'a', content: 'hello' }, { chunk_id: 'b', content: 'world' }],
      makeNode(),
      ctx,
    );
    expect(out.length).toBe(2);
    expect(Array.isArray(out[0]?.embedding)).toBe(true);
    expect((out[0]?.embedding as number[]).length).toBe(1536);
    expect((out[0]?.embedding as number[])[0]).toBe(0);
    expect(out[0]?.embedding_model).toBe('text-embedding-3-small');
  });

  it('handles empty input gracefully', async () => {
    const ctx = makeCtx();
    const out = await embed({ connectionId: 1, dryRun: true }, [], makeNode(), ctx);
    expect(out).toEqual([]);
  });

  it('preserves input row fields alongside embedding', async () => {
    const ctx = makeCtx();
    const out = await embed(
      { connectionId: 1, dryRun: true },
      [{ chunk_id: 'a', content: 'x', parent_fireflies_id: 'parent-1', section_heading: 'Overview' }],
      makeNode(),
      ctx,
    );
    expect(out[0]?.parent_fireflies_id).toBe('parent-1');
    expect(out[0]?.section_heading).toBe('Overview');
  });
});

describe('embed: config schema', () => {
  it('applies defaults', () => {
    // connectionId is required; supply one for defaults test
    const cfg = embedConfigSchema.parse({ connectionId: 1 });
    expect(cfg.connectionId).toBe(1);
    expect(cfg.model).toBe('text-embedding-3-small');
    expect(cfg.batchSize).toBe(100);
    expect(cfg.contentField).toBe('content');
    expect(cfg.dryRun).toBe(false);
  });

  it('rejects missing connectionId', () => {
    expect(() => embedConfigSchema.parse({})).toThrow();
  });

  it('rejects batchSize > 2048', () => {
    expect(() => embedConfigSchema.parse({ connectionId: 1, batchSize: 5000 })).toThrow();
  });
});
