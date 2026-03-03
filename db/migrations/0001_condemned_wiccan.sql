CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
ALTER TABLE `template_variants` ADD `open_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `template_variants` ADD `click_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `template_variants` ADD `is_winner` integer DEFAULT false;