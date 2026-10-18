ALTER TABLE `announcements` ADD `pinned` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `announcements` ADD `edited_at` integer;
--> statement-breakpoint
ALTER TABLE `messages` ADD `pinned_by_sender` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `messages` ADD `pinned_by_recipient` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `messages` ADD `edited_at` integer;
--> statement-breakpoint
ALTER TABLE `student_notes` ADD `edited_at` integer;
--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `edited_at` integer;
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`uploader_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attach_owner_idx` ON `attachments` (`kind`,`owner_id`);
