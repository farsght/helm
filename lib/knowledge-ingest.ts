/**
 * Knowledge ingestion — walk a source, parse frontmatter, chunk, embed, upsert.
 *
 * v1 source type: `obsidian_vault` — local filesystem walk of an Obsidian vault.
 * The interface is shape-compatible with future source types (hubspot_companies,
 * gsheets, webhook, etc.): each yields { sourcePath, frontmatter, body } docs.
 *
 * Pipeline shape (matches the Pipelines node UX):
 *   [dataset:obsidian_vault] → chunkText() → embedChunks() → upsertKnowledgeChunks()
 *
 * Chunking strategy: recursive char splitter, ~800 tokens / 100 overlap.
 * We approximate tokens as chars/4 since precise tokenization isn't worth the
 * tiktoken dependency for a chunker — OpenAI's text-embedding-3-small handles
 * up to 8191 input tokens per call so we batch chunks at ~100 per request to
 * stay well under per-request limits while keeping throughput high.
 */

import { readFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import OpenAI from 'openai';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS = 1536;
const TARGET_CHUNK_TOKENS = 800;
const CHUNK_OVERLAP_TOKENS = 100;
const APPROX_CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;
const CHUNK_OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN;
const EMBED_BATCH_SIZE = 100;

export interface SourceDoc {
  /** Path relative to the vault root, e.g. "Knowledge Base/Sources/foo.md". */
  sourcePath: string;
  /** Parsed YAML frontmatter, or null if none. */
  frontmatter: Record<string, unknown> | null;
  /** The body (post-frontmatter) markdown. */
  body: string;
}

export interface ChunkRecord {
  sourcePath: string;
  chunkIndex: number;
  totalChunks: number;
  frontmatter: Record<string, unknown> | null;
  headingPath: string | null;
  content: string;
  contentHash: string;
  tokenCount: number;
}

export interface EmbeddedChunk extends ChunkRecord {
  embedding: number[];
}

// ── Source: Obsidian vault ───────────────────────────────────────────────

export interface VaultSourceMeta {
  vaultPath: string; // expanded absolute path
  includeGlobs?: string[]; // default: **/*.md
  excludeGlobs?: string[]; // default: dotfile dirs
}

const DEFAULT_EXCLUDED_DIR_PREFIXES = [
  '.obsidian', '.smart-env', '.git', '.trash', '.DS_Store',
  'node_modules',
];

export function* walkVault(meta: VaultSourceMeta): Generator<{ absPath: string; relPath: string }> {
  const root = meta.vaultPath;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[] = [];
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (DEFAULT_EXCLUDED_DIR_PREFIXES.some((p) => name === p || name.startsWith(p))) continue;
      const abs = join(dir, name);
      let st;
      try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) {
        stack.push(abs);
      } else if (st.isFile() && abs.toLowerCase().endsWith('.md')) {
        yield { absPath: abs, relPath: relative(root, abs).split(sep).join('/') };
      }
    }
  }
}

export async function readSourceDoc(absPath: string, relPath: string): Promise<SourceDoc> {
  const raw = await readFile(absPath, 'utf8');
  const parsed = matter(raw);
  return {
    sourcePath: relPath,
    frontmatter: Object.keys(parsed.data).length > 0 ? (parsed.data as Record<string, unknown>) : null,
    body: parsed.content,
  };
}

// ── Chunking ─────────────────────────────────────────────────────────────

/**
 * Recursive char splitter — splits on paragraph, then sentence, then word
 * boundaries until each chunk fits TARGET_CHUNK_CHARS. Maintains overlap
 * between consecutive chunks so retrieval doesn't lose context at boundaries.
 *
 * Also tracks the active markdown heading path (e.g. "Pricing > Enterprise")
 * so retrieval can surface section-aware citations.
 */
