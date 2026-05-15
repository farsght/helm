/**
 * Seed script: create the canonical 9-node Fireflies Meetings Ingestion pipeline
 * for a given Clerk user.
 *
 * Run:
 *   dotenv -e .env.local -- pnpm tsx scripts/seed-fireflies-pipeline.ts --user-id <clerkId>
 *
 * Idempotent: if a pipeline with name 'Fireflies Meetings Ingestion' already exists
 * for the user, the script logs and exits 0 without modifying anything.
 *
 * After seeding, set real connectionId values on:
 *   - fireflies_poll.configJson.connectionId  (kind=fireflies)
 *   - classify_meeting.configJson.connectionId (kind=openai)
 *   - extract_entities.configJson.connectionId (kind=openai)
 *   - embed.configJson.connectionId            (kind=openai)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/db';
import { pipelines, pipelineNodes, pipelineEdges } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// ── Arg parsing ────────────────────────────────────────────────────────

function parseArgs(): { userId: string } {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--user-id');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Usage: pnpm tsx scripts/seed-fireflies-pipeline.ts --user-id <clerkId>');
    process.exit(1);
  }
  return { userId: args[idx + 1] };
}

// ── Node definitions ───────────────────────────────────────────────────

/**
 * 9-node graph (left-to-right reading order).
 * Positions: vertical spine + horizontal fan-out at extract_entities.
 *
 *   fireflies_poll  (x=0,   y=0)
 *   persist_raw_pair (x=0,  y=200)
 *   classify_meeting (x=0,  y=400)
 *   extract_entities (x=0,  y=600)
 *     ├── promote_meetings  (x=-300, y=800)
 *     ├── promote_entities  (x=0,    y=800)
 *     └── chunk_text        (x=300,  y=800)
 *           embed            (x=300,  y=1000)
 *           promote_chunks   (x=300,  y=1200)
 */

type NodeDef = {
  key: string;          // internal key — used to wire edges
  type: string;         // pipeline_nodes.type
  label: string;        // pipeline_nodes.label
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
};

const NODE_DEFS: NodeDef[] = [
  {
    key: 'fireflies_poll',
    type: 'fireflies_poll',
    label: 'Fireflies Poll',
    config: {
      // connectionId: <set to your Fireflies connection id before running>
      connectionId: 0,
      sinceCursor: '',
      pageSize: 25,
      maxPages: 40,
      hostFilter: [],
      dryRun: false,
    },
    positionX: 0,
    positionY: 0,
  },
  {
    key: 'persist_raw_pair',
    type: 'persist_raw_pair',
    label: 'Persist Raw (vault)',
    config: {
      enabled: true,
      subdir: 'Knowledge Base/Sources/Fireflies/Raw',
    },
    positionX: 0,
    positionY: 200,
  },
  {
    key: 'classify_meeting',
    type: 'classify_meeting',
    label: 'Classify Meeting',
    config: {
      // connectionId: <set to your OpenAI connection id before running>
      connectionId: 0,
      model: 'gpt-4o-mini',
      promptVersionTag: 'netrunner-v1',
      retryCount: 3,
      maxInputChars: 12000,
      internalDomains: 'bitwage.co,paystand.com',
      dryRun: false,
    },
    positionX: 0,
    positionY: 400,
  },
  {
    key: 'extract_entities',
    type: 'extract_entities',
    label: 'Extract Entities',
    config: {
      // connectionId: <set to your OpenAI connection id before running>
      connectionId: 0,
      model: 'gpt-4o-mini',
      promptVersionTag: 'netrunner-v1',
      retryCount: 3,
      maxInputChars: 12000,
      dryRun: false,
    },
    positionX: 0,
    positionY: 600,
  },
  {
    key: 'promote_meetings',
    type: 'promote_meetings',
    label: '→ Meetings (Neon)',
    config: {
      workflowOnInsert: 'unprocessed',
      markClassified: true,
    },
    positionX: -300,
    positionY: 800,
  },
  {
    key: 'promote_entities',
    type: 'promote_entities',
    label: '→ Entities (Neon)',
    config: {
      includeFeatures: false,
    },
    positionX: 0,
    positionY: 800,
  },
  {
    key: 'chunk_text',
    type: 'chunk_text',
    label: 'Chunk Text',
    config: {
      targetTokens: 800,
      overlapTokens: 100,
      field: 'transcript',
      sourceType: 'transcript',
      sectionAware: true,
    },
    positionX: 300,
    positionY: 800,
  },
  {
    key: 'embed',
    type: 'embed',
    label: 'Embed Chunks',
    config: {
      // connectionId: <set to your OpenAI connection id before running>
      connectionId: 0,
      model: 'text-embedding-3-small',
      batchSize: 100,
      contentField: 'content',
      dryRun: false,
    },
    positionX: 300,
    positionY: 1000,
  },
  {
    key: 'promote_chunks',
    type: 'promote_chunks',
    label: '→ Chunks (Neon, pgvector)',
    config: {
      embeddingModel: 'text-embedding-3-small',
      skipMissingEmbeddings: true,
    },
    positionX: 300,
    positionY: 1200,
  },
];

