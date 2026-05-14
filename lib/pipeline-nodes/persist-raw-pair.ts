/**
 * `persist_raw_pair` — pipeline node executor.
 *
 * Writes the Fireflies `transcript` and `summary` markdown blobs from each
 * input row to `${vaultRoot}/${subdir}/{slug}-transcript.md` and
 * `{slug}-summary.md`. Idempotent: overwrites if file exists.
 *
 * v1 scope (docs/meetings-pipeline.md §4.2):
 *   - Pass-through executor: input rows flow downstream unchanged
 *   - Adds `raw_transcript_path` and `raw_summary_path` fields for downstream
 *     promote_meetings to record on the meetings row
 *   - Gated by config.enabled — flip false to run pipelines without the vault
 *     dependency (Helm-native deployments / CI)
 *
 * Frontmatter is intentionally MINIMAL here — netrunner's enrichment pass
 * adds taxonomy frontmatter to a separate enriched file later. This node
 * writes the raw, immutable Raw/ files only.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const persistRawPairConfigSchema = z.object({
  /** Absolute path to the vault. Defaults to env VAULT_ROOT. */
  vaultRoot: z.string().optional(),
  /** Vault subdir relative to vaultRoot. */
  subdir: z.string().default('Knowledge Base/Sources/Fireflies/Raw'),
  /** When false, the node is a no-op pass-through (useful for non-vault deployments). */
  enabled: z.boolean().default(true),
});

export type PersistRawPairConfig = z.infer<typeof persistRawPairConfigSchema>;

function frontmatter(row: Row): string {
  const date = String(row.date ?? '');
  const slug = String(row.slug ?? '');
  const title = String(row.title ?? '').replace(/"/g, '\\"');
  const firefliesId = String(row.fireflies_id ?? '');
  return [
    '---',
    `fireflies-id: "${firefliesId}"`,
    `slug: "${slug}"`,
    `title: "${title}"`,
    `meeting-date: "${date}"`,
    'source: fireflies',
    '---',
    '',
  ].join('\n');
}

export const persistRawPair: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = persistRawPairConfigSchema.parse(rawConfig);

  if (!cfg.enabled) {
    ctx.log.push({ nodeId: node.id, message: 'persist_raw_pair: enabled=false, passing rows through', level: 'info' });
    return inputRows;
  }

  const vaultRoot = cfg.vaultRoot ?? process.env.VAULT_ROOT;
  if (!vaultRoot) {
    throw new Error('persist_raw_pair: vaultRoot config / VAULT_ROOT env not set, and enabled=true');
  }

  const dir = resolve(vaultRoot, cfg.subdir);
  await mkdir(dir, { recursive: true });

  const out: Row[] = [];
  for (const row of inputRows) {
    const slug = String(row.slug ?? '');
    if (!slug) {
      ctx.rowsErrored += 1;
      ctx.log.push({ nodeId: node.id, message: 'persist_raw_pair: row missing slug, skipping', level: 'warn' });
      continue;
    }
    const transcriptPath = join(dir, `${slug}-transcript.md`);
    const summaryPath = join(dir, `${slug}-summary.md`);
    const fm = frontmatter(row);
    try {
      await writeFile(transcriptPath, fm + (row.transcript ?? '') + '\n', 'utf-8');
      await writeFile(summaryPath, fm + (row.summary ?? '') + '\n', 'utf-8');
    } catch (err) {
      ctx.rowsErrored += 1;
      const msg = err instanceof Error ? err.message : 'unknown error';
      ctx.log.push({ nodeId: node.id, message: `persist_raw_pair: write failed for ${slug}: ${msg}`, level: 'error' });
      continue;
    }
    out.push({ ...row, raw_transcript_path: transcriptPath, raw_summary_path: summaryPath });
  }

  ctx.log.push({ nodeId: node.id, message: `persist_raw_pair: wrote ${out.length} pairs to ${dir}`, level: 'info' });
  return out;
};
