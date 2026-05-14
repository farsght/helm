-- Tier 2: Knowledge / RAG infrastructure
--
-- 1) Enable pgvector
-- 2) knowledge_chunks (one row per text chunk, with 1536-dim embedding)
-- 3) agent_knowledge_links (attach a dataset to an agent for retrieval scoping)
-- 4) ivfflat index on the embedding column for ANN search

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text DEFAULT '' NOT NULL,
  "dataset_id" integer NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
  "source_path" text NOT NULL,
  "chunk_index" integer DEFAULT 0 NOT NULL,
  "total_chunks" integer DEFAULT 1 NOT NULL,
  "frontmatter_json" jsonb,
  "heading_path" text,
  "content" text NOT NULL,
  "content_hash" text NOT NULL,
  "token_count" integer DEFAULT 0 NOT NULL,
  "embedding" vector(1536),
  "embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "knowledge_chunks_user_idx" ON "knowledge_chunks" ("user_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_dataset_idx" ON "knowledge_chunks" ("dataset_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_source_path_idx" ON "knowledge_chunks" ("source_path");
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_chunks_dataset_path_chunk_idx" ON "knowledge_chunks" ("dataset_id", "source_path", "chunk_index");

-- ivfflat index for ANN search. lists=100 is a reasonable default for tens-of-thousands of rows.
-- Tune up (lists ~= sqrt(rows)) once we have real volume. Cosine distance is the standard for
-- OpenAI embeddings since they're unit-normalized.
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_cosine_idx"
  ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS "agent_knowledge_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "agent_id" integer NOT NULL REFERENCES "agent_definitions"("id") ON DELETE CASCADE,
  "dataset_id" integer NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
  "path_prefix" text,
  "filter_json" jsonb,
  "top_k" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_knowledge_links_agent_idx" ON "agent_knowledge_links" ("agent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_knowledge_links_unique" ON "agent_knowledge_links" ("agent_id", "dataset_id");
