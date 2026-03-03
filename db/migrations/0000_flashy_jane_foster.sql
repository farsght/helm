CREATE TABLE `campaign_prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`prospect_id` integer NOT NULL,
	`current_node_id` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_activity_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_node_id`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`schedule_json` text,
	`ai_persona_json` text,
	`list_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `connected_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`campaign_id` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`last_message_at` integer,
	`assigned_to` text,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `list_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`prospect_id` integer NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'static' NOT NULL,
	`filter_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer,
	`prospect_id` integer NOT NULL,
	`node_id` integer,
	`channel` text NOT NULL,
	`direction` text NOT NULL,
	`subject` text,
	`body` text,
	`body_html` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`ai_generated` integer DEFAULT false,
	`variant_id` integer,
	`sent_at` integer,
	`opened_at` integer,
	`replied_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`node_id`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`variant_id`) REFERENCES `template_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospect_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`company` text,
	`title` text,
	`linkedin_url` text,
	`phone` text,
	`industry` text,
	`location` text,
	`custom_fields_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `template_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`name` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`send_count` integer DEFAULT 0,
	`reply_count` integer DEFAULT 0,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`variables_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_edges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`source_node_id` integer NOT NULL,
	`target_node_id` integer NOT NULL,
	`condition_json` text,
	`label` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_node_id`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_node_id`) REFERENCES `workflow_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workflow_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`config_json` text,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
