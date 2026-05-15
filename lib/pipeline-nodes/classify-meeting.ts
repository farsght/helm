/**
 * `classify_meeting` — pipeline node executor.
 *
 * Ports netrunner's `scripts/enrich-fireflies.ts` Pass 1 (LLM classification).
 * Per docs/meetings-pipeline.md §4.3, the prompt is preserved VERBATIM from
 * netrunner — it's battle-tested across 626+ Bitwage meetings and we want
 * parity-checkable output during the dual-run period.
 *
 * Output: appends taxonomy fields to each input row + writes a `prompt_runs`
 * audit row per LLM call (cost, latency, model, version tag, input/output).
 *
 * v1 NON-goals (per Phase 2a/2b split):
 *   - Entity extraction (Pass 2) — that's Phase 3's `extract_entities` node
 *   - Vault enriched-file write (Pass 3) — Helm-world has no equivalent;
 *     `promote_meetings` writes the structured fields directly to Neon
 *
 * meeting_class (internal/external) is derived from attendee email domains
 * — no LLM call needed. We match netrunner's INTERNAL_DOMAINS env var
 * default of "bitwage.co,paystand.com".
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '@/db';
import { promptRuns } from '@/db/schema';
import type { NodeExecutor, Row } from '../pipeline-engine-types';
import { getConnectionForRuntime } from '../connections';

// ── Config schema ─────────────────────────────────────────────────────

export const classifyMeetingConfigSchema = z.object({
  /** OpenAI chat model. Default matches netrunner. */
  model: z.string().default('gpt-4o-mini'),
  /** Pin this to detect prompt drift in parity checks. */
  promptVersionTag: z.string().default('netrunner-v1'),
  /** Retries per row on retryable errors (default 3, matching netrunner). */
  retryCount: z.number().int().min(0).max(5).default(3),
  /** Truncate input transcript at N characters (~ N/4 tokens). */
  maxInputChars: z.number().int().min(1000).max(48000).default(12000),
  /** Connection ID from the `connections` table (kind=openai). Required. */
  connectionId: z.number().int().positive(),
  /**
   * Comma-separated email domains considered "internal" (i.e. Bitwage staff).
   * If a meeting's `attendees` list contains any non-internal domain, the
   * meeting is classified as `external`; otherwise `internal`.
   */
  internalDomains: z.string().default('bitwage.co,paystand.com'),
  /** Skip LLM, emit deterministic stub. Useful for downstream-node testing. */
  dryRun: z.boolean().default(false),
});

export type ClassifyMeetingConfig = z.infer<typeof classifyMeetingConfigSchema>;

// ── Prompts (VERBATIM from netrunner scripts/enrich-fireflies.ts) ──────

const CLASSIFICATION_PROMPT = `You are a knowledge architect for Bitwage, a fintech company specialising in
cross-border payroll, cryptocurrency salary payments, and international contractor payments.

Analyse this meeting transcript and return a JSON object with this exact structure:
{
  "meeting_category": "string (e.g. sales/discovery, product/roadmap, partnerships/exploration, strategy/executive, customer/feedback, marketing/demand-gen, internal/team-sync)",
  "meeting_subcategory": "string or null (more specific sub-classification)",
  "secondary_tags": ["array of relevant tags, max 4"],
  "domain": ["domain/sales", "domain/product", etc — pick all that apply from: domain/sales, domain/product, domain/marketing, domain/engineering, domain/finance, domain/executive, domain/customer-success, domain/partnerships"],
  "usecase": ["usecase/X" — pick all that apply from: usecase/sales-enablement, usecase/voice-of-customer, usecase/competitive-selling, usecase/objection-handling, usecase/demand-gen, usecase/feature-prioritization, usecase/roadmap-planning, usecase/pricing-negotiation, usecase/partner-identification, usecase/market-sizing, usecase/revenue-forecasting, usecase/campaign-targeting, usecase/abm, usecase/lead-scoring, usecase/ecosystem-strategy"],
  "gtm_stage": ["gtm/X" — pick all that apply from: gtm/awareness, gtm/consideration, gtm/decision, gtm/retention, gtm/expansion — leave empty [] for internal meetings"],
  "maturity": "one of: exploring | speculative | planned | committed | shipped | deprecated",
  "access": "one of: internal | confidential | executive"
}

For maturity: use 'exploring' for brainstorming/early ideas, 'speculative' for hypothetical scenarios,
'planned' for items on the roadmap not yet started, 'committed' for things actively in development,
'shipped' for confirmed/released items, 'deprecated' for no-longer-relevant.
For internal meetings with no GTM relevance, set gtm_stage to [].

For access:
- Default: internal
- confidential: M&A, investor relations, legal strategy, significant financial disclosures, HR/personnel matters
- executive: board-only, C-suite-only, or investor-facing content only

Return ONLY valid JSON, no markdown, no explanation.`;

