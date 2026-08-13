CREATE TABLE `evaluationDatasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluationDatasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationSamples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`analysisId` int NOT NULL,
	`findingId` int,
	`reviewerLabel` varchar(80) NOT NULL,
	`modelLabel` varchar(80),
	`falsePositive` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluationSamples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewerAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pullRequestId` int NOT NULL,
	`repositoryId` int NOT NULL,
	`owner` varchar(160) NOT NULL,
	`userId` int,
	`source` varchar(40) NOT NULL DEFAULT 'CODEOWNERS',
	`status` enum('RECOMMENDED','ASSIGNED','DISMISSED') NOT NULL DEFAULT 'RECOMMENDED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewerAssignments_id` PRIMARY KEY(`id`)
);
