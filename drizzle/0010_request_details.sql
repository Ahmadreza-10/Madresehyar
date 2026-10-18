ALTER TABLE `purchase_requests` ADD `province` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `address` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `school_type` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `email` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `teacher_count` integer DEFAULT 0 NOT NULL;