export function chunkText(doc: SourceDoc): ChunkRecord[] {
  const body = doc.body.trim();
  if (body.length === 0) return [];

  const chunks: ChunkRecord[] = [];

  // Track headings as we walk through paragraphs.
  const paragraphs = body.split(/\n\s*\n/);
  let currentHeadings: string[] = [];
  let buf = '';
  let bufHeadingPath: string | null = null;

  const flush = () => {
    if (buf.trim().length === 0) return;
    chunks.push({
      sourcePath: doc.sourcePath,
      chunkIndex: chunks.length,
      totalChunks: 0, // patched below
      frontmatter: doc.frontmatter,
      headingPath: bufHeadingPath,
      content: buf.trim(),
      contentHash: '',
      tokenCount: Math.ceil(buf.length / APPROX_CHARS_PER_TOKEN),
    });
    // Overlap: keep last CHUNK_OVERLAP_CHARS as the seed for next chunk
    if (buf.length > CHUNK_OVERLAP_CHARS) {
      buf = buf.slice(-CHUNK_OVERLAP_CHARS);
    } else {
      buf = '';
    }
  };

  for (const para of paragraphs) {
    // Heading detection — update path before flushing so the chunk
    // following the heading gets the new path tagged.
    const headingMatch = /^(#{1,6})\s+(.+)$/m.exec(para.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      currentHeadings = currentHeadings.slice(0, level - 1);
      currentHeadings[level - 1] = text;
      bufHeadingPath = currentHeadings.filter(Boolean).join(' > ') || null;
    }

    const candidate = buf.length === 0 ? para : `${buf}\n\n${para}`;
    if (candidate.length <= TARGET_CHUNK_CHARS) {
      buf = candidate;
      continue;
    }

    // Para itself fits, but combining overflows — flush and start fresh.
    if (para.length <= TARGET_CHUNK_CHARS) {
      flush();
      buf = buf.length === 0 ? para : `${buf}\n\n${para}`;
      continue;
    }

    // Para is bigger than a chunk — split it by sentence, then by char.
    flush();
    const sentences = para.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (sentence.length > TARGET_CHUNK_CHARS) {
        // Hard char split of pathologically long content (e.g. tables, code).
        for (let i = 0; i < sentence.length; i += TARGET_CHUNK_CHARS - CHUNK_OVERLAP_CHARS) {
          buf = sentence.slice(i, i + TARGET_CHUNK_CHARS);
          flush();
        }
      } else if ((buf + ' ' + sentence).length > TARGET_CHUNK_CHARS) {
        flush();
        buf = sentence;
      } else {
        buf = buf.length === 0 ? sentence : `${buf} ${sentence}`;
      }
    }
  }

  if (buf.trim().length > 0) flush();

  // Patch totalChunks + contentHash on every chunk now that we know the count.
  const total = chunks.length;
  for (const c of chunks) {
    c.totalChunks = total;
    c.contentHash = createHash('sha256').update(c.content).digest('hex').slice(0, 32);
  }

  return chunks;
}

// ── Embedding ────────────────────────────────────────────────────────────

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function embedChunks(chunks: ChunkRecord[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];
  const out: EmbeddedChunk[] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const resp = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.map((c) => c.content),
    });
    for (let j = 0; j < batch.length; j++) {
      out.push({ ...batch[j], embedding: resp.data[j].embedding });
    }
  }
  return out;
}

// ── Persistence ──────────────────────────────────────────────────────────

/**
 * Upsert chunks into knowledge_chunks. Uses (datasetId, sourcePath, chunkIndex)
 * unique constraint as the merge key, so re-running a sync against modified
 * files cleanly replaces the old chunks for that file.
 *
 * Strategy: delete all existing chunks for the (datasetId, sourcePath) tuple,
 * then insert the new ones. This is simpler than diffing chunks and ensures
 * stale chunks from a now-shorter file don't linger.
 */
