ALTER TABLE `purchase_requests` ADD `pay_ref` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pay_note` text;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `pay_submitted_at` integer;
--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `applicant_token_hash` text;
