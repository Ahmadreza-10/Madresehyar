CREATE TABLE `teacher_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`overall` integer NOT NULL,
	`teaching` integer NOT NULL,
	`mastery` integer NOT NULL,
	`behavior` integer NOT NULL,
	`comment` text,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_review_uq` ON `teacher_reviews` (`student_id`,`teacher_id`,`subject_id`,`academic_year`);--> statement-breakpoint
CREATE INDEX `teacher_review_teacher_idx` ON `teacher_reviews` (`teacher_id`,`academic_year`);