// ── Validation enums (kept in sync with netrunner src/taxonomy/types.ts) ──

const MATURITY_LEVELS = ['exploring', 'speculative', 'planned', 'committed', 'shipped', 'deprecated'] as const;
const ACCESS_LEVELS = ['internal', 'confidential', 'executive'] as const;

type Maturity = (typeof MATURITY_LEVELS)[number];
type Access = (typeof ACCESS_LEVELS)[number];

export interface ClassificationResult {
  meeting_category: string;
  meeting_subcategory: string | null;
  secondary_tags: string[];
  domain: string[];
  usecase: string[];
  gtm_stage: string[];
  maturity: Maturity;
  access: Access;
}

// ── LLM call ──────────────────────────────────────────────────────────

/**
 * Run the classification prompt. Normalizes/clamps every output field to a
 * known-safe value — netrunner does the same to defend against the model
 * inventing categories.
 */
export async function classifyTranscript(
  openai: OpenAI,
  content: string,
  model: string,
  maxInputChars: number,
): Promise<{ result: ClassificationResult; latencyMs: number; rawOutput: string }> {
  const truncated = content.slice(0, maxInputChars);
  const t0 = Date.now();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CLASSIFICATION_PROMPT },
      { role: 'user', content: truncated },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  const latencyMs = Date.now() - t0;
  const rawOutput = response.choices[0]?.message?.content ?? '{}';
  const raw = JSON.parse(rawOutput) as Record<string, unknown>;

  const maturity = (MATURITY_LEVELS as readonly string[]).includes(String(raw.maturity))
    ? (raw.maturity as Maturity)
    : 'exploring';
  const access = (ACCESS_LEVELS as readonly string[]).includes(String(raw.access))
    ? (raw.access as Access)
    : 'internal';

  const result: ClassificationResult = {
    meeting_category: String(raw.meeting_category ?? 'internal/general'),
    meeting_subcategory: raw.meeting_subcategory ? String(raw.meeting_subcategory) : null,
    secondary_tags: Array.isArray(raw.secondary_tags) ? raw.secondary_tags.map(String) : [],
    domain: Array.isArray(raw.domain) ? raw.domain.map(String) : [],
    usecase: Array.isArray(raw.usecase) ? raw.usecase.map(String) : [],
    gtm_stage: Array.isArray(raw.gtm_stage) ? raw.gtm_stage.map(String) : [],
    maturity,
    access,
  };
  return { result, latencyMs, rawOutput };
}

// ── meeting_class derivation (no LLM) ─────────────────────────────────

/**
 * Decide whether a meeting is `internal` or `external` from its attendee
 * emails. Matches netrunner's logic: any non-internal-domain attendee →
 * external. Empty attendees → internal (conservative default).
 */
export function deriveMeetingClass(
  attendees: Array<{ email?: string | null }> | undefined,
  internalDomainsCsv: string,
): 'internal' | 'external' {
  const internalDomains = internalDomainsCsv
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (!attendees || attendees.length === 0) return 'internal';
  const hasExternal = attendees.some((a) => {
    const email = (a.email ?? '').toLowerCase();
    if (!email.includes('@')) return false;
    return !internalDomains.some((d) => email.endsWith('@' + d));
  });
  return hasExternal ? 'external' : 'internal';
}

// ── Executor ──────────────────────────────────────────────────────────

