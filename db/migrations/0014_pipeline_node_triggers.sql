-- Adds trigger_config to pipeline_nodes (Phase: trigger model — step 1).
--
-- Source nodes (nodes with zero in-edges) consult this to decide WHEN they fire.
-- Intermediate nodes ignore it and run when upstream completes. Default is
-- {"kind":"manual"} so existing pipelines behave identically until a user opts in.
--
-- Generated from db/schema.ts; see `drizzle-kit export` for the canonical
-- column definition (Drizzle can express this one, no manual SQL needed).

ALTER TABLE "pipeline_nodes"
  ADD COLUMN IF NOT EXISTS "trigger_config" jsonb DEFAULT '{"kind":"manual"}'::jsonb NOT NULL;
--> statement-breakpoint
