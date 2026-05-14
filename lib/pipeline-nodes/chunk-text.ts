/**
 * `chunk_text` — pipeline node executor (Phase 3).
 *
 * Fan-out node: each input row emits N chunk rows. Section-aware splitter
 * adapted from netrunner `scripts/chunker.ts`. Key differences from netrunner:
 *
 *   - No `gpt-tokenizer` dependency — char-based length estimate (chars/4 ≈
 *     tokens). At our chunk sizes (~512 tokens) the OpenAI embedding API
 *     comfortably accepts even pessimistic char-based estimates, and skipping
 *     the dep keeps the runtime light.
 *   - Each output row carries `parent_fireflies_id` + the full classified
 *     parent taxonomy (so `promote_chunks` can write meeting_class /
 *     meeting_category / taxonomy_json onto each chunk row).
 *
 * Skip + no-overlap section rules ported verbatim from netrunner.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const chunkTextConfigSchema = z.object({
  /** Target chunk size in approximate tokens (chars/4 estimate). */
  targetTokens: z.number().int().min(64).max(2048).default(512),
  /** Overlap in approximate tokens. */
  overlapTokens: z.number().int().min(0).max(512).default(64),
  /** Source field on the input row (default "transcript"). */
  field: z.string().default('transcript'),
  /** Source type tag stamped onto each chunk row. */
  sourceType: z.enum(['transcript', 'summary']).default('transcript'),
  /** Split on `## H2` boundaries before token-window splitting. */
  sectionAware: z.boolean().default(true),
});

export type ChunkTextConfig = z.infer<typeof chunkTextConfigSchema>;

const SKIP_SECTIONS = new Set(['Speaker Analytics', 'Attendance']);
const NO_OVERLAP_SECTIONS = new Set(['Action Items', 'Questions Raised', 'Metrics Mentioned', 'Pricing Discussions']);

const charsPerToken = 4;

export function splitIntoSections(markdown: string): Array<{ header: string; content: string }> {
  const sectionRegex = /^## (.+)$/gm;
  const sections: Array<{ header: string; content: string }> = [];
  let lastIndex = 0;
  let lastHeader = '__preamble__';

  for (const match of markdown.matchAll(sectionRegex)) {
    if (match.index !== undefined && (match.index > 0 || lastHeader !== '__preamble__')) {
      sections.push({ header: lastHeader, content: markdown.slice(lastIndex, match.index).trim() });
    }
    lastHeader = match[1]!.trim();
    lastIndex = (match.index ?? 0) + match[0].length + 1;
  }
  sections.push({ header: lastHeader, content: markdown.slice(lastIndex).trim() });
  return sections.filter((s) => s.content.length > 0 && s.header !== '__preamble__');
}

/**
 * Char-window splitter that approximates token-window behavior. We size on
 * chars (tokens * 4) since that's the established OpenAI rule-of-thumb and
 * avoids a heavy tokenizer dep for chunking alone.
 */
export function splitByCharWindow(content: string, targetTokens: number, overlapTokens: number): string[] {
  const targetChars = targetTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  if (content.length <= targetChars) return [content];
  const chunks: string[] = [];
  let start = 0;
  while (start < content.length) {
    const end = Math.min(start + targetChars, content.length);
    chunks.push(content.slice(start, end));
    if (end === content.length) break;
    start = end - overlapChars;
  }
  return chunks;
}

function chunkId(parentId: string, index: number): string {
  return createHash('sha256').update(`${parentId}:${index}`).digest('hex').slice(0, 16);
}

export const chunkText: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = chunkTextConfigSchema.parse(rawConfig);
  const out: Row[] = [];

  for (const row of inputRows) {
    const body = typeof row[cfg.field] === 'string' ? (row[cfg.field] as string) : '';
    const parentId = String(row.fireflies_id ?? row.slug ?? row.id ?? '');
    if (!body) {
      ctx.log.push({ nodeId: node.id, message: `chunk_text: row ${parentId} has empty ${cfg.field}, skipping`, level: 'warn' });
      continue;
    }

    let chunkIdx = 0;

    if (cfg.sectionAware) {
      const sections = splitIntoSections(body);
      // Short content fallback: emit the whole body as a single chunk if no sections matched.
      if (sections.length === 0) {
        out.push(makeChunkRow(row, body.trim(), 'full_meeting', chunkIdx++, parentId, cfg));
        continue;
      }

      for (const section of sections) {
        if (SKIP_SECTIONS.has(section.header)) continue;
        const overlap = NO_OVERLAP_SECTIONS.has(section.header) ? 0 : cfg.overlapTokens;
        const pieces = splitByCharWindow(section.content, cfg.targetTokens, overlap);
        for (const piece of pieces) {
          const trimmed = piece.trim();
          if (!trimmed) continue;
          out.push(makeChunkRow(row, trimmed, section.header, chunkIdx++, parentId, cfg));
        }
      }
    } else {
      // Non-section-aware: just window the whole body.
      const pieces = splitByCharWindow(body, cfg.targetTokens, cfg.overlapTokens);
      for (const piece of pieces) {
        const trimmed = piece.trim();
        if (!trimmed) continue;
        out.push(makeChunkRow(row, trimmed, 'body', chunkIdx++, parentId, cfg));
      }
    }
  }

  ctx.log.push({
    nodeId: node.id,
    message: `chunk_text: ${inputRows.length} parents → ${out.length} chunks (target=${cfg.targetTokens}tok, overlap=${cfg.overlapTokens}tok)`,
    level: 'info',
  });
  return out;
};

function makeChunkRow(
  parentRow: Row,
  content: string,
  sectionHeading: string,
  chunkIndex: number,
  parentId: string,
  cfg: ChunkTextConfig,
): Row {
  return {
    // Carry parent meeting metadata so promote_chunks can write meeting_class etc.
    parent_fireflies_id: parentId,
    parent_slug: parentRow.slug ?? null,
    parent_meeting_class: parentRow.meeting_class ?? null,
    parent_meeting_category: parentRow.meeting_category ?? null,
    parent_taxonomy: parentRow.taxonomy ?? null,
    // Chunk-specific fields
    chunk_id: chunkId(parentId, chunkIndex),
    chunk_index: chunkIndex,
    section_heading: sectionHeading,
    source_type: cfg.sourceType,
    content,
    // Char-based token estimate; downstream `embed` will refine if needed.
    token_count_estimate: Math.ceil(content.length / charsPerToken),
  };
}