export async function upsertKnowledgeChunks(
  datasetId: number,
  userId: string,
  sourcePath: string,
  embedded: EmbeddedChunk[]
): Promise<void> {
  // Delete previous chunks for this source path within this dataset.
  await db.execute(sql`
    DELETE FROM knowledge_chunks
    WHERE dataset_id = ${datasetId} AND source_path = ${sourcePath}
  `);

  if (embedded.length === 0) return;

  // Bulk insert. We hand-build the VALUES tuples to write the embedding
  // as a pgvector literal in the same statement.
  for (const c of embedded) {
    const vectorLit = `[${c.embedding.join(',')}]`;
    await db.execute(sql`
      INSERT INTO knowledge_chunks
        (user_id, dataset_id, source_path, chunk_index, total_chunks,
         frontmatter_json, heading_path, content, content_hash, token_count,
         embedding, embedding_model)
      VALUES (
        ${userId}, ${datasetId}, ${c.sourcePath}, ${c.chunkIndex}, ${c.totalChunks},
        ${c.frontmatter ? JSON.stringify(c.frontmatter) : null}, ${c.headingPath},
        ${c.content}, ${c.contentHash}, ${c.tokenCount},
        ${vectorLit}::vector, ${EMBEDDING_MODEL}
      )
    `);
  }
}

// ── Top-level: ingest a whole vault into a dataset ───────────────────────

export interface IngestResult {
  filesScanned: number;
  filesEmbedded: number;
  chunksWritten: number;
  errors: Array<{ path: string; error: string }>;
  /** ms */
  durationMs: number;
}

export interface IngestOptions {
  /** Progress callback fires after each file. */
  onFile?: (info: { path: string; chunks: number; index: number; total: number }) => void;
  /** Skip files whose existing chunks' content_hash already matches. */
  incremental?: boolean;
  /** Hard cap for safety during initial dev runs. */
  maxFiles?: number;
}

export async function ingestVaultDataset(
  datasetId: number,
  userId: string,
  meta: VaultSourceMeta,
  opts: IngestOptions = {}
): Promise<IngestResult> {
  const t0 = Date.now();
  const result: IngestResult = {
    filesScanned: 0, filesEmbedded: 0, chunksWritten: 0, errors: [], durationMs: 0,
  };

  const allFiles: Array<{ absPath: string; relPath: string }> = [];
  for (const f of walkVault(meta)) {
    allFiles.push(f);
    if (opts.maxFiles && allFiles.length >= opts.maxFiles) break;
  }
  const total = allFiles.length;
  result.filesScanned = total;

  for (let i = 0; i < allFiles.length; i++) {
    const { absPath, relPath } = allFiles[i];
    try {
      const doc = await readSourceDoc(absPath, relPath);
      const chunks = chunkText(doc);
      if (chunks.length === 0) {
        opts.onFile?.({ path: relPath, chunks: 0, index: i + 1, total });
        continue;
      }

      // Incremental mode: skip if every chunk hash already in DB.
      if (opts.incremental) {
        const hashes = chunks.map((c) => c.contentHash);
        const existing = await db.execute(sql`
          SELECT content_hash FROM knowledge_chunks
          WHERE dataset_id = ${datasetId} AND source_path = ${relPath}
        `);
        const existingHashes = new Set((existing as unknown as { rows: Array<{ content_hash: string }> }).rows.map((r) => r.content_hash));
        if (hashes.length === existingHashes.size && hashes.every((h) => existingHashes.has(h))) {
          opts.onFile?.({ path: relPath, chunks: 0, index: i + 1, total });
          continue;
        }
      }

      const embedded = await embedChunks(chunks);
      await upsertKnowledgeChunks(datasetId, userId, relPath, embedded);
      result.filesEmbedded += 1;
      result.chunksWritten += embedded.length;
      opts.onFile?.({ path: relPath, chunks: embedded.length, index: i + 1, total });
    } catch (err) {
      result.errors.push({ path: relPath, error: err instanceof Error ? err.message : String(err) });
      opts.onFile?.({ path: relPath, chunks: 0, index: i + 1, total });
    }
  }

  result.durationMs = Date.now() - t0;
  return result;
}
