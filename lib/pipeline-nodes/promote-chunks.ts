/**
 * `promote_chunks` — pipeline node executor (Phase 4).
 *
 * Writes embedded chunks to `meeting_chunks`. Each input row is one chunk
 * with: parent_fireflies_id, chunk_index, content, embedding (number[]),
 * section_heading, source_type, and parent meeting metadata.
 *
 * meeting_id is resolved by looking up fireflies_id in `meetings`. This
 * means promote_chunks can run AFTER promote_meetings in the same graph,
 * or as a sibling branch — the FK is looked up at write time, not passed
 * down the graph.
 *
 * Idempotent via the unique index on (meeting_id, chunk_index): a
 * re-run replaces the chunk's content + embedding in place.
 *
 * pgvector note: `embedding` is declared as `text` in the Drizzle schema
 * because pgvector ops happen via raw SQL templates. We render the
 * number[] as a pgvector literal `[v1,v2,...]` and cast in the INSERT.
 */

import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/db';
import { meetings, meetingChunks } from '@/db/schema';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const promoteChunksConfigSchema = z.object({
  /** Embedding model to record on the row (defaults to text-embedding-3-small). */
  embeddingModel: z.string().default('text-embedding-3-small'),
  /** Skip rows whose embedding is null/missing (otherwise they error). */
  skipMissingEmbeddings: z.boolean().default(true),
});
export type PromoteChunksConfig = z.infer<typeof promoteChunksConfigSchema>;

function isVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

async function resolveMeetingId(firefliesId: string, cache: Map<string, number>): Promise<number | null> {
  const cached = cache.get(firefliesId);
  if (cached !== undefined) return cached;
  const [m] = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.firefliesId, firefliesId));
  if (!m) return null;
  cache.set(firefliesId, m.id);
  return m.id;
}

export const promoteChunks: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = promoteChunksConfigSchema.parse(rawConfig);
  const meetingIdCache = new Map<string, number>();
  let written = 0;
  let skipped = 0;

  for (const row of inputRows) {
    const firefliesId =
      typeof row.parent_fireflies_id === 'string' ? row.parent_fireflies_id :
      typeof row.fireflies_id === 'string' ? row.fireflies_id : null;
    const chunkIndex = typeof row.chunk_index === 'number' ? row.chunk_index : null;
    const content = typeof row.content === 'string' ? row.content : null;
    const embedding = row.embedding;

    if (!firefliesId || chunkIndex === null || !content) {
      skipped += 1;
      ctx.log.push({
        nodeId: node.id,
        message: `promote_chunks: row missing parent_fireflies_id/chunk_index/content — skipped`,
        level: 'warn',
      });
      continue;
    }

    if (!isVector(embedding)) {
      if (cfg.skipMissingEmbeddings) {
        skipped += 1;
        continue;
      }
      ctx.rowsErrored += 1;
      ctx.log.push({
        nodeId: node.id,
        message: `promote_chunks: row ${firefliesId}#${chunkIndex} has no embedding — skipped`,
        level: 'warn',
      });
      continue;
    }

    const meetingId = await resolveMeetingId(firefliesId, meetingIdCache);
    if (meetingId === null) {
      ctx.rowsErrored += 1;
      ctx.log.push({
        nodeId: node.id,
        message: `promote_chunks: meeting not found for fireflies_id=${firefliesId} (run promote_meetings first)`,
        level: 'error',
      });
      continue;
    }

    const vectorLiteral = `[${embedding.join(',')}]`;
    const sectionHeading = typeof row.section_heading === 'string' ? row.section_heading : null;
    const sourceType = typeof row.source_type === 'string' ? row.source_type : 'transcript';
    const meetingClass = typeof row.parent_meeting_class === 'string' ? row.parent_meeting_class : null;
    const meetingCategory = typeof row.parent_meeting_category === 'string' ? row.parent_meeting_category : null;
    const taxonomyJson = (row.parent_taxonomy && typeof row.parent_taxonomy === 'object') ? row.parent_taxonomy : null;
    const embeddingModel = typeof row.embedding_model === 'string' ? row.embedding_model : cfg.embeddingModel;

    try {
      // Upsert by (meeting_id, chunk_index). We can't use Drizzle's onConflict
      // helper because pgvector requires raw SQL for the embedding column.
      await db.execute(sql`
        INSERT INTO meeting_chunks
          (meeting_id, chunk_index, source_type, section_heading,
           content, embedding, embedding_model,
           meeting_class, meeting_category, taxonomy_json)
        VALUES (
          ${meetingId}, ${chunkIndex}, ${sourceType}, ${sectionHeading},
          ${content}, ${vectorLiteral}::vector, ${embeddingModel},
          ${meetingClass}, ${meetingCategory},
          ${taxonomyJson ? JSON.stringify(taxonomyJson) : null}::jsonb
        )
        ON CONFLICT (meeting_id, chunk_index) DO UPDATE SET
          source_type      = EXCLUDED.source_type,
          section_heading  = EXCLUDED.section_heading,
          content          = EXCLUDED.content,
          embedding        = EXCLUDED.embedding,
          embedding_model  = EXCLUDED.embedding_model,
          meeting_class    = EXCLUDED.meeting_class,
          meeting_category = EXCLUDED.meeting_category,
          taxonomy_json    = EXCLUDED.taxonomy_json
      `);
      written += 1;
    } catch (err) {
      ctx.rowsErrored += 1;
      const msg = err instanceof Error ? err.message : 'unknown error';
      ctx.log.push({
        nodeId: node.id,
        message: `promote_chunks: write failed for ${firefliesId}#${chunkIndex}: ${msg}`,
        level: 'error',
      });
    }
  }

  // Bump meetings.enrichment_vector_prepped for every meeting we touched.
  for (const meetingId of meetingIdCache.values()) {
    try {
      await db
        .update(meetings)
        .set({ enrichmentVectorPrepped: true, updatedAt: new Date() })
        .where(eq(meetings.id, meetingId));
    } catch {
      /* non-fatal */
    }
  }

  ctx.log.push({
    nodeId: node.id,
    message: `promote_chunks: wrote ${written}/${inputRows.length} chunks (${skipped} skipped) across ${meetingIdCache.size} meeting(s)`,
    level: 'info',
  });
  // Pass through chunk rows in case a downstream node wants them (e.g. count).
  return inputRows;
};
