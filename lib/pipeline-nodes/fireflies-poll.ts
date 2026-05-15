/**
 * `fireflies_poll` — pipeline node executor.
 *
 * Ports `bitwage-netrunner/packages/meetings-pipeline/scripts/export-fireflies.ts`
 * to a Helm pipeline node. v1 scope (per docs/meetings-pipeline.md §4.1):
 *
 *   - GraphQL polling against Fireflies's transcripts endpoint
 *   - Idempotent dedupe via Helm's `meetings.fireflies_id`
 *   - Emits one row per *new* meeting downstream
 *   - Includes both transcript markdown and Fireflies's AI-generated summary
 *
 * v1 NON-goals (deferred):
 *   - Automatic watermark write-back (sinceCursor is user-controlled for now)
 *   - Workers/parallel fan-out (sequential is fine at single-pipeline scale)
 *   - Apps/analytics blocks from the netrunner export (we only need transcript
 *     + summary text for downstream classify/embed)
 *
 * The full upstream query covers analytics, sentiments, apps, etc. We trim to
 * exactly the fields we need; the raw payload is preserved in `raw_payload`
 * so future nodes can mine it without re-fetching.
 */

import { z } from 'zod';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import type { NodeExecutor, Row } from '../pipeline-engine-types';
import { getConnectionForRuntime } from '../connections';

// ── Config schema ─────────────────────────────────────────────────────

export const firefliesPollConfigSchema = z.object({
  /** Connection ID from the `connections` table (kind=fireflies). Required. */
  connectionId: z.number().int().positive(),
  /** ISO timestamp (e.g. "2026-04-01T00:00:00Z"). Omit to pull all available. */
  sinceCursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(25),
  /** Stop after N pages (defensive cap on long backfills). */
  maxPages: z.number().int().min(1).max(200).default(40),
  /** Filter by host email substring match. Empty = no filter. */
  hostFilter: z.array(z.string()).default([]),
  /** Dry run: emit rows but skip GraphQL — useful for testing downstream nodes. */
  dryRun: z.boolean().default(false),
});

export type FirefliesPollConfig = z.infer<typeof firefliesPollConfigSchema>;

// ── GraphQL types ─────────────────────────────────────────────────────

const ENDPOINT = 'https://api.fireflies.ai/graphql';

const LIST_QUERY = `
  query ListTranscripts($limit: Int, $skip: Int, $fromDate: DateTime) {
    transcripts(limit: $limit, skip: $skip, fromDate: $fromDate) {
      id title date
    }
  }
`;

const DETAIL_QUERY = `
  query GetTranscript($id: String!) {
    transcript(id: $id) {
      id title date duration
      organizer_email participants
      meeting_attendees { displayName email }
      sentences { speaker_name text raw_text }
      summary { overview gist short_summary action_items keywords outline }
    }
  }
`;

type ListItem = { id: string; title: string; date: number | string };
type Attendee = { displayName: string | null; email: string | null };
type Sentence = { speaker_name: string | null; text: string | null; raw_text?: string | null };
type Summary = {
  overview?: string | null;
  gist?: string | null;
  short_summary?: string | null;
  action_items?: string[] | string | null;
  keywords?: string[] | null;
  outline?: string | null;
};
type TranscriptDetail = {
  id: string;
  title: string;
  date: number | string;
  duration: number | null;
  organizer_email: string | null;
  participants: string[] | null;
  meeting_attendees: Attendee[] | null;
  sentences: Sentence[] | null;
  summary: Summary | null;
};

// ── Helpers ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
  attempt = 1,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string; extensions?: { code?: string; metadata?: { retryAfter?: number } } }> };
  if (json.errors?.length) {
    const err = json.errors[0]!;
    const code = err.extensions?.code;
    const retryAfter = err.extensions?.metadata?.retryAfter;
    // Same rate-limit handling pattern as netrunner export-fireflies.ts
    if (code === 'too_many_requests' && retryAfter) {
      const waitMs = Math.max(retryAfter - Date.now(), 1000);
      await sleep(waitMs);
      return gql<T>(apiKey, query, variables, attempt);
    }
    if (code === 'INTERNAL_SERVER_ERROR' && attempt <= 3) {
      await sleep(attempt * 2000);
      return gql<T>(apiKey, query, variables, attempt + 1);
    }
    throw new Error(`Fireflies GraphQL error [${code ?? 'unknown'}]: ${err.message}`);
  }
  if (!json.data) throw new Error('Fireflies returned no data');
  return json.data;
}

/**
 * Build a slug from a meeting's date + title. Matches netrunner's `buildSlug`
 * shape so vault paths line up during the parallel-run period.
 *
 * Format: `YYYY-MM-DD-<sanitized-title>` (lowercase, hyphenated).
 */
export function buildSlug(date: Date, title: string): string {
  const isoDate = date.toISOString().slice(0, 10);
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
  return `${isoDate}-${safeTitle}`;
}

