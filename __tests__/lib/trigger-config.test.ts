import { describe, it, expect } from 'vitest';
import { parseTriggerConfig } from '@/lib/pipeline-engine';

describe('parseTriggerConfig', () => {
  it('returns the input when kind is valid', () => {
    expect(parseTriggerConfig({ kind: 'manual' })).toEqual({ kind: 'manual' });
    expect(parseTriggerConfig({ kind: 'cron', schedule: '0 * * * *' })).toEqual({ kind: 'cron', schedule: '0 * * * *' });
    expect(parseTriggerConfig({ kind: 'webhook', secret: 'x' })).toEqual({ kind: 'webhook', secret: 'x' });
    expect(parseTriggerConfig({ kind: 'event' })).toEqual({ kind: 'event' });
  });
  it('defaults to manual for null / undefined / malformed', () => {
    expect(parseTriggerConfig(null)).toEqual({ kind: 'manual' });
    expect(parseTriggerConfig(undefined)).toEqual({ kind: 'manual' });
    expect(parseTriggerConfig('')).toEqual({ kind: 'manual' });
    expect(parseTriggerConfig({})).toEqual({ kind: 'manual' });
    expect(parseTriggerConfig({ kind: 'invalid' })).toEqual({ kind: 'manual' });
  });
});
