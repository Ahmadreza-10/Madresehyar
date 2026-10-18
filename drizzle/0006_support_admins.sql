ALTER TABLE `users` ADD `is_owner` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `is_owner` = 1 WHERE `id` = (SELECT `id` FROM `users` WHERE `role` = 'ADMIN' ORDER BY `created_at`, `rowid` LIMIT 1);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reply` text,
	`replied_by` text,
	`replied_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`replied_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `support_user_idx` ON `support_tickets` (`user_id`);
--> statement-breakpoint
CREATE INDEX `support_status_idx` ON `support_tickets` (`status`);
