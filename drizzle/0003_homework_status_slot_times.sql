CREATE TABLE `assignment_status` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`done_date` text,
	`penalty_note_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`penalty_note_id`) REFERENCES `student_notes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignment_status_uq` ON `assignment_status` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `assignment_status_student_idx` ON `assignment_status` (`student_id`);--> statement-breakpoint
ALTER TABLE `schedule_slots` ADD `start_time` text;--> statement-breakpoint
ALTER TABLE `schedule_slots` ADD `end_time` text;