export const classifyMeeting: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = classifyMeetingConfigSchema.parse(rawConfig);

  if (cfg.dryRun) {
    ctx.log.push({ nodeId: node.id, message: 'classify_meeting: dryRun=true, emitting stub classification', level: 'info' });
    return inputRows.map((row) => ({
      ...row,
      meeting_class: deriveMeetingClass(row.attendees as Array<{ email?: string | null }>, cfg.internalDomains),
      meeting_category: 'dryrun/stub',
      meeting_subcategory: null,
      secondary_tags: [],
      taxonomy: { domain: [], usecase: [], gtm_stage: [] },
      maturity: 'exploring' as const,
      access: 'internal' as const,
    }));
  }

  // Resolve OpenAI credentials from the connections table
  const conn = await getConnectionForRuntime(cfg.connectionId, ctx.userId, 'openai');
  const { apiKey, baseUrl } = conn.secret as { apiKey: string; baseUrl?: string };
  const openai = new OpenAI({ apiKey, baseURL: baseUrl });

  const out: Row[] = [];
  for (const row of inputRows) {
    const transcript = typeof row.transcript === 'string' ? row.transcript : '';
    const attendees = row.attendees as Array<{ email?: string | null }> | undefined;
    const meetingClass = deriveMeetingClass(attendees, cfg.internalDomains);

    if (!transcript) {
      ctx.rowsErrored += 1;
      ctx.log.push({ nodeId: node.id, message: `classify_meeting: row ${String(row.fireflies_id)} has no transcript, skipping`, level: 'warn' });
      continue;
    }

    let result: ClassificationResult | null = null;
    let lastErr: unknown = null;
    let latencyMs = 0;
    let rawOutput = '';
    for (let attempt = 0; attempt <= cfg.retryCount; attempt++) {
      try {
        const r = await classifyTranscript(openai, transcript, cfg.model, cfg.maxInputChars);
        result = r.result;
        latencyMs = r.latencyMs;
        rawOutput = r.rawOutput;
        break;
      } catch (err) {
        lastErr = err;
        // Linear backoff like netrunner: attempt * 2s
        if (attempt < cfg.retryCount) await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
      }
    }

    if (!result) {
      ctx.rowsErrored += 1;
      const msg = lastErr instanceof Error ? lastErr.message : 'unknown error';
      ctx.log.push({ nodeId: node.id, message: `classify_meeting: ${String(row.fireflies_id)} failed after ${cfg.retryCount + 1} attempts: ${msg}`, level: 'error' });
      // Write a failed prompt_run for audit, then emit row with classification_error
      try {
        await db.insert(promptRuns).values({
          nodeId: node.id,
          pipelineRunId: ctx.runId,
          promptVersionTag: cfg.promptVersionTag,
          model: cfg.model,
          inputJson: { transcript_chars: transcript.length, fireflies_id: row.fireflies_id ?? null },
          errorMessage: msg,
        });
      } catch {
        // prompt_runs write itself failing shouldn't fail the row
      }
      out.push({ ...row, classification_error: msg, meeting_class: meetingClass });
      continue;
    }

    // For internal meetings, force gtm_stage to [] (matches netrunner rule on line 81 of prompt)
    if (meetingClass === 'internal') result.gtm_stage = [];

    // Write prompt_runs audit row
    try {
      await db.insert(promptRuns).values({
        nodeId: node.id,
        pipelineRunId: ctx.runId,
        promptVersionTag: cfg.promptVersionTag,
        model: cfg.model,
        inputJson: { transcript_chars: transcript.length, fireflies_id: row.fireflies_id ?? null },
        outputJson: result as unknown as Record<string, unknown>,
        latencyMs,
      });
    } catch (err) {
      ctx.log.push({
        nodeId: node.id,
        message: `classify_meeting: prompt_runs insert failed (non-fatal): ${err instanceof Error ? err.message : 'unknown'}`,
        level: 'warn',
      });
    }

    out.push({
      ...row,
      meeting_class: meetingClass,
      meeting_category: result.meeting_category,
      meeting_subcategory: result.meeting_subcategory,
      secondary_tags: result.secondary_tags,
      taxonomy: {
        domain: result.domain,
        usecase: result.usecase,
        gtm_stage: result.gtm_stage,
        // partner_type and entities arrays come from extract_entities node (Phase 3)
      },
      maturity: result.maturity,
      access: result.access,
      // Suppress raw output from row payload to keep downstream rows lean —
      // it's already preserved in prompt_runs for debugging.
      _classify_latency_ms: latencyMs,
    });
  }

  ctx.log.push({
    nodeId: node.id,
    message: `classify_meeting: classified ${out.length}/${inputRows.length} rows (model=${cfg.model}, prompt=${cfg.promptVersionTag})`,
    level: 'info',
  });
  return out;
};
