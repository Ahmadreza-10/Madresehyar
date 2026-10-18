CREATE TABLE `chat_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'group' NOT NULL,
	`description` text,
	`class_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_groups_school_idx` ON `chat_groups` (`school_id`);
--> statement-breakpoint
CREATE TABLE `chat_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_members_uq` ON `chat_members` (`group_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `chat_members_user_idx` ON `chat_members` (`user_id`);
--> statement-breakpoint
CREATE TABLE `chat_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`author_id` text,
	`body` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`edited_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_posts_group_idx` ON `chat_posts` (`group_id`,`created_at`);
