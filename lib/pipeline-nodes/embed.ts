/**
 * `embed` — pipeline node executor (Phase 3).
 *
 * Batched OpenAI embedding call over chunk rows. Reuses the existing
 * `text-embedding-3-small` (1536d) convention already in use by Helm's RAG
 * stack (see lib/knowledge-ingest.ts).
 *
 * Each input row must have a `content` string field (chunks from
 * `chunk_text` satisfy this). Output rows add `embedding: number[]`
 * (length 1536) and `embedding_model: string`.
 *
 * Cost-aware: dryRun mode emits zero-vectors so the downstream
 * `promote_chunks` can be exercised without burning embedding spend.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const embedConfigSchema = z.object({
  model: z.string().default('text-embedding-3-small'),
  /** OpenAI accepts up to 2048 inputs per request, but we cap to keep failures localized. */
  batchSize: z.number().int().min(1).max(2048).default(100),
  /** Field on each input row containing the text to embed. */
  contentField: z.string().default('content'),
  openaiApiKeyEnv: z.string().default('OPENAI_API_KEY'),
  /** Emit zero-vectors instead of calling OpenAI. Useful for testing downstream. */
  dryRun: z.boolean().default(false),
});

export type EmbedConfig = z.infer<typeof embedConfigSchema>;

const EMBEDDING_DIMS = 1536; // text-embedding-3-small

export const embed: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = embedConfigSchema.parse(rawConfig);

  if (inputRows.length === 0) {
    ctx.log.push({ nodeId: node.id, message: 'embed: no input rows', level: 'info' });
    return [];
  }

  if (cfg.dryRun) {
    const zeros = new Array<number>(EMBEDDING_DIMS).fill(0);
    ctx.log.push({ nodeId: node.id, message: `embed: dryRun=true, returning ${inputRows.length} rows with zero-vectors`, level: 'info' });
    return inputRows.map((row) => ({ ...row, embedding: zeros, embedding_model: cfg.model }));
  }

  const apiKey = process.env[cfg.openaiApiKeyEnv];
  if (!apiKey) throw new Error(`embed: env var ${cfg.openaiApiKeyEnv} not set`);
  const openai = new OpenAI({ apiKey });

  const out: Row[] = [];
  let batchCount = 0;
  for (let i = 0; i < inputRows.length; i += cfg.batchSize) {
    const batch = inputRows.slice(i, i + cfg.batchSize);
    const inputs: string[] = [];
    for (const row of batch) {
      const text = row[cfg.contentField];
      inputs.push(typeof text === 'string' ? text : '');
    }
    try {
      const resp = await openai.embeddings.create({ model: cfg.model, input: inputs });
      for (let j = 0; j < batch.length; j++) {
        const embedding = resp.data[j]?.embedding ?? [];
        out.push({ ...batch[j], embedding, embedding_model: cfg.model });
      }
      batchCount += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      ctx.rowsErrored += batch.length;
      ctx.log.push({ nodeId: node.id, message: `embed: batch ${batchCount + 1} of ${Math.ceil(inputRows.length / cfg.batchSize)} failed: ${msg}`, level: 'error' });
      // Emit batch rows with embedding_error so downstream can decide whether to skip
      for (const row of batch) {
        out.push({ ...row, embedding: null, embedding_error: msg, embedding_model: cfg.model });
      }
    }
  }

  ctx.log.push({
    nodeId: node.id,
    message: `embed: ${out.length} rows embedded across ${batchCount} batch(es) (model=${cfg.model})`,
    level: 'info',
  });
  return out;
};
