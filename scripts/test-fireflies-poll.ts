/**
 * Smoke-test for fireflies_poll node.
 * Pulls the last 5 meetings via Fireflies API and prints a summary.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/test-fireflies-poll.ts
 */

import { firefliesPoll } from '../lib/pipeline-nodes/fireflies-poll';

const mockNode = {
  id: 0,
  pipelineId: 0,
  type: 'fireflies_poll',
  label: 'test',
  configJson: null,
  positionX: 0,
  positionY: 0,
  createdAt: new Date(),
  triggerConfig: null,
};

const ctx = {
  pipelineId: 0,
  runId: 0,
  userId: 'test',
  log: [] as { nodeId: number; message: string; level: 'info' | 'warn' | 'error' }[],
  rowsErrored: 0,
};

async function main() {
  // Only pull meetings from the last 30 days to keep the test fast
  const sinceCursor = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  console.log(`Polling Fireflies since: ${sinceCursor}`);

  const rows = await firefliesPoll(
    { pageSize: 5, maxPages: 1, sinceCursor },
    [],
    mockNode,
    ctx,
  );

  console.log(`\n✅ Got ${rows.length} meeting(s):\n`);
  for (const r of rows) {
    console.log(`  [${r.slug}]`);
    console.log(`    title: ${r.title}`);
    console.log(`    date:  ${r.date}`);
    console.log(`    host:  ${r.host_email}`);
    console.log(`    duration: ${r.duration_min} min`);
    console.log(`    attendees: ${(r.attendees as { email: string }[]).length}`);
    console.log(`    transcript: ${String(r.transcript).slice(0, 80)}...`);
    console.log();
  }

  if (ctx.log.length) {
    console.log('Logs:');
    for (const l of ctx.log) console.log(` [${l.level}] ${l.message}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
