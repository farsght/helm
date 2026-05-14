/**
 * `extract_entities` — pipeline node executor (Phase 3).
 *
 * Ports netrunner's `scripts/enrich-fireflies.ts` Pass 2 + Pass 2-aux
 * (`scripts/extract-entities.ts`) — one LLM call per row that pulls out
 * people, companies, products, and partner_type from the meeting transcript.
 *
 * Per docs/meetings-pipeline.md §4.4: prompts are preserved VERBATIM from
 * netrunner. The `entities[]` output is a slug list (entity/<lowercased-name>)
 * which downstream `promote_entities` upserts into the `entities` table.
 *
 * Internal-meeting rule from netrunner: partner_type forced to 'none' when
 * meeting_class === 'internal'.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '@/db';
import { promptRuns } from '@/db/schema';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const extractEntitiesConfigSchema = z.object({
  model: z.string().default('gpt-4o-mini'),
  promptVersionTag: z.string().default('netrunner-v1'),
  retryCount: z.number().int().min(0).max(5).default(3),
  maxInputChars: z.number().int().min(1000).max(48000).default(12000),
  openaiApiKeyEnv: z.string().default('OPENAI_API_KEY'),
  dryRun: z.boolean().default(false),
});

export type ExtractEntitiesConfig = z.infer<typeof extractEntitiesConfigSchema>;

// VERBATIM from netrunner scripts/enrich-fireflies.ts (Pass 2 ENTITY_PROMPT).
const ENTITY_PROMPT = `You are extracting entities from a Bitwage meeting transcript.

Return a JSON object with this exact structure:
{
  "people": ["Full Name", ...],
  "companies": ["Company Name", ...],
  "products": ["Product Name", ...],
  "features": ["Feature/capability name", ...],
  "entities": ["entity/slug-form-of-company-or-product", ...],
  "partner_type": "none | integrated | strategic | reseller | unknown"
}

Rules:
- people: external people mentioned by name (not just Bitwage team members)
- companies: competitor companies, partner companies, prospect/customer companies
- products: specific named products (e.g. "Deel EOR", "Wise Business", "Bitwage Payroll")
- features: specific product capabilities or features discussed
- entities: slug versions of companies and products (lowercase, hyphens), prefixed with "entity/"
- partner_type: ONLY if an explicit partnership is discussed (not just a competitor mention).
  Use "none" if meeting is internal or no partnership discussed.
  Use "unknown" if a partner is mentioned but type is unclear.
  Use "integrated", "strategic", or "reseller" only if explicitly stated.

Return ONLY valid JSON, no markdown, no explanation.`;

const PARTNER_TYPES = ['none', 'integrated', 'strategic', 'reseller', 'unknown'] as const;
type PartnerType = (typeof PARTNER_TYPES)[number];

export interface EntityResult {
  people: string[];
  companies: string[];
  products: string[];
  features: string[];
  entities: string[];
  partner_type: PartnerType;
}

export async function extractEntitiesLLM(
  openai: OpenAI,
  content: string,
  model: string,
  maxInputChars: number,
): Promise<{ result: EntityResult; latencyMs: number; rawOutput: string }> {
  const truncated = content.slice(0, maxInputChars);
  const t0 = Date.now();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: ENTITY_PROMPT },
      { role: 'user', content: truncated },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.0,
  });
  const latencyMs = Date.now() - t0;
  const rawOutput = response.choices[0]?.message?.content ?? '{}';
  const raw = JSON.parse(rawOutput) as Record<string, unknown>;

  const partner_type = (PARTNER_TYPES as readonly string[]).includes(String(raw.partner_type))
    ? (raw.partner_type as PartnerType)
    : 'none';

  return {
    result: {
      people: Array.isArray(raw.people) ? raw.people.map(String) : [],
      companies: Array.isArray(raw.companies) ? raw.companies.map(String) : [],
      products: Array.isArray(raw.products) ? raw.products.map(String) : [],
      features: Array.isArray(raw.features) ? raw.features.map(String) : [],
      entities: Array.isArray(raw.entities) ? raw.entities.map(String) : [],
      partner_type,
    },
    latencyMs,
    rawOutput,
  };
}

export const extractEntities: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = extractEntitiesConfigSchema.parse(rawConfig);

  if (cfg.dryRun) {
    ctx.log.push({ nodeId: node.id, message: 'extract_entities: dryRun=true, emitting empty entity stubs', level: 'info' });
    return inputRows.map((row) => ({
      ...row,
      entities: { people: [], companies: [], products: [], features: [], entities: [], partner_type: 'none' as const },
    }));
  }

  const apiKey = process.env[cfg.openaiApiKeyEnv];
  if (!apiKey) throw new Error(`extract_entities: env var ${cfg.openaiApiKeyEnv} not set`);
  const openai = new OpenAI({ apiKey });

  const out: Row[] = [];
  for (const row of inputRows) {
    const transcript = typeof row.transcript === 'string' ? row.transcript : '';
    if (!transcript) {
      ctx.rowsErrored += 1;
      ctx.log.push({ nodeId: node.id, message: `extract_entities: row ${String(row.fireflies_id)} missing transcript`, level: 'warn' });
      continue;
    }

    let result: EntityResult | null = null;
    let lastErr: unknown = null;
    let latencyMs = 0;
    for (let attempt = 0; attempt <= cfg.retryCount; attempt++) {
      try {
        const r = await extractEntitiesLLM(openai, transcript, cfg.model, cfg.maxInputChars);
        result = r.result;
        latencyMs = r.latencyMs;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < cfg.retryCount) await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
      }
    }

    if (!result) {
      ctx.rowsErrored += 1;
      const msg = lastErr instanceof Error ? lastErr.message : 'unknown error';
      ctx.log.push({ nodeId: node.id, message: `extract_entities: ${String(row.fireflies_id)} failed: ${msg}`, level: 'error' });
      try {
        await db.insert(promptRuns).values({
          nodeId: node.id, pipelineRunId: ctx.runId,
          promptVersionTag: cfg.promptVersionTag, model: cfg.model,
          inputJson: { transcript_chars: transcript.length, fireflies_id: row.fireflies_id ?? null },
          errorMessage: msg,
        });
      } catch { /* non-fatal */ }
      out.push({ ...row, entities_error: msg });
      continue;
    }

    // Internal-meeting rule from netrunner enrich-fireflies.ts line 217
    if (row.meeting_class === 'internal') result.partner_type = 'none';

    try {
      await db.insert(promptRuns).values({
        nodeId: node.id, pipelineRunId: ctx.runId,
        promptVersionTag: cfg.promptVersionTag, model: cfg.model,
        inputJson: { transcript_chars: transcript.length, fireflies_id: row.fireflies_id ?? null },
        outputJson: result as unknown as Record<string, unknown>,
        latencyMs,
      });
    } catch (err) {
      ctx.log.push({ nodeId: node.id, message: `extract_entities: prompt_runs insert failed (non-fatal): ${err instanceof Error ? err.message : 'unknown'}`, level: 'warn' });
    }

    // Merge entity results into taxonomy (mirroring netrunner Pass 2 schema)
    const taxonomy = (row.taxonomy as Record<string, unknown>) ?? {};
    out.push({
      ...row,
      entities: result,
      taxonomy: {
        ...taxonomy,
        entities: result.entities,
        partner_type: result.partner_type,
      },
    });
  }

  ctx.log.push({
    nodeId: node.id,
    message: `extract_entities: extracted entities from ${out.length}/${inputRows.length} rows`,
    level: 'info',
  });
  return out;
};
