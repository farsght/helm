# Meetings Pipeline — Fireflies absorption spec

Status: **spec / pre-build**
Last updated: 2026-05-14
Owners: Scott + Helm agent
Tracking commit: TBD on first build commit

The plan for porting the netrunner Mac mini meetings pipeline (`~/Projects/bitwage-netrunner/packages/meetings-pipeline`) into Helm as native visual ETL pipeline nodes.

---

## 1. Goal

Replace the netrunner CLI pipeline with a runnable visual pipeline in Helm's `/pipelines` canvas that:

1. Polls Fireflies for new meetings
2. Persists raw transcript + summary pairs to the vault (or directly to Neon — see §6)
3. Enriches each meeting with the 14-axis taxonomy via 3 LLM passes
4. Extracts entities (people, companies)
5. Chunks transcripts section-aware
6. Embeds chunks with `text-embedding-3-small`
7. Promotes meetings + chunks + entities into Helm's Neon

The pipeline must run **parallel** to netrunner until output parity is verified, then netrunner is decommissioned.

---

## 2. Non-goals (out of scope for this build)

- Replacing the Obsidian human-review step entirely. **Initial version preserves vault writes** so reviewers can keep using Obsidian. A future iteration replaces review with a Helm UI (`/meetings/[id]/review`).
- Reimplementing netrunner's saga/atomic-claim concurrency model. Helm pipeline runs are single-process per run for now; concurrency is a follow-up.
- Generalizing the pipeline to non-Fireflies sources (Gong, Slack). The nodes are scoped to Fireflies; the patterns will generalize naturally later.
- Replacing the netrunner Redis `events.intelligence` event stream. Helm has its own event surface (TBD) and will not write to Redis.

---

## 3. Prerequisite — the pipeline runtime gap

**Critical finding from spec-time codebase audit:**

`/api/pipelines/[id]/run/route.ts` (currently 66 LOC) does not execute nodes. It counts `source_dataset` input rows, logs `Processed node: {label}` per node, and marks the run completed. None of the 15 existing node types have real executors.

**Decision:** before any Fireflies node ships, build the **per-node executor dispatch** in `lib/pipeline-engine.ts`. Scope:

- Topological-sort `pipeline_nodes` by `pipeline_edges`
- Per node: parse `configJson`, call `executeNode(type, config, inputRows, ctx)`, propagate outputs to downstream nodes via the edge graph
- Accumulate logs into `pipelineRuns.logJson`
- Update `rowsInput`/`rowsOutput`/`rowsErrored` from real execution
- Failure semantics: a node throwing fails the run, error message captured. Per-row errors increment `rowsErrored` and continue.

A no-op executor for the existing 15 types is acceptable (returns input unchanged); the new Fireflies nodes will be the first ones with real logic. This unblocks **all** future pipelines.

`/api/pipelines/[id]/run` becomes a thin wrapper that creates the run row and delegates to `runPipeline(pipelineId, runId)`.

This is genuinely a prerequisite for any of §4 to be useful. Plan accordingly.

---

## 4. New node types — exact contracts

Each node ships as: (a) executor in `lib/pipeline-engine/nodes/{name}.ts`, (b) inspector card in `app/pipelines/[id]/pipeline-node.tsx` switch, (c) palette entry, (d) Zod config schema in `lib/pipeline-engine/configs.ts`.

### 4.1 `fireflies_poll`

Sources new meetings since a watermark cursor.

**Config**
```ts
{
  apiKeyEnv: string;          // default "FIREFLIES_API_KEY"
  sinceCursor?: string;       // ISO timestamp; defaults to "last successful run"
  pageSize?: number;          // default 25, max 100
  hostFilter?: string[];      // optional — match host email substrings
}
```

**Output rows** (one per meeting):
```ts
{
  fireflies_id: string;
  slug: string;               // derived: <date>-<sanitized-title>
  title: string;
  date: string;               // ISO
  duration_min: number;
  host_email: string;
  attendees: { email: string; name: string }[];
  transcript: string;         // raw markdown body
  summary: string;            // raw markdown body
  raw_payload: object;        // the full Fireflies response for debugging
}
```

