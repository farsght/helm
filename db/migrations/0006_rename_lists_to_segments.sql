-- Rename: lists -> segments, list_members -> segment_members, list_id -> segment_id
-- Manual migration (drizzle-kit prompts interactively for renames).

ALTER TABLE "lists" RENAME TO "segments";--> statement-breakpoint
ALTER TABLE "list_members" RENAME TO "segment_members";--> statement-breakpoint

ALTER TABLE "segment_members" RENAME COLUMN "list_id" TO "segment_id";--> statement-breakpoint
ALTER TABLE "campaigns" RENAME COLUMN "list_id" TO "segment_id";--> statement-breakpoint

-- Constraint names get auto-derived from table+col; Postgres updates them on RENAME TABLE for primary keys, but FK constraint names from the old table may persist. Rename them explicitly so future drizzle introspection lines up.
ALTER INDEX IF EXISTS "lists_pkey" RENAME TO "segments_pkey";--> statement-breakpoint
ALTER INDEX IF EXISTS "list_members_pkey" RENAME TO "segment_members_pkey";
--> statement-breakpoint
ALTER TABLE "campaigns" RENAME CONSTRAINT "campaigns_list_id_lists_id_fk" TO "campaigns_segment_id_segments_id_fk";--> statement-breakpoint
ALTER TABLE "segment_members" RENAME CONSTRAINT "list_members_list_id_lists_id_fk" TO "segment_members_segment_id_segments_id_fk";--> statement-breakpoint
ALTER TABLE "segment_members" RENAME CONSTRAINT "list_members_prospect_id_prospects_id_fk" TO "segment_members_prospect_id_prospects_id_fk";
