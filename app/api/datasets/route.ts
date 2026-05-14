import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Papa from 'papaparse';

import { db } from '@/db';
import { datasets, datasetRows } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { inferSchema, normalizeRow, type DatasetColumn } from '@/lib/dataset-import';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(datasets)
      .where(eq(datasets.userId, userId))
      .orderBy(sql`${datasets.createdAt} DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Fetch datasets error:', err);
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 });
  }
}

/**
 * POST /api/datasets
 *
 * Two modes:
 *   1) JSON body: { name, description?, source: 'manual', columnSchema?: DatasetColumn[] }
 *      → creates an empty dataset.
 *   2) multipart/form-data with `file` (CSV) + optional `name`, `description`
 *      → parses CSV, infers schema, bulk-inserts rows.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
      }
      const name = (form.get('name') as string) || file.name.replace(/\.csv$/i, '');
      const description = (form.get('description') as string) || null;
      const text = await file.text();

      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        return NextResponse.json(
          { error: `CSV parse failed: ${parsed.errors[0]?.message}` },
          { status: 400 },
        );
      }

      const headers = (parsed.meta.fields ?? []).map((h) => h ?? '');
      if (headers.length === 0) {
        return NextResponse.json(
          { error: 'CSV has no header row' },
          { status: 400 },
        );
      }
      const schema: DatasetColumn[] = inferSchema(headers, parsed.data);

      // Create the dataset row first
      const [dataset] = await db
        .insert(datasets)
        .values({
          userId,
          name,
          description,
          source: 'csv',
          sourceMetaJson: { filename: file.name, size: file.size },
          columnSchemaJson: schema,
          rowCount: parsed.data.length,
          status: 'ready',
          refreshedAt: new Date(),
        })
        .returning();

      // Bulk insert rows (chunked to avoid hitting payload limits)
      const normalizedRows = parsed.data.map((r) => ({
        datasetId: dataset.id,
        rowJson: normalizeRow(r, schema),
      }));
      const CHUNK = 500;
      for (let i = 0; i < normalizedRows.length; i += CHUNK) {
        await db.insert(datasetRows).values(normalizedRows.slice(i, i + CHUNK));
      }

      return NextResponse.json(dataset, { status: 201 });
    }

    // JSON mode (manual dataset)
    const body = await request.json();
    const [dataset] = await db
      .insert(datasets)
      .values({
        userId,
        name: body.name,
        description: body.description ?? null,
        source: body.source || 'manual',
        sourceMetaJson: body.sourceMeta ?? null,
        columnSchemaJson: body.columnSchema ?? null,
        rowCount: 0,
        status: 'ready',
      })
      .returning();
    return NextResponse.json(dataset, { status: 201 });
  } catch (err) {
    console.error('Create dataset error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
