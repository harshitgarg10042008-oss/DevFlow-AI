CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`githubBranchId` varchar(160) NOT NULL,
	`name` varchar(160) NOT NULL,
	`protected` int NOT NULL DEFAULT 0,
	`latestSha` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`sha` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`author` varchar(160),
	`committedAt` timestamp,
	`htmlUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commits_id` PRIMARY KEY(`id`)
);
