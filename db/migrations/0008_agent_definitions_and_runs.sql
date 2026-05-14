CREATE TABLE IF NOT EXISTS "agent_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"model" text DEFAULT 'openai:gpt-4o-mini' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"user_prompt_template" text DEFAULT '' NOT NULL,
	"model_params_json" text,
	"output_schema_json" text DEFAULT '{"decisions":["continue","stop"]}' NOT NULL,
	"max_turns" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"invoked_by_type" text NOT NULL,
	"invoked_by_id" integer,
	"status" text DEFAULT 'running' NOT NULL,
	"input_json" text,
	"decision" text,
	"reasoning" text,
	"tool_calls_json" text,
	"tokens_used" integer,
	"cost_cents" integer,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agent_definitions_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agent_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_agent_id_idx" ON "agent_runs" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_started_at_idx" ON "agent_runs" ("started_at");