/** Render the transcript body as markdown (speaker: text per line). */
export function renderTranscriptMarkdown(detail: TranscriptDetail): string {
  const sentences = detail.sentences ?? [];
  const lines: string[] = [];
  let lastSpeaker: string | null = null;
  for (const s of sentences) {
    const speaker = s.speaker_name ?? 'Unknown';
    const text = (s.text ?? s.raw_text ?? '').trim();
    if (!text) continue;
    if (speaker !== lastSpeaker) {
      if (lines.length > 0) lines.push('');
      lines.push(`**${speaker}:**`);
      lastSpeaker = speaker;
    }
    lines.push(text);
  }
  return lines.join('\n');
}

/** Render Fireflies's structured summary as markdown for archival. */
export function renderSummaryMarkdown(detail: TranscriptDetail): string {
  const s = detail.summary ?? {};
  const parts: string[] = [];
  if (s.overview) parts.push('## Overview\n\n' + s.overview);
  if (s.gist) parts.push('## Gist\n\n' + s.gist);
  if (s.short_summary) parts.push('## Short summary\n\n' + s.short_summary);
  if (s.outline) parts.push('## Outline\n\n' + s.outline);
  if (s.action_items) {
    const items = Array.isArray(s.action_items)
      ? s.action_items
      : String(s.action_items).split('\n').filter(Boolean);
    parts.push('## Action items\n\n' + items.map((i) => `- ${i}`).join('\n'));
  }
  if (s.keywords?.length) parts.push('## Keywords\n\n' + s.keywords.map((k) => `- ${k}`).join('\n'));
  return parts.join('\n\n');
}

function applyHostFilter(detail: TranscriptDetail, hostFilter: string[]): boolean {
  if (hostFilter.length === 0) return true;
  const host = (detail.organizer_email ?? '').toLowerCase();
  return hostFilter.some((needle) => host.includes(needle.toLowerCase()));
}

// ── Executor ──────────────────────────────────────────────────────────

export const firefliesPoll: NodeExecutor = async (rawConfig, _inputRows, node, ctx) => {
  const cfg = firefliesPollConfigSchema.parse(rawConfig);

  if (cfg.dryRun) {
    ctx.log.push({ nodeId: node.id, message: 'fireflies_poll: dryRun=true, returning []', level: 'info' });
    return [];
  }

  // Resolve Fireflies API key from the connections table
  const conn = await getConnectionForRuntime(cfg.connectionId, ctx.userId, 'fireflies');
  const { apiKey } = conn.secret as { apiKey: string };

  // Pull the listing page-by-page until we run out or hit maxPages.
  const fromDate = cfg.sinceCursor ?? undefined;
  const listed: ListItem[] = [];
  for (let page = 0; page < cfg.maxPages; page++) {
    const skip = page * cfg.pageSize;
    const data = await gql<{ transcripts: ListItem[] }>(apiKey, LIST_QUERY, {
      limit: cfg.pageSize,
      skip,
      fromDate,
    });
    const batch = data.transcripts ?? [];
    listed.push(...batch);
    if (batch.length < cfg.pageSize) break; // last page
  }
  ctx.log.push({ nodeId: node.id, message: `fireflies_poll: listed ${listed.length} transcripts from Fireflies`, level: 'info' });

  if (listed.length === 0) return [];

  // Dedupe against Helm's meetings table — skip anything we already have.
  const existing = await db
    .select({ firefliesId: meetings.firefliesId })
    .from(meetings)
    .where(inArray(meetings.firefliesId, listed.map((l) => l.id)));
  const existingIds = new Set(existing.map((e) => e.firefliesId));
  const toFetch = listed.filter((l) => !existingIds.has(l.id));
  ctx.log.push({
    nodeId: node.id,
    message: `fireflies_poll: ${existingIds.size} already in Helm, ${toFetch.length} new to fetch`,
    level: 'info',
  });

  // Fetch full details sequentially. Parallelism deferred to v2.
  const rows: Row[] = [];
  for (const item of toFetch) {
    let detail: TranscriptDetail;
    try {
      const data = await gql<{ transcript: TranscriptDetail }>(apiKey, DETAIL_QUERY, { id: item.id });
      detail = data.transcript;
    } catch (err) {
      ctx.rowsErrored += 1;
      const msg = err instanceof Error ? err.message : 'unknown error';
      ctx.log.push({ nodeId: node.id, message: `fireflies_poll: detail fetch failed for ${item.id}: ${msg}`, level: 'warn' });
      continue;
    }
    if (!applyHostFilter(detail, cfg.hostFilter)) continue;

    const meetingDate = new Date(typeof detail.date === 'number' ? detail.date : Date.parse(String(detail.date)));
    const slug = buildSlug(meetingDate, detail.title || 'untitled');
    const transcript = renderTranscriptMarkdown(detail);
    const summary = renderSummaryMarkdown(detail);

    rows.push({
      fireflies_id: detail.id,
      slug,
      title: detail.title || 'Untitled',
      date: meetingDate.toISOString(),
      duration_min: detail.duration ?? null,
      host_email: detail.organizer_email ?? null,
      attendees: (detail.meeting_attendees ?? []).map((a) => ({
        email: a.email ?? '',
        name: a.displayName ?? '',
      })),
      transcript,
      summary,
      raw_payload: detail as unknown as Record<string, unknown>,
    });
  }

  ctx.log.push({ nodeId: node.id, message: `fireflies_poll: emitting ${rows.length} new meeting rows`, level: 'info' });
  return rows;
};
