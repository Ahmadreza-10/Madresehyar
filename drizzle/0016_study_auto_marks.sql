CREATE TABLE `study_auto_marks` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`note_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `student_notes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auto_mark_uq` ON `study_auto_marks` (`student_id`,`date`,`kind`);