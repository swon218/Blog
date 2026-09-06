CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`duration` integer,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_object_key` ON `media` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_media_post_id` ON `media` (`post_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`content_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_posts_slug` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_subject_sort` ON `posts` (`subject_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_posts_public_subject_sort` ON `posts` (`status`,`subject_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subjects_slug` ON `subjects` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_subjects_sort_order` ON `subjects` (`sort_order`);