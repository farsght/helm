import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import vm from 'vm';
import { db } from '@/db';
import { notebooks, notebookCells } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function verifyOwnership(notebookId: number, userId: string) {
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)));
  return nb ?? null;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; cellId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, cellId } = await params;
  const notebookId = parseInt(id);
  const cellIdInt = parseInt(cellId);
  if (!await verifyOwnership(notebookId, userId)) return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });

  const [cell] = await db.select().from(notebookCells).where(and(eq(notebookCells.id, cellIdInt), eq(notebookCells.notebookId, notebookId)));
  if (!cell) return NextResponse.json({ error: 'Cell not found' }, { status: 404 });

  if (cell.language === 'python') {
    const output = { output: [], result: null, note: 'Python execution coming soon — use JS for now' };
    await db.update(notebookCells).set({ outputJson: JSON.stringify(output), lastRunAt: new Date() }).where(eq(notebookCells.id, cellIdInt));
    return NextResponse.json(output);
  }

  // JavaScript execution via vm
  const outputLines: string[] = [];
  try {
    const sandbox = {
      console: {
        log: (...args: unknown[]) => outputLines.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        error: (...args: unknown[]) => outputLines.push('[error] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        warn: (...args: unknown[]) => outputLines.push('[warn] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      },
      result: undefined as unknown,
    };
    vm.createContext(sandbox);
    vm.runInContext(cell.code, sandbox, { timeout: 5000 });
    const output = { output: outputLines, result: sandbox.result ?? null };
    await db.update(notebookCells).set({ outputJson: JSON.stringify(output), lastRunAt: new Date() }).where(eq(notebookCells.id, cellIdInt));
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const output = { output: outputLines, result: null, error: msg };
    await db.update(notebookCells).set({ outputJson: JSON.stringify(output), lastRunAt: new Date() }).where(eq(notebookCells.id, cellIdInt));
    return NextResponse.json(output, { status: 200 }); // 200 — execution errors are not HTTP errors
  }
}