// ── Edge definitions ───────────────────────────────────────────────────

/** 8 edges wiring the graph above. */
const EDGE_DEFS: Array<{ source: string; target: string }> = [
  { source: 'fireflies_poll',   target: 'persist_raw_pair' },
  { source: 'persist_raw_pair', target: 'classify_meeting' },
  { source: 'classify_meeting', target: 'extract_entities' },
  { source: 'extract_entities', target: 'promote_meetings' },
  { source: 'extract_entities', target: 'promote_entities' },
  { source: 'extract_entities', target: 'chunk_text' },
  { source: 'chunk_text',       target: 'embed' },
  { source: 'embed',            target: 'promote_chunks' },
];

// ── Main ───────────────────────────────────────────────────────────────

const PIPELINE_NAME = 'Fireflies Meetings Ingestion';

async function main() {
  const { userId } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Load .env.local first.');
    process.exit(1);
  }

  // Idempotency check — use (userId, name) since pipelines table has no slug column.
  const existing = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.userId, userId), eq(pipelines.name, PIPELINE_NAME)))
    .limit(1);

  if (existing.length > 0) {
    const p = existing[0];
    console.log(`Pipeline already exists (id=${p.id}). No changes made.`);
    console.log(`  View at: /pipelines/${p.id}`);
    process.exit(0);
  }

  // Create pipeline row.
  const [pipeline] = await db
    .insert(pipelines)
    .values({
      userId,
      name: PIPELINE_NAME,
      description: 'Polls Fireflies.ai, classifies meetings, extracts entities, chunks+embeds transcripts, and promotes to Neon.',
      status: 'draft',
    })
    .returning();

  console.log(`Created pipeline id=${pipeline.id}`);

  // Insert nodes, capture id map keyed by our internal key.
  const nodeIdByKey: Record<string, number> = {};
  for (const def of NODE_DEFS) {
    const [node] = await db
      .insert(pipelineNodes)
      .values({
        pipelineId: pipeline.id,
        type: def.type,
        label: def.label,
        configJson: JSON.stringify(def.config),
        triggerConfig: { kind: 'manual' },
        positionX: def.positionX,
        positionY: def.positionY,
      })
      .returning();
    nodeIdByKey[def.key] = node.id;
    console.log(`  node [${node.id}] ${def.type}`);
  }

  // Insert edges.
  for (const edge of EDGE_DEFS) {
    await db.insert(pipelineEdges).values({
      pipelineId: pipeline.id,
      sourceNodeId: nodeIdByKey[edge.source],
      targetNodeId: nodeIdByKey[edge.target],
    });
  }

  console.log(`\nSeeded ${NODE_DEFS.length} nodes, ${EDGE_DEFS.length} edges.`);
  console.log(`\nPipeline created:`);
  console.log(`  id:  ${pipeline.id}`);
  console.log(`  URL: /pipelines/${pipeline.id}`);
  console.log(`\nIMPORTANT: Update connectionId on the following nodes before running:`);
  console.log(`  fireflies_poll   → Fireflies connection (kind=fireflies)`);
  console.log(`  classify_meeting → OpenAI connection    (kind=openai)`);
  console.log(`  extract_entities → OpenAI connection    (kind=openai)`);
  console.log(`  embed            → OpenAI connection    (kind=openai)`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