**Behavior**
- Port netrunner's `scripts/export-fireflies.ts` GraphQL query verbatim (it's battle-tested across 626+ meetings)
- Update watermark cursor on run success — stored on the node's `configJson.sinceCursor`
- Skip meetings already present in Helm's `meetings.fireflies_id` (idempotent)

### 4.2 `persist_raw_pair`

Writes `Raw/{slug}-transcript.md` and `Raw/{slug}-summary.md` to the vault. **Optional in v1** — gated by config flag so Helm-native runs can skip vault writes once review UI exists.

**Config**
```ts
{
  vaultRoot: string;          // resolved env var or absolute path
  enabled: boolean;           // default true; set false to skip vault entirely
  subdir: string;             // default "Knowledge Base/Sources/Fireflies/Raw"
}
```

**Output rows**: pass through input unchanged; adds `raw_transcript_path` and `raw_summary_path` fields.

### 4.3 `classify_meeting`

Ports netrunner's `enrich-fireflies.ts` 3-pass classification verbatim. The prompt is battle-tested — do **not** rewrite.

**Config**
```ts
{
  model: string;              // default "gpt-4o-mini"
  promptVersionTag: string;   // default "netrunner-v1"; for prompt_runs auditability
  retryCount: number;         // default 3
}
```

**Output rows**: input + taxonomy fields:
```ts
{
  meeting_class: 'internal' | 'external';
  meeting_category: string;
  meeting_subcategory: string | null;
  taxonomy: {
    domain: string[];
    usecase: string[];
    gtm_stage: string[];
    confidence: 'machine-transcribed' | 'human-verified';
    temporal: 'point-in-time' | 'evolving' | 'historical';
    impact: 'low' | 'medium' | 'high' | 'unknown';
    timing: 'no-timeline' | 'soon' | 'committed' | 'past';
    partner_type: string;
  };
  brand: string[];
  secondary_tags: string[];
  maturity: 'unassessed' | 'exploring' | 'speculative' | 'emerging' | 'validated' | 'deprecated';
  access: 'internal' | 'team' | 'confidential' | 'executive';
}
```

**Behavior**: 3 sequential LLM calls per row; each call's input + output recorded in `prompt_runs` (see §5 schema). On any retryable failure, increment `rowsErrored` and emit the row downstream with a `classification_error` field so the pipeline keeps moving.

### 4.4 `extract_entities`

Ports `scripts/extract-entities.ts`. One LLM call per row.

**Output rows**: input + `entities: { name, type: 'person' | 'company' | 'product' | 'partner', mentions: number }[]`.

### 4.5 `chunk_text`

Section-aware splitter. Ports `scripts/chunker.ts`.

**Config**
```ts
{
  targetTokens: number;       // default 800
  overlapTokens: number;      // default 100
  field: string;              // default "transcript"
  sectionAware: boolean;      // default true — split on markdown headings first
}
```

**Output**: **fan-out** — one row per chunk. Each chunk row carries the parent meeting fields plus:
```ts
{
  parent_slug: string;
  chunk_index: number;
  section_heading: string | null;
  source_type: 'transcript' | 'summary';
  text: string;
}
```

### 4.6 `embed`

Reuses `lib/knowledge-ingest.ts`'s OpenAI batched embedder. Adds an `embedding: number[]` field (1536d) to each row.

**Config**
```ts
{
  model: string;              // default "text-embedding-3-small"
  batchSize: number;          // default 100
}
```

### 4.7 `promote_meetings`

Writes the meeting rows (pre-chunk fan-out) to Helm's `meetings` table. Idempotent on `fireflies_id`. This is a **gather** node — it consumes the upstream meeting rows before chunk fan-out, so the canvas needs a "branch" from `extract_entities` directly to `promote_meetings` in parallel with the `chunk_text → embed → promote_chunks` branch.

### 4.8 `promote_chunks`

Writes chunk rows (post-embed) to Helm's `meeting_chunks` table. Idempotent on `(meeting_id, chunk_index)`.

### 4.9 `promote_entities`

Writes entity rows to `entities` + `entity_mentions`. Idempotent on `(name, type)` for the entity row; new mention rows per meeting.

---

