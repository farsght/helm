// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseTriggerConfig } from '@/lib/pipeline-engine';

describe('webhook trigger config', () => {
  it('accepts webhook kind with secret', () => {
    const cfg = parseTriggerConfig({ kind: 'webhook', secret: 'abc123' });
    expect(cfg.kind).toBe('webhook');
    expect(cfg.secret).toBe('abc123');
  });
  it('allows webhook kind without secret (route handler closes endpoint)', () => {
    const cfg = parseTriggerConfig({ kind: 'webhook' });
    expect(cfg.kind).toBe('webhook');
    expect(cfg.secret).toBeUndefined();
  });
});
