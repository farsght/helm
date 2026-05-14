CREATE TABLE IF NOT EXISTS "agent_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"body" text DEFAULT '' NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_skill_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"transport" text DEFAULT 'http' NOT NULL,
	"url" text NOT NULL,
	"auth_headers_json" text,
	"tools_cache_json" text,
	"tools_cached_at" timestamp,
	"last_verified_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_mcp_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"mcp_server_id" integer NOT NULL,
	"enabled_tools_json" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_skill_links" ADD CONSTRAINT "agent_skill_links_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agent_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_skill_links" ADD CONSTRAINT "agent_skill_links_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "agent_skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_mcp_links" ADD CONSTRAINT "agent_mcp_links_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agent_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_mcp_links" ADD CONSTRAINT "agent_mcp_links_mcp_server_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "mcp_servers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_skill_links_agent_id_idx" ON "agent_skill_links" ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_skill_links_unique" ON "agent_skill_links" ("agent_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_mcp_links_agent_id_idx" ON "agent_mcp_links" ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_mcp_links_unique" ON "agent_mcp_links" ("agent_id","mcp_server_id");
