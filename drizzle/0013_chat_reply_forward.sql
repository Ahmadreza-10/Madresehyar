ALTER TABLE `messages` ADD `reply_to_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_snippet` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `forwarded_from` text;--> statement-breakpoint
ALTER TABLE `chat_posts` ADD `reply_to_id` text;--> statement-breakpoint
ALTER TABLE `chat_posts` ADD `reply_snippet` text;--> statement-breakpoint
ALTER TABLE `chat_posts` ADD `forwarded_from` text;