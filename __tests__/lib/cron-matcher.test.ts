import { describe, it, expect } from 'vitest';
import { parseCron, cronMatches, cronMatchesWithinWindow } from '@/lib/cron-matcher';

describe('parseCron', () => {
  it('parses 5 fields with stars', () => {
    const p = parseCron('* * * * *')!;
    expect(p.minute.size).toBe(60);
    expect(p.hour.size).toBe(24);
  });
  it('parses step expressions', () => {
    const p = parseCron('*/15 * * * *')!;
    expect(Array.from(p.minute).sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });
  it('parses ranges and lists', () => {
    const p = parseCron('0 9-17 * * 1,3,5')!;
    expect(p.hour.has(9)).toBe(true);
    expect(p.hour.has(17)).toBe(true);
    expect(p.hour.has(18)).toBe(false);
    expect(p.dayOfWeek.has(1)).toBe(true);
    expect(p.dayOfWeek.has(2)).toBe(false);
  });
  it('rejects malformed expressions', () => {
    expect(parseCron('* * *')).toBeNull();
    expect(parseCron('')).toBeNull();
  });
});

describe('cronMatches', () => {
  it('matches every minute for "* * * * *"', () => {
    const now = new Date('2026-05-14T17:23:00Z');
    expect(cronMatches('* * * * *', now)).toBe(true);
  });
  it('matches exact minute for "0 9 * * *"', () => {
    expect(cronMatches('0 9 * * *', new Date('2026-05-14T09:00:00Z'))).toBe(true);
    expect(cronMatches('0 9 * * *', new Date('2026-05-14T09:01:00Z'))).toBe(false);
    expect(cronMatches('0 9 * * *', new Date('2026-05-14T10:00:00Z'))).toBe(false);
  });
  it('matches step expressions', () => {
    expect(cronMatches('*/5 * * * *', new Date('2026-05-14T17:25:00Z'))).toBe(true);
    expect(cronMatches('*/5 * * * *', new Date('2026-05-14T17:26:00Z'))).toBe(false);
  });
});

describe('cronMatchesWithinWindow', () => {
  it('catches schedules that fired earlier in the window', () => {
    // Schedule "17 * * * *" fires at minute :17 each hour. If our worker
    // runs at :20 with a 5-minute window, we should catch it.
    expect(cronMatchesWithinWindow('17 * * * *', new Date('2026-05-14T17:20:00Z'), 5)).toBe(true);
  });
  it('returns false when schedule did not fire in the window', () => {
    // :17 schedule, worker runs at :30 — outside 5-min window
    expect(cronMatchesWithinWindow('17 * * * *', new Date('2026-05-14T17:30:00Z'), 5)).toBe(false);
  });
  it('matches "now" with window=1 (same as cronMatches)', () => {
    expect(cronMatchesWithinWindow('0 9 * * *', new Date('2026-05-14T09:00:00Z'), 1)).toBe(true);
    expect(cronMatchesWithinWindow('0 9 * * *', new Date('2026-05-14T09:01:00Z'), 1)).toBe(false);
  });
});
