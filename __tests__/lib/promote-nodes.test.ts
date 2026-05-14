import { describe, it, expect } from 'vitest';
import { promoteMeetingsConfigSchema } from '@/lib/pipeline-nodes/promote-meetings';
import { promoteEntitiesConfigSchema } from '@/lib/pipeline-nodes/promote-entities';
import { promoteChunksConfigSchema } from '@/lib/pipeline-nodes/promote-chunks';

describe('promote_meetings config', () => {
  it('applies defaults', () => {
    const cfg = promoteMeetingsConfigSchema.parse({});
    expect(cfg.workflowOnInsert).toBe('unprocessed');
    expect(cfg.markClassified).toBe(true);
  });
  it('respects overrides', () => {
    const cfg = promoteMeetingsConfigSchema.parse({ workflowOnInsert: 'staged', markClassified: false });
    expect(cfg.workflowOnInsert).toBe('staged');
    expect(cfg.markClassified).toBe(false);
  });
});

describe('promote_entities config', () => {
  it('defaults includeFeatures=false', () => {
    expect(promoteEntitiesConfigSchema.parse({}).includeFeatures).toBe(false);
  });
  it('respects override', () => {
    expect(promoteEntitiesConfigSchema.parse({ includeFeatures: true }).includeFeatures).toBe(true);
  });
});

describe('promote_chunks config', () => {
  it('applies defaults', () => {
    const cfg = promoteChunksConfigSchema.parse({});
    expect(cfg.embeddingModel).toBe('text-embedding-3-small');
    expect(cfg.skipMissingEmbeddings).toBe(true);
  });
  it('respects overrides', () => {
    const cfg = promoteChunksConfigSchema.parse({ embeddingModel: 'text-embedding-3-large', skipMissingEmbeddings: false });
    expect(cfg.embeddingModel).toBe('text-embedding-3-large');
    expect(cfg.skipMissingEmbeddings).toBe(false);
  });
});
