CREATE TABLE `study_report_items` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`study_min` integer DEFAULT 0 NOT NULL,
	`test_min` integer DEFAULT 0 NOT NULL,
	`topic` text NOT NULL,
	`methods` text DEFAULT '[]' NOT NULL,
	`pages` integer DEFAULT 0 NOT NULL,
	`mastery` integer DEFAULT 3 NOT NULL,
	`goal` text,
	`goal_achieved` integer,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `study_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `study_items_report_idx` ON `study_report_items` (`report_id`);
--> statement-breakpoint
ALTER TABLE `study_tests` ADD `subject_id` text REFERENCES subjects(id) ON DELETE set null;
--> statement-breakpoint
INSERT INTO `study_report_items` (`id`, `report_id`, `subject_id`, `study_min`, `test_min`, `topic`, `methods`, `pages`, `mastery`, `goal`, `goal_achieved`, `position`) SELECT lower(hex(randomblob(16))), `id`, `subject_id`, `duration_min`, 0, `topic`, `methods`, `pages`, `mastery`, `goal`, `goal_achieved`, 0 FROM `study_reports`;
--> statement-breakpoint
UPDATE `study_tests` SET `subject_id` = (SELECT `subject_id` FROM `study_reports` WHERE `study_reports`.`id` = `study_tests`.`report_id`);
