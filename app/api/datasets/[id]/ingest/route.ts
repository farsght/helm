/**
 * POST /api/datasets/[id]/ingest
 *
 * Triggers a vault ingestion run for a dataset with source='obsidian_vault'.
 * Body: { incremental?: boolean, maxFiles?: number }
 * Returns: { filesScanned, filesEmbedded, chunksWritten, errors, durationMs }
 *
 * Runs synchronously for now — fine for local-runner mode (sync from your Mac).
 * When we deploy this to scheduled-cron later, swap to background.
 */

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { datasets } from '@/db/schema';
import { ingestVaultDataset, type VaultSourceMeta } from '@/lib/knowledge-ingest';
import { homedir } from 'node:os';

export const maxDuration = 600;

function expandPath(p: string): string {
  if (p.startsWith('~/')) return p.replace('~', homedir());
  if (p === '~') return homedir();
  return p;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const datasetId = parseInt(id, 10);
  if (isNaN(datasetId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { incremental?: boolean; maxFiles?: number };

  const ds = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)))
    .limit(1);

  if (ds.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const d = ds[0];

  if (d.source !== 'obsidian_vault') {
    return NextResponse.json({ error: 'ingest_not_supported_for_source', source: d.source }, { status: 400 });
  }

  const meta = (d.sourceMetaJson as VaultSourceMeta | null) ?? null;
  if (!meta?.vaultPath) {
    return NextResponse.json({ error: 'missing_vault_path' }, { status: 400 });
  }

  const resolved = expandPath(meta.vaultPath);
  try {
    await db.update(datasets).set({ status: 'importing', errorMessage: null }).where(eq(datasets.id, datasetId));

    const result = await ingestVaultDataset(
      datasetId,
      userId,
      { ...meta, vaultPath: resolved },
      { incremental: body.incremental ?? true, maxFiles: body.maxFiles }
    );

    await db.update(datasets).set({
      status: result.errors.length > 0 && result.filesEmbedded === 0 ? 'error' : 'ready',
      rowCount: result.filesEmbedded || d.rowCount,
      refreshedAt: new Date(),
      errorMessage: result.errors.length > 0 ? `${result.errors.length} files failed` : null,
    }).where(eq(datasets.id, datasetId));

    return NextResponse.json(result);
  } catch (err) {
    await db.update(datasets).set({
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
    }).where(eq(datasets.id, datasetId));
    return NextResponse.json(
      { error: 'ingest_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
