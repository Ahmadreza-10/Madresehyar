ALTER TABLE `schools` ADD `plan_id` text;
--> statement-breakpoint
ALTER TABLE `schools` ADD `subscription_ends_at` integer;
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_toman` integer NOT NULL,
	`months` integer NOT NULL,
	`max_students` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tracking_code` text NOT NULL,
	`kind` text DEFAULT 'new' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`plan_id` text,
	`school_id` text,
	`school_name` text NOT NULL,
	`manager_name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text,
	`student_count` integer DEFAULT 0 NOT NULL,
	`note` text,
	`price_toman` integer DEFAULT 0 NOT NULL,
	`admin_note` text,
	`decided_by` text,
	`decided_at` integer,
	`registered_at` integer,
	`created_school_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_requests_tracking_code_unique` ON `purchase_requests` (`tracking_code`);
--> statement-breakpoint
CREATE INDEX `purchase_status_idx` ON `purchase_requests` (`status`);
