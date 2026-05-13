ALTER TABLE "settings" DROP CONSTRAINT "settings_key_unique";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "user_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "user_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "user_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settings_user_id_key_unique" ON "settings" USING btree ("user_id","key");