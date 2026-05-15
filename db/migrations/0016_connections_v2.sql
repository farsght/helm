-- Drop the placeholder connections table from 0015 and replace with the
-- spec-aligned schema (Sprint 1 connections foundation).
--> statement-breakpoint
DROP TABLE IF EXISTS "connections";
--> statement-breakpoint
CREATE TABLE "connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL DEFAULT '',
  "kind" text NOT NULL,
  "provider" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "secret_ciphertext" text NOT NULL,
  "config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'active',
  "last_tested_at" timestamp,
  "last_test_status" text,
  "last_test_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "connections_user_id_idx" ON "connections" ("user_id");
--> statement-breakpoint
CREATE INDEX "connections_kind_idx" ON "connections" ("kind");
--> statement-breakpoint
CREATE INDEX "connections_provider_idx" ON "connections" ("provider");
--> statement-breakpoint
CREATE INDEX "connections_status_idx" ON "connections" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "connections_user_name_unique" ON "connections" ("user_id","name");
