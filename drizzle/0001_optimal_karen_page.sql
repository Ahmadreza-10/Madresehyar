CREATE TABLE `excuse_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_id` text,
	`review_note` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `excuse_attendance_uq` ON `excuse_requests` (`attendance_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `vice_title` text;