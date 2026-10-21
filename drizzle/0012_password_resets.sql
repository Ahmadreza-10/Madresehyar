CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`claimed_name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pwreset_status_idx` ON `password_resets` (`status`);
--> statement-breakpoint
CREATE INDEX `pwreset_user_idx` ON `password_resets` (`user_id`);
