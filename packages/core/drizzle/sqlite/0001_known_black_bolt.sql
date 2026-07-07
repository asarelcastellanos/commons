CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text,
	`first_name` text NOT NULL,
	`last_name` text,
	`email` text,
	`phone` text,
	`notes` text,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
