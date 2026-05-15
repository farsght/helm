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
import { getConnectionForRuntime } from '../connections';

export const embedConfigSchema = z.object({
  model: z.string().default('text-embedding-3-small'),
  /** OpenAI accepts up to 2048 inputs per request, but we cap to keep failures localized. */
  batchSize: z.number().int().min(1).max(2048).default(100),
  /** Field on each input row containing the text to embed. */
  contentField: z.string().default('content'),
  /** Connection ID from the `connections` table (kind=openai). Required. */
  connectionId: z.number().int().positive(),
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

  // Resolve OpenAI credentials from the connections table
  const conn = await getConnectionForRuntime(cfg.connectionId, ctx.userId, 'openai');
  const { apiKey, baseUrl } = conn.secret as { apiKey: string; baseUrl?: string };
  const openai = new OpenAI({ apiKey, baseURL: baseUrl });

  // Token-based batch splitting heuristic: ~4 chars per token, cap at 250k tokens per call.
  // This prevents hitting OpenAI's 300k token limit when processing long meeting transcripts.
  const MAX_ESTIMATED_TOKENS = 250_000;
  const TOKEN_CHARS_RATIO = 4; // chars per token estimate

  /**
   * Build token-aware batches: each batch is limited by batchSize (row count)
   * AND by estimated token count (text.length / 4). When adding the next row
   * would push estimated tokens over MAX_ESTIMATED_TOKENS, start a new batch.
   */
  function buildTokenAwareBatches(rows: Row[]): Row[][] {
    const batches: Row[][] = [];
    let current: Row[] = [];
    let currentTokens = 0;

    for (const row of rows) {
      const text = row[cfg.contentField];
      const textStr = typeof text === 'string' ? text : '';
      const estimatedTokens = Math.ceil(textStr.length / TOKEN_CHARS_RATIO);

      const wouldExceedTokens = currentTokens + estimatedTokens > MAX_ESTIMATED_TOKENS;
      const wouldExceedCount = current.length >= cfg.batchSize;

      if (current.length > 0 && (wouldExceedTokens || wouldExceedCount)) {
        batches.push(current);
        current = [];
        currentTokens = 0;
      }

      current.push(row);
      currentTokens += estimatedTokens;
    }

    if (current.length > 0) batches.push(current);
    return batches;
  }

  const batches = buildTokenAwareBatches(inputRows);

  const out: Row[] = [];
  let batchCount = 0;
  for (const batch of batches) {
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
      ctx.log.push({ nodeId: node.id, message: `embed: batch ${batchCount + 1} of ${batches.length} failed: ${msg}`, level: 'error' });
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