## 5. Schema additions

Drizzle migration `0013_meetings_pipeline.sql`. Mirrors netrunner's schema with minimal divergence so the porting is mechanical.

```ts
// db/schema.ts additions

export const meetings = pgTable('meetings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  firefliesId: text('fireflies_id').notNull().unique(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  meetingDate: timestamp('meeting_date').notNull(),
  durationMin: integer('duration_min'),
  hostEmail: text('host_email'),
  attendeesJson: text('attendees_json'),             // JSON array of {email,name}
  rawTranscriptPath: text('raw_transcript_path'),
  rawSummaryPath: text('raw_summary_path'),

  // Taxonomy (dedicated columns — B-tree)
  meetingClass: text('meeting_class'),               // 'internal' | 'external'
  meetingCategory: text('meeting_category'),
  meetingSubcategory: text('meeting_subcategory'),
  workflow: text('workflow').notNull().default('unprocessed'),
  access: text('access'),
  maturity: text('maturity'),

  // Taxonomy (arrays — GIN-indexed in migration SQL)
  brand: text('brand').array(),
  secondaryTags: text('secondary_tags').array(),

  // Taxonomy (JSONB — GIN-indexed; query with @> only)
  taxonomyJson: text('taxonomy_json'),               // matches netrunner's taxonomy column

  // Enrichment booleans
  enrichmentClassified: boolean('enrichment_classified').notNull().default(false),
  enrichmentEntitiesExtracted: boolean('enrichment_entities_extracted').notNull().default(false),
  enrichmentVaultWritten: boolean('enrichment_vault_written').notNull().default(false),
  enrichmentHumanReviewed: boolean('enrichment_human_reviewed').notNull().default(false),
  enrichmentVectorPrepped: boolean('enrichment_vector_prepped').notNull().default(false),

  vaultPath: text('vault_path'),
  legacyMeeting: boolean('legacy_meeting').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const meetingChunks = pgTable('meeting_chunks', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  sourceType: text('source_type').notNull(),         // 'transcript' | 'summary'
  sectionHeading: text('section_heading'),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),   // pgvector
  meetingClass: text('meeting_class'),
  meetingCategory: text('meeting_category'),
  taxonomyJson: text('taxonomy_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),
  name: text('name').notNull(),
  type: text('type').notNull(),                      // 'person' | 'company' | 'product' | 'partner'
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const entityMentions = pgTable('entity_mentions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  mentionCount: integer('mention_count').notNull().default(1),
});

export const promptRuns = pgTable('prompt_runs', {
  id: serial('id').primaryKey(),
  pipelineRunId: integer('pipeline_run_id').references(() => pipelineRuns.id, { onDelete: 'set null' }),
  nodeId: integer('node_id').references(() => pipelineNodes.id, { onDelete: 'set null' }),
  meetingId: integer('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
  promptVersionTag: text('prompt_version_tag').notNull(),
  model: text('model').notNull(),
  inputJson: text('input_json'),
  outputJson: text('output_json'),
  errorMessage: text('error_message'),
  latencyMs: integer('latency_ms'),
  costUsd: real('cost_usd'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Indexes** (raw SQL in migration):
- `meetings`: B-tree on `meeting_class`, `meeting_category`, `workflow`, `access`, `maturity`; GIN on `brand`, `secondary_tags`, `taxonomy_json`
- `meeting_chunks`: ivfflat cosine on `embedding`; B-tree on `meeting_id`, `meeting_class`, `meeting_category`
- `entities`: unique `(user_id, name, type)`
- `entity_mentions`: unique `(entity_id, meeting_id)`

---

## 6. Open decision: vault writes in v1 — keep or skip?

**Recommendation: keep vault writes ON in v1.**

- Reviewers (Scott) already have the Obsidian workflow muscle-memory built. Disrupting that mid-migration risks losing the review loop.
- Vault writes are cheap and idempotent.
- It gives us a free dual-write parity check against netrunner output.

Move to vault-off in a follow-up once the in-Helm review UI exists.

---

## 7. Canvas wiring — the reference pipeline graph

```
[fireflies_poll]
       │
       ▼
[persist_raw_pair]    ← optional, gated by config
       │
       ▼
