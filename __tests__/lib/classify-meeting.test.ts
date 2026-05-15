// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { deriveMeetingClass, classifyMeetingConfigSchema } from '@/lib/pipeline-nodes/classify-meeting';

describe('classify_meeting: deriveMeetingClass', () => {
  it('returns internal when all attendees are on internal domains', () => {
    const result = deriveMeetingClass(
      [{ email: 'scott@bitwage.co' }, { email: 'alice@paystand.com' }],
      'bitwage.co,paystand.com',
    );
    expect(result).toBe('internal');
  });

  it('returns external when any attendee is on a foreign domain', () => {
    const result = deriveMeetingClass(
      [{ email: 'scott@bitwage.co' }, { email: 'cfo@prospect.io' }],
      'bitwage.co,paystand.com',
    );
    expect(result).toBe('external');
  });

  it('returns internal for empty/undefined attendees (conservative default)', () => {
    expect(deriveMeetingClass(undefined, 'bitwage.co')).toBe('internal');
    expect(deriveMeetingClass([], 'bitwage.co')).toBe('internal');
  });

  it('is case-insensitive on domain matching', () => {
    const result = deriveMeetingClass(
      [{ email: 'Scott@Bitwage.CO' }],
      'bitwage.co',
    );
    expect(result).toBe('internal');
  });

  it('ignores attendees without an @ sign', () => {
    const result = deriveMeetingClass(
      [{ email: 'no-email' }, { email: null }, { email: 'scott@bitwage.co' }],
      'bitwage.co',
    );
    expect(result).toBe('internal');
  });

  it('handles whitespace in internalDomains config', () => {
    const result = deriveMeetingClass(
      [{ email: 'scott@bitwage.co' }],
      ' bitwage.co , paystand.com ',
    );
    expect(result).toBe('internal');
  });

  it('protects against subdomain false-positives (endsWith @ + domain)', () => {
    // foo@evilbitwage.co should NOT match @bitwage.co
    const result = deriveMeetingClass(
      [{ email: 'attacker@evilbitwage.co' }],
      'bitwage.co',
    );
    expect(result).toBe('external');
  });
});

describe('classify_meeting: config schema', () => {
  it('applies defaults matching netrunner', () => {
    // connectionId is required; supply one
    const cfg = classifyMeetingConfigSchema.parse({ connectionId: 1 });
    expect(cfg.connectionId).toBe(1);
    expect(cfg.model).toBe('gpt-4o-mini');
    expect(cfg.promptVersionTag).toBe('netrunner-v1');
    expect(cfg.retryCount).toBe(3);
    expect(cfg.maxInputChars).toBe(12000);
    expect(cfg.internalDomains).toBe('bitwage.co,paystand.com');
    expect(cfg.dryRun).toBe(false);
  });

  it('rejects missing connectionId', () => {
    expect(() => classifyMeetingConfigSchema.parse({})).toThrow();
  });

  it('rejects retryCount above 5', () => {
    expect(() => classifyMeetingConfigSchema.parse({ connectionId: 1, retryCount: 10 })).toThrow();
  });

  it('accepts overrides', () => {
    const cfg = classifyMeetingConfigSchema.parse({
      connectionId: 7,
      model: 'gpt-4o',
      promptVersionTag: 'experiment-v2',
      retryCount: 1,
      dryRun: true,
    });
    expect(cfg.model).toBe('gpt-4o');
    expect(cfg.promptVersionTag).toBe('experiment-v2');
    expect(cfg.retryCount).toBe(1);
    expect(cfg.dryRun).toBe(true);
  });
});
