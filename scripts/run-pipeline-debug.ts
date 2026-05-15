/**
 * Run pipeline 7 with a capped batch (3 meetings) to verify end-to-end.
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/run-pipeline-debug.ts
 */
import { runPipeline } from '../lib/pipeline-engine';
import { db } from '../db';
import { pipelineNodes, pipelineRuns } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const PIPELINE_ID = 7;
const USER_ID = 'user_3Dg1mIx6mn8BDItHYZmjbllYdHR';

async function main() {
  // Temporarily cap the fireflies_poll node to 1 page of 3 meetings
  const [pollNode] = await db.select().from(pipelineNodes)
    .where(and(eq(pipelineNodes.pipelineId, PIPELINE_ID), eq(pipelineNodes.type, 'fireflies_poll')));

  const origConfig = pollNode.configJson;
  const testConfig = JSON.stringify({ ...JSON.parse(origConfig ?? '{}'), pageSize: 3, maxPages: 1 });
  await db.update(pipelineNodes).set({ configJson: testConfig }).where(eq(pipelineNodes.id, pollNode.id));
  console.log('Capped fireflies_poll to 3 meetings for test run');

  const [run] = await db.insert(pipelineRuns).values({
    pipelineId: PIPELINE_ID, status: 'running', rowsInput: 0, rowsOutput: 0, rowsErrored: 0,
  }).returning();
  console.log('Run ID:', run.id, '— starting pipeline...\n');

  try {
    const result = await runPipeline(PIPELINE_ID, run.id, USER_ID);
    console.log('\n✅ Pipeline completed!');
    console.log('  rowsInput:', result.rowsInput, '| rowsOutput:', result.rowsOutput, '| rowsErrored:', result.rowsErrored);
    console.log('\nLogs:');
    const logs = JSON.parse(result.logJson ?? '[]') as Array<{ nodeId: number; level: string; message: string }>;
    for (const l of logs) console.log(`  [node ${l.nodeId}] [${l.level}] ${l.message}`);
    await db.update(pipelineRuns).set({ status: 'completed', rowsInput: result.rowsInput, rowsOutput: result.rowsOutput, rowsErrored: result.rowsErrored }).where(eq(pipelineRuns.id, run.id));
  } catch (err) {
    console.error('\n❌ Pipeline failed:', err);
    await db.update(pipelineRuns).set({ status: 'failed', errorMessage: String(err) }).where(eq(pipelineRuns.id, run.id));
  } finally {
    // Restore original config
    await db.update(pipelineNodes).set({ configJson: origConfig }).where(eq(pipelineNodes.id, pollNode.id));
    console.log('\nRestored original fireflies_poll config');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
