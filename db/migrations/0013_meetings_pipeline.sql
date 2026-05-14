-- Phase 1 of the Fireflies meetings absorption (see docs/meetings-pipeline.md).
--
-- This file is generated from the Drizzle schema (db/schema.ts) via
-- `drizzle-kit export` for the CREATE TABLE / btree-INDEX / ALTER TABLE
-- blocks, then layered with two things Drizzle can't model:
--
--   1. `meeting_chunks.embedding` upgraded from text → vector(1536). The
--      Drizzle schema declares it as `text` because pgvector ops happen
--      via raw `sql` templates in the executor, but on disk we need the
--      real pgvector type for ivfflat indexing.
--   2. GIN indexes on text[] / jsonb columns and the ivfflat cosine index
--      on `meeting_chunks.embedding`. Drizzle can't currently express GIN
--      or ivfflat operator classes.
--
-- pgvector is already enabled by 0012_knowledge_rag.sql so we don't
-- re-create the extension.

-- ───────────────────────────────────────────────────────────────────────
-- Tables (verbatim from `drizzle-kit export`, with one schema-aligned
-- upgrade: meeting_chunks.embedding text → vector(1536).)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE "meetings" (
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
	"meeting_class" text,
	"meeting_category" text,
	"meeting_subcategory" text,
	"workflow" text DEFAULT 'unprocessed' NOT NULL,
	"access" text,
	"maturity" text,
	"brand" text[],
	"secondary_tags" text[],
	"taxonomy_json" jsonb,
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
--> statement-breakpoint

CREATE TABLE "meeting_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
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
--> statement-breakpoint

CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "entity_mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"meeting_id" integer NOT NULL,
	"mention_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint

CREATE TABLE "prompt_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"pipeline_run_id" integer,
	"node_id" integer,
	"meeting_id" integer,
	"prompt_version_tag" text NOT NULL,
	"model" text NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"error_message" text,
	"latency_ms" integer,
	"cost_usd" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint


-- ───────────────────────────────────────────────────────────────────────
-- Foreign keys (verbatim from drizzle export).
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "meeting_chunks" ADD CONSTRAINT "meeting_chunks_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_node_id_pipeline_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."pipeline_nodes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint


-- ───────────────────────────────────────────────────────────────────────
-- B-tree indexes (verbatim from drizzle export).
-- ───────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "entities_user_name_type_idx" ON "entities" USING btree ("user_id","name","type");
--> statement-breakpoint
CREATE INDEX "entities_type_idx" ON "entities" USING btree ("type");
--> statement-breakpoint
CREATE UNIQUE INDEX "entity_mentions_entity_meeting_idx" ON "entity_mentions" USING btree ("entity_id","meeting_id");
--> statement-breakpoint
CREATE INDEX "entity_mentions_meeting_idx" ON "entity_mentions" USING btree ("meeting_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_chunks_meeting_chunk_idx" ON "meeting_chunks" USING btree ("meeting_id","chunk_index");
--> statement-breakpoint
CREATE INDEX "meeting_chunks_meeting_class_idx" ON "meeting_chunks" USING btree ("meeting_class");
--> statement-breakpoint
CREATE INDEX "meeting_chunks_category_idx" ON "meeting_chunks" USING btree ("meeting_category");
--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_fireflies_id_idx" ON "meetings" USING btree ("fireflies_id");
--> statement-breakpoint
CREATE INDEX "meetings_user_idx" ON "meetings" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "meetings_meeting_class_idx" ON "meetings" USING btree ("meeting_class");
--> statement-breakpoint
CREATE INDEX "meetings_category_idx" ON "meetings" USING btree ("meeting_category");
--> statement-breakpoint
CREATE INDEX "meetings_workflow_idx" ON "meetings" USING btree ("workflow");
--> statement-breakpoint
CREATE INDEX "meetings_access_idx" ON "meetings" USING btree ("access");
--> statement-breakpoint
CREATE INDEX "meetings_maturity_idx" ON "meetings" USING btree ("maturity");
--> statement-breakpoint
CREATE INDEX "meetings_meeting_date_idx" ON "meetings" USING btree ("meeting_date");
--> statement-breakpoint
CREATE INDEX "prompt_runs_pipeline_run_idx" ON "prompt_runs" USING btree ("pipeline_run_id");
--> statement-breakpoint
CREATE INDEX "prompt_runs_node_idx" ON "prompt_runs" USING btree ("node_id");
--> statement-breakpoint
CREATE INDEX "prompt_runs_meeting_idx" ON "prompt_runs" USING btree ("meeting_id");
--> statement-breakpoint
CREATE INDEX "prompt_runs_created_at_idx" ON "prompt_runs" USING btree ("created_at");
--> statement-breakpoint


-- ───────────────────────────────────────────────────────────────────────
-- GIN indexes on array / jsonb columns (Drizzle can't model these).
-- Used by taxonomy filters: `WHERE taxonomy_json @> '{"domain":["fintech"]}'`.
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "meetings_brand_gin_idx"            ON "meetings"        USING gin ("brand");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_secondary_tags_gin_idx"   ON "meetings"        USING gin ("secondary_tags");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_taxonomy_gin_idx"         ON "meetings"        USING gin ("taxonomy_json");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_chunks_taxonomy_gin_idx"   ON "meeting_chunks"  USING gin ("taxonomy_json");
--> statement-breakpoint

-- ───────────────────────────────────────────────────────────────────────
-- ivfflat cosine index on chunk embeddings. lists=100 is the sane default;
--> statement-breakpoint
-- retune to ~sqrt(rows) once we have meaningful volume (>10k chunks).
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "meeting_chunks_embedding_cosine_idx"
  ON "meeting_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
--> statement-breakpoint
