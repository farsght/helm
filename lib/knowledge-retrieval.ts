/**
 * Knowledge retrieval — vector search against knowledge_chunks.
 *
 * Used by the agent runtime to inject context into agent prompts at runtime.
 * The retrieval is scoped to the set of datasets attached to the agent via
 * agent_knowledge_links, optionally further filtered by path_prefix.
 */

import { sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { db } from '@/db';
import { EMBEDDING_MODEL } from './knowledge-ingest';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface RetrievalAttachment {
  datasetId: number;
  pathPrefix: string | null;
  topK: number | null;
}

export interface RetrievedChunk {
  id: number;
  datasetId: number;
  sourcePath: string;
  chunkIndex: number;
  headingPath: string | null;
  content: string;
  frontmatter: Record<string, unknown> | null;
  similarity: number;
}

/**
 * Vector-search across attached datasets, return top-K matches per attachment
 * (or globally — see `flatten` flag).
 *
 * Each attachment can have its own topK. We run one query per attachment so
 * pathPrefix filters work cleanly, then merge results by similarity desc.
 */
export async function retrieveContext(
  query: string,
  attachments: RetrievalAttachment[],
  defaultTopK: number = 5
): Promise<RetrievedChunk[]> {
  if (attachments.length === 0 || !query.trim()) return [];

  // Embed the query once.
  const emb = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  const qVec = `[${emb.data[0].embedding.join(',')}]`;

  const all: RetrievedChunk[] = [];
  for (const att of attachments) {
    const k = att.topK ?? defaultTopK;
    // Using cosine distance (1 - similarity). We sort by distance asc and
    // present similarity = 1 - distance for human-friendly scores.
    const rows = att.pathPrefix
      ? await db.execute(sql`
          SELECT id, dataset_id, source_path, chunk_index, heading_path, content,
                 frontmatter_json,
                 1 - (embedding <=> ${qVec}::vector) AS similarity
          FROM knowledge_chunks
          WHERE dataset_id = ${att.datasetId}
            AND source_path LIKE ${att.pathPrefix + '%'}
          ORDER BY embedding <=> ${qVec}::vector
          LIMIT ${k}
        `)
      : await db.execute(sql`
          SELECT id, dataset_id, source_path, chunk_index, heading_path, content,
                 frontmatter_json,
                 1 - (embedding <=> ${qVec}::vector) AS similarity
          FROM knowledge_chunks
          WHERE dataset_id = ${att.datasetId}
          ORDER BY embedding <=> ${qVec}::vector
          LIMIT ${k}
        `);

    const r = rows as unknown as { rows: Array<Record<string, unknown>> };
    for (const row of r.rows) {
      all.push({
        id: row.id as number,
        datasetId: row.dataset_id as number,
        sourcePath: row.source_path as string,
        chunkIndex: row.chunk_index as number,
        headingPath: (row.heading_path as string | null) ?? null,
        content: row.content as string,
        frontmatter: (row.frontmatter_json as Record<string, unknown> | null) ?? null,
        similarity: Number(row.similarity ?? 0),
      });
    }
  }

  all.sort((a, b) => b.similarity - a.similarity);
  return all;
}

/**
 * Format retrieved chunks into a system-prompt-friendly block. Used by the
 * agent runtime; also reusable wherever we want to show citations.
 */
export function formatContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  const lines: string[] = [
    '<knowledge_context>',
    'The following excerpts were retrieved from your knowledge base by semantic similarity to the current task. Use them to inform your response. Cite the source path inline when you use a fact.',
    '',
  ];
  for (const c of chunks) {
    const path = c.headingPath ? `${c.sourcePath} :: ${c.headingPath}` : c.sourcePath;
    lines.push(`<excerpt path="${path}" similarity="${c.similarity.toFixed(3)}">`);
    lines.push(c.content);
    lines.push('</excerpt>');
    lines.push('');
  }
  lines.push('</knowledge_context>');
  return lines.join('\n');
}