[classify_meeting]
       │
       ▼
[extract_entities]
       │
       ├──► [promote_meetings]
       ├──► [promote_entities]
       │
       ▼
[chunk_text]
       │
       ▼
[embed]
       │
       ▼
[promote_chunks]
```

A seed pipeline (`Fireflies Meetings Ingestion`) is created at migration time with this exact graph, all nodes pre-configured with defaults. Scott can clone or edit but the canonical graph is one click away.

---

## 8. Parallel-run parity check

Before decommissioning netrunner:

1. Both pipelines pointed at Fireflies for one week
2. Daily diff job (`scripts/parity-check.ts`): for each meeting present in both Helm and netrunner Neons, compare `meeting_class`, `taxonomy`, entity sets, chunk counts. Mismatch threshold: 95% match on dedicated columns, 90% on JSONB taxonomy fields (LLM nondeterminism budget).
3. Once thresholds hold for 3 consecutive days, decommission netrunner pipeline cron.

---

## 9. Build phases — order of operations

**Phase 1 — Runtime + schema (foundation)** ✅ shipped (`dd054e3`)
1. Drizzle migration `0013_meetings_pipeline.sql` — schema + indexes ✅
2. `lib/pipeline-engine.ts` — `runPipeline(pipelineId, runId)` topological executor ✅
3. Executor registry + no-op stubs for the 15 existing UI node types ✅
4. Rewire `/api/pipelines/[id]/run` to delegate ✅
5. 9 unit tests on topoSort + registry ✅

**Phase 2a — Fireflies poll + persist** ✅ shipped
6. `fireflies_poll` executor + Zod config schema — GraphQL polling, dedupe via Helm's `meetings.fireflies_id`, sequential detail fetch, transcript+summary markdown rendering ✅
7. `persist_raw_pair` executor — writes `Raw/{slug}-{transcript,summary}.md` to vault with frontmatter; `enabled=false` makes it a pass-through ✅
8. 11 unit tests on slug/transcript/summary rendering + config schema ✅

**Phase 2b — Classify** ✅ shipped
9. `classify_meeting` executor — VERBATIM port of netrunner Pass 1 prompt (single LLM call: meeting_category, subcategory, secondary_tags, domain, usecase, gtm_stage, maturity, access). meeting_class derived from attendee email domains, no LLM needed. prompt_runs audit row per call (latency, model, version tag, input/output JSON). 3-retry linear backoff matching netrunner. 10 unit tests on deriveMeetingClass + config schema. ✅

**Phase 3 — Entities + chunking + embedding** ✅ shipped (`f576fa6`)
9. `extract_entities` executor — VERBATIM port of netrunner ENTITY_PROMPT (Pass 2 of enrich-fireflies.ts). Internal-meeting rule: partner_type='none' when meeting_class='internal'. prompt_runs audit + 3-retry backoff. ✅
10. `chunk_text` executor (fan-out semantics — first node that emits >1 row per input) — section-aware (## H2 → char windows), skips Speaker Analytics/Attendance, no-overlap for Action Items. Deterministic chunk IDs. ✅
11. `embed` executor — batched OpenAI text-embedding-3-small (1536d, batch=100), dryRun zero-vectors for testing, per-batch error isolation. ✅
11. `embed` executor — reuse `lib/knowledge-ingest.ts` embedder

**Phase 4 — Promotions + seed pipeline** ✅ shipped
12. `promote_meetings` — upsert into meetings by fireflies_id; idempotent; adds meeting_db_id to downstream rows. ✅
13. `promote_entities` — upsert entities (person/company/product) + entity_mentions; resolves meeting_id by fireflies_id lookup. ✅
14. `promote_chunks` — write to meeting_chunks with pgvector(1536); upsert by (meeting_id, chunk_index); raw SQL for vector cast. Bumps meetings.enrichment_vector_prepped. ✅
12. `promote_meetings`, `promote_entities`, `promote_chunks` executors
13. Seed pipeline created via migration or `scripts/seed-fireflies-pipeline.ts`
14. End-to-end run against 5 test Fireflies meetings

**Phase 5 — Parity & cutover**
15. `scripts/parity-check.ts`
16. One-week parallel run
17. Decommission netrunner cron, archive `~/Projects/bitwage-netrunner/packages/meetings-pipeline`

Phase 1 ships first as its own PR — it unblocks every future pipeline. Phases 2–4 can ship together or split, depending on review appetite.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Classification prompt drift produces different taxonomy than netrunner | Port prompt **verbatim**; pin `promptVersionTag = "netrunner-v1"`; parity check enforces match rate |
| Pipeline run takes too long for synchronous HTTP | Wrap `runPipeline` in Vercel Workflow SDK durable execution (already in the stack); HTTP route enqueues and returns runId |
| Fireflies API rate limits | Default `pageSize` to 25; respect Fireflies `Retry-After`; checkpoint cursor on partial success |
| Embedding costs balloon | Reuse `lib/knowledge-ingest.ts` batched embedder (already cost-optimized); dry-run mode on `embed` node skips actual API call |
| `meeting_chunks` ivfflat index slow to build at scale | Build index after initial backfill; for incremental adds, ivfflat is fine |
| Idempotency bugs leave half-written meetings | Each `promote_*` node uses `ON CONFLICT … DO UPDATE`; pipeline runs are resumable by re-running from `fireflies_poll` (skipped via `fireflies_id` dedupe) |

---

## 11. Reference: source files to port from netrunner

| Netrunner script | Helm destination | LOC |
|---|---|---|
| `scripts/export-fireflies.ts` | `lib/pipeline-engine/nodes/fireflies-poll.ts` | 641 |
| `scripts/enrich-fireflies.ts` (passes 1–3) | `lib/pipeline-engine/nodes/classify-meeting.ts` | 492 |
| `scripts/extract-entities.ts` | `lib/pipeline-engine/nodes/extract-entities.ts` | — |
| `scripts/chunker.ts` | `lib/pipeline-engine/nodes/chunk-text.ts` | — |
| `scripts/embedder.ts` | `lib/pipeline-engine/nodes/embed.ts` | — (mostly reused from `lib/knowledge-ingest.ts`) |
| `scripts/sync-approvals.ts` | Deferred — in-Helm review UI follow-up | — |

Read `~/Projects/bitwage-netrunner/packages/meetings-pipeline/CLAUDE.md` before porting any single script — it documents the workflow state machine, JSONB query rules, frontmatter mapping, and atomic-claim pattern.


---

## 12. Running the seed script

The seed script creates the canonical 9-node Fireflies Meetings Ingestion pipeline for a given Clerk user. It is idempotent — running it twice for the same user is a no-op.

**Prerequisites:**

- `DATABASE_URL` set in `.env.local` (Neon connection string)
- Node packages installed (`pnpm install`)

**Usage:**

```bash
# From the repo root:
dotenv -e .env.local -- pnpm tsx scripts/seed-fireflies-pipeline.ts --user-id <clerkId>
```

**What it creates:**

| # | Node type | Label |
|---|---|---|
| 1 | `fireflies_poll` | Fireflies Poll |
| 2 | `persist_raw_pair` | Persist Raw (vault) |
| 3 | `classify_meeting` | Classify Meeting |
| 4 | `extract_entities` | Extract Entities |
| 5 | `promote_meetings` | → Meetings (Neon) |
| 6 | `promote_entities` | → Entities (Neon) |
| 7 | `chunk_text` | Chunk Text |
| 8 | `embed` | Embed Chunks |
| 9 | `promote_chunks` | → Chunks (Neon, pgvector) |

Edges (8 total):

```
fireflies_poll → persist_raw_pair → classify_meeting → extract_entities
                                                              ├──► promote_meetings
                                                              ├──► promote_entities
                                                              └──► chunk_text → embed → promote_chunks
```

**After seeding**, update `connectionId` on these four nodes via the pipeline canvas UI or directly in the DB:

- `fireflies_poll` → a `connections` row with `kind=fireflies`
- `classify_meeting` → a `connections` row with `kind=openai`
- `extract_entities` → a `connections` row with `kind=openai`
- `embed` → a `connections` row with `kind=openai`

All other config fields are pre-seeded with the defaults documented in §4.
