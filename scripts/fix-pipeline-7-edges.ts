/**
 * fix-pipeline-7-edges.ts
 *
 * Fixes the pipeline topology for pipeline_id=7.
 *
 * Correct topology:
 *   fireflies_poll(88) → classify_meeting(89) → extract_entities(90) → promote_meetings(93)
 *                                                                     → promote_entities(94)
 *                                                                     → chunk_text(91) → embed(92) → promote_chunks(95)
 *
 * Edges to insert:
 *   88 → 89
 *   89 → 90
 *   90 → 93  (extract_entities → promote_meetings)
 *   90 → 94  (extract_entities → promote_entities)
 *   90 → 91  (extract_entities → chunk_text)
 *   91 → 92  (chunk_text → embed)
 *   92 → 95  (embed → promote_chunks)
 */

import { db } from '@/db';
import { pipelineEdges } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PIPELINE_ID = 7;

const CORRECT_EDGES = [
  { sourceNodeId: 88, targetNodeId: 89 },
  { sourceNodeId: 89, targetNodeId: 90 },
  { sourceNodeId: 90, targetNodeId: 93 }, // extract_entities → promote_meetings
  { sourceNodeId: 90, targetNodeId: 94 }, // extract_entities → promote_entities
  { sourceNodeId: 90, targetNodeId: 91 }, // extract_entities → chunk_text
  { sourceNodeId: 91, targetNodeId: 92 }, // chunk_text → embed
  { sourceNodeId: 92, targetNodeId: 95 }, // embed → promote_chunks
] as const;

async function main() {
  console.log(`Fixing edges for pipeline_id=${PIPELINE_ID}...`);

  // Show current edges
  const current = await db
    .select()
    .from(pipelineEdges)
    .where(eq(pipelineEdges.pipelineId, PIPELINE_ID));
  console.log(`Current edges (${current.length}):`, current.map(e => `${e.sourceNodeId}→${e.targetNodeId}`).join(', '));

  // Delete all current edges for pipeline 7
  const deleted = await db
    .delete(pipelineEdges)
    .where(eq(pipelineEdges.pipelineId, PIPELINE_ID))
    .returning({ id: pipelineEdges.id });
  console.log(`Deleted ${deleted.length} edges.`);

  // Insert correct edges
  const inserted = await db
    .insert(pipelineEdges)
    .values(CORRECT_EDGES.map(e => ({ ...e, pipelineId: PIPELINE_ID })))
    .returning({ id: pipelineEdges.id, sourceNodeId: pipelineEdges.sourceNodeId, targetNodeId: pipelineEdges.targetNodeId });

  console.log(`Inserted ${inserted.length} edges:`);
  for (const e of inserted) {
    console.log(`  id=${e.id}: ${e.sourceNodeId} → ${e.targetNodeId}`);
  }

  console.log('Done. Pipeline topology fixed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
