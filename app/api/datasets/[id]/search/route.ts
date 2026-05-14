import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { datasets } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { retrieveContext } from '@/lib/knowledge-retrieval';

/** Vector-search over a single dataset's knowledge chunks. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const datasetId = Number(id);

  const [ds] = await db.select().from(datasets)
    .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId))).limit(1);
  if (!ds) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const query: string = typeof body.query === 'string' ? body.query : '';
  if (!query.trim()) return NextResponse.json({ error: 'query required' }, { status: 422 });
  const topK: number | undefined = typeof body.topK === 'number' ? body.topK : undefined;
  const pathPrefix: string | undefined = typeof body.pathPrefix === 'string' ? body.pathPrefix : undefined;

  const chunks = await retrieveContext(query, [{
    datasetId,
    pathPrefix: pathPrefix ?? null,
    topK: topK ?? 10,
  }]);

  return NextResponse.json({
    chunks: chunks.map((c) => ({ ...c, content: c.content.slice(0, 800) })),
  });
}
