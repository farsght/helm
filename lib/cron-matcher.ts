/**
 * Minimal 5-field cron matcher: minute hour day month weekday.
 *
 * Supports: '*', 'N', 'N-M', 'N,M,...', '*\/N'.
 * Does NOT support: named months/weekdays, '?', 'L', 'W', '#' (Quartz extensions).
 *
 * For our use case (Vercel Cron fires the scan endpoint every minute and we
 * pick which pipelines to run) this is plenty. If we need richer expressions
 * later we'll swap in `cron-parser`.
 */

function expandField(field: string, min: number, max: number): Set<number> {
  if (field === '*') {
    const out = new Set<number>();
    for (let i = min; i <= max; i++) out.add(i);
    return out;
  }
  const out = new Set<number>();
  for (const part of field.split(',')) {
    // step: */N or A-B/N
    const stepMatch = part.match(/^(\*|\d+(-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const range = stepMatch[1]!;
      const step = parseInt(stepMatch[3]!);
      let lo = min, hi = max;
      if (range !== '*') {
        const [a, b] = range.split('-').map((s) => parseInt(s));
        lo = a!;
        hi = b ?? max;
      }
      for (let i = lo; i <= hi; i += step) out.add(i);
      continue;
    }
    // range: A-B
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1]!);
      const b = parseInt(rangeMatch[2]!);
      for (let i = a; i <= b; i++) out.add(i);
      continue;
    }
    // single value
    const n = parseInt(part);
    if (!Number.isNaN(n)) out.add(n);
  }
  return out;
}

export interface ParsedCron {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
}

export function parseCron(expr: string): ParsedCron | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  try {
    return {
      minute: expandField(fields[0]!, 0, 59),
      hour: expandField(fields[1]!, 0, 23),
      dayOfMonth: expandField(fields[2]!, 1, 31),
      month: expandField(fields[3]!, 1, 12),
      dayOfWeek: expandField(fields[4]!, 0, 6), // 0 = Sunday
    };
  } catch {
    return null;
  }
}

/**
 * Returns true if `now` (UTC) matches the cron expression's minute slot.
 * We round to the minute — sub-minute precision isn't supported by the
 * Vercel-Cron-every-minute scheduler we run this against.
 */
export function cronMatches(expr: string, now: Date): boolean {
  const parsed = parseCron(expr);
  if (!parsed) return false;
  // Use UTC components — cron schedules are UTC by convention here.
  return (
    parsed.minute.has(now.getUTCMinutes()) &&
    parsed.hour.has(now.getUTCHours()) &&
    parsed.dayOfMonth.has(now.getUTCDate()) &&
    parsed.month.has(now.getUTCMonth() + 1) &&
    parsed.dayOfWeek.has(now.getUTCDay())
  );
}

/**
 * Returns true if the cron expression would have matched at ANY minute in the
 * window `[now - windowMinutes, now]`. Use this when the worker runs less
 * frequently than once per minute — e.g. Vercel's `*\/5` schedule means we
 * should consider any of the last 5 minutes a hit, otherwise schedules like
 * `17 * * * *` would never fire.
 */
export function cronMatchesWithinWindow(expr: string, now: Date, windowMinutes: number): boolean {
  const parsed = parseCron(expr);
  if (!parsed) return false;
  const checkAt = new Date(now);
  for (let i = 0; i < windowMinutes; i++) {
    if (
      parsed.minute.has(checkAt.getUTCMinutes()) &&
      parsed.hour.has(checkAt.getUTCHours()) &&
      parsed.dayOfMonth.has(checkAt.getUTCDate()) &&
      parsed.month.has(checkAt.getUTCMonth() + 1) &&
      parsed.dayOfWeek.has(checkAt.getUTCDay())
    ) {
      return true;
    }
    checkAt.setUTCMinutes(checkAt.getUTCMinutes() - 1);
  }
  return false;
}
