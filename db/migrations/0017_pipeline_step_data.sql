-- Staging table for pipeline step outputs.
-- Inngest has a ~4MB limit on step return values, so large intermediate
-- data (e.g. 57 full meeting transcripts) is stored here instead.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_step_data" (
  "id" serial PRIMARY KEY NOT NULL,
  "run_id" integer NOT NULL,
  "node_id" integer NOT NULL,
  "data_json" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psd_run_node_idx" ON "pipeline_step_data" ("run_id", "node_id");
