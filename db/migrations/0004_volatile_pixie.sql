CREATE TABLE "dataset_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"external_id" text,
	"row_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'csv' NOT NULL,
	"source_meta_json" jsonb,
	"column_schema_json" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"error_message" text,
	"refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dataset_rows_dataset_id_idx" ON "dataset_rows" USING btree ("dataset_id");