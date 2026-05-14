/**
 * Ingest an Obsidian vault dataset into knowledge_chunks (incremental).
 *
 * Run: `dotenv -e .env.local -- npx tsx scripts/ingest-vault.ts <datasetId>`
 *
 * Requires DATABASE_URL + OPENAI_API_KEY (loaded from .env.local below).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/db';
import { datasets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ingestVaultDataset, type VaultSourceMeta } from '@/lib/knowledge-ingest';
import { homedir } from 'node:os';

function expandPath(p: string): string {
  if (p.startsWith('~/')) return p.replace('~', homedir());
  if (p === '~') return homedir();
  return p;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: tsx scripts/ingest-vault.ts <datasetId>');
    process.exit(1);
  }
  const datasetId = Number(arg);
  if (!Number.isFinite(datasetId)) {
    console.error(`Invalid datasetId: ${arg}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set (check .env.local).');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set (check .env.local).');
    process.exit(1);
  }

  const [ds] = await db.select().from(datasets).where(eq(datasets.id, datasetId)).limit(1);
  if (!ds) {
    console.error(`Dataset ${datasetId} not found.`);
    process.exit(1);
  }
  const meta = ds.sourceMetaJson as VaultSourceMeta | null;
  if (!meta || !meta.vaultPath) {
    console.error(`Dataset ${datasetId} has no vaultPath in sourceMetaJson.`);
    process.exit(1);
  }

  console.log(`Ingesting dataset ${datasetId} (${ds.name}) from ${meta.vaultPath} ...`);
  const resolvedMeta: VaultSourceMeta = { ...meta, vaultPath: expandPath(meta.vaultPath) };
  try {
    const result = await ingestVaultDataset(datasetId, ds.userId, resolvedMeta, {
      incremental: true,
      onFile: (i) => console.log(`  [${i.index}/${i.total}] ${i.path} — ${i.chunks} chunks`),
    });
    console.log('\nDone:');
    console.log(`  files scanned : ${result.filesScanned}`);
    console.log(`  files embedded: ${result.filesEmbedded}`);
    console.log(`  chunks written: ${result.chunksWritten}`);
    console.log(`  duration      : ${result.durationMs}ms`);
    if (result.errors.length > 0) {
      console.log(`  errors        : ${result.errors.length}`);
      for (const e of result.errors) console.log(`    - ${e.path}: ${e.error}`);
    }
  } catch (err) {
    console.error('Ingest failed:', err);
    process.exit(1);
  }
}

main();
