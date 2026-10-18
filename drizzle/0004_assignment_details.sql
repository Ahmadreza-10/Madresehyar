ALTER TABLE `assignments` ADD `due_time` text;--> statement-breakpoint
ALTER TABLE `assignments` ADD `steps` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `assignment_status` ADD `steps_done` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `assignment_status` ADD `note` text;--> statement-breakpoint
CREATE TABLE `assignment_files` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignment_files_idx` ON `assignment_files` (`assignment_id`);
