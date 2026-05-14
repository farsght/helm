-- Phase 1 of the Fireflies meetings absorption (see docs/meetings-pipeline.md).
--
-- Adds the schema that the new pipeline node executors will write to:
--   - meetings                   (one row per Fireflies meeting)
--   - meeting_chunks             (post-chunk-and-embed rows; 1536-dim pgvector)
--   - entities + entity_mentions (people / companies / partners extracted from meetings)
--   - prompt_runs                (audit trail for every LLM call made by a pipeline node)
--
-- pgvector is already enabled by 0012_knowledge_rag.sql so we don't re-create the extension.

CREATE TABLE IF NOT EXISTS "meetings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text DEFAULT '' NOT NULL,
  "fireflies_id" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "meeting_date" timestamp NOT NULL,
  "duration_min" integer,
  "host_email" text,
  "attendees_json" jsonb,
  "raw_transcript_path" text,
  "raw_summary_path" text,

  -- Taxonomy (dedicated columns, B-tree-indexed)
  "meeting_class" text,
  "meeting_category" text,
  "meeting_subcategory" text,
  "workflow" text DEFAULT 'unprocessed' NOT NULL,
  "access" text,
  "maturity" text,

  -- Array columns (GIN-indexed)
  "brand" text[],
  "secondary_tags" text[],

  -- JSONB taxonomy (GIN-indexed; query with @> only)
  "taxonomy_json" jsonb,

  -- Enrichment progression flags
  "enrichment_classified" boolean DEFAULT false NOT NULL,
  "enrichment_entities_extracted" boolean DEFAULT false NOT NULL,
  "enrichment_vault_written" boolean DEFAULT false NOT NULL,
  "enrichment_human_reviewed" boolean DEFAULT false NOT NULL,
  "enrichment_vector_prepped" boolean DEFAULT false NOT NULL,

  "vault_path" text,
  "legacy_meeting" boolean DEFAULT false NOT NULL,

  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "meetings_fireflies_id_idx"   ON "meetings" ("fireflies_id");
CREATE INDEX        IF NOT EXISTS "meetings_user_idx"           ON "meetings" ("user_id");
CREATE INDEX        IF NOT EXISTS "meetings_meeting_class_idx"  ON "meetings" ("meeting_class");
CREATE INDEX        IF NOT EXISTS "meetings_category_idx"       ON "meetings" ("meeting_category");
CREATE INDEX        IF NOT EXISTS "meetings_workflow_idx"       ON "meetings" ("workflow");
CREATE INDEX        IF NOT EXISTS "meetings_access_idx"         ON "meetings" ("access");
CREATE INDEX        IF NOT EXISTS "meetings_maturity_idx"       ON "meetings" ("maturity");
CREATE INDEX        IF NOT EXISTS "meetings_meeting_date_idx"   ON "meetings" ("meeting_date");
CREATE INDEX        IF NOT EXISTS "meetings_brand_gin_idx"      ON "meetings" USING gin ("brand");
CREATE INDEX        IF NOT EXISTS "meetings_secondary_tags_gin_idx" ON "meetings" USING gin ("secondary_tags");
CREATE INDEX        IF NOT EXISTS "meetings_taxonomy_gin_idx"   ON "meetings" USING gin ("taxonomy_json");


CREATE TABLE IF NOT EXISTS "meeting_chunks" (
  "id" serial PRIMARY KEY NOT NULL,
  "meeting_id" integer NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
  "chunk_index" integer NOT NULL,
  "source_type" text NOT NULL,
  "section_heading" text,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
  "meeting_class" text,
  "meeting_category" text,
  "taxonomy_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "meeting_chunks_meeting_chunk_idx" ON "meeting_chunks" ("meeting_id", "chunk_index");
CREATE INDEX        IF NOT EXISTS "meeting_chunks_meeting_class_idx" ON "meeting_chunks" ("meeting_class");
CREATE INDEX        IF NOT EXISTS "meeting_chunks_category_idx"      ON "meeting_chunks" ("meeting_category");
CREATE INDEX        IF NOT EXISTS "meeting_chunks_taxonomy_gin_idx"  ON "meeting_chunks" USING gin ("taxonomy_json");

-- ivfflat cosine index on embeddings. lists=100 default; tune to ~sqrt(rows) once we have volume.
CREATE INDEX IF NOT EXISTS "meeting_chunks_embedding_cosine_idx"
  ON "meeting_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);


CREATE TABLE IF NOT EXISTS "entities" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text DEFAULT '' NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "metadata_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "entities_user_name_type_idx" ON "entities" ("user_id", "name", "type");
CREATE INDEX        IF NOT EXISTS "entities_type_idx"           ON "entities" ("type");


CREATE TABLE IF NOT EXISTS "entity_mentions" (
  "id" serial PRIMARY KEY NOT NULL,
  "entity_id" integer NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "meeting_id" integer NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
  "mention_count" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "entity_mentions_entity_meeting_idx" ON "entity_mentions" ("entity_id", "meeting_id");
CREATE INDEX        IF NOT EXISTS "entity_mentions_meeting_idx"        ON "entity_mentions" ("meeting_id");


CREATE TABLE IF NOT EXISTS "prompt_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "pipeline_run_id" integer REFERENCES "pipeline_runs"("id") ON DELETE SET NULL,
  "node_id" integer REFERENCES "pipeline_nodes"("id") ON DELETE SET NULL,
  "meeting_id" integer REFERENCES "meetings"("id") ON DELETE CASCADE,
  "prompt_version_tag" text NOT NULL,
  "model" text NOT NULL,
  "input_json" jsonb,
  "output_json" jsonb,
  "error_message" text,
  "latency_ms" integer,
  "cost_usd" real,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "prompt_runs_pipeline_run_idx" ON "prompt_runs" ("pipeline_run_id");
CREATE INDEX IF NOT EXISTS "prompt_runs_node_idx"          ON "prompt_runs" ("node_id");
CREATE INDEX IF NOT EXISTS "prompt_runs_meeting_idx"       ON "prompt_runs" ("meeting_id");
CREATE INDEX IF NOT EXISTS "prompt_runs_created_at_idx"    ON "prompt_runs" ("created_at");
