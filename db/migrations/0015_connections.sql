-- Connections table: user-managed API credentials for external integrations.
-- Credentials are AES-256-GCM encrypted (see lib/crypto.ts).
-- Intentionally separate from `connected_accounts` (OAuth/email/LinkedIn).
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "credentials_json" text,
  "metadata_json" text,
  "status" text NOT NULL DEFAULT 'active',
  "last_tested_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_user_idx" ON "connections" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connections_user_kind_idx" ON "connections" ("user_id","kind");
