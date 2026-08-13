CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pullRequestRevisionId` int NOT NULL,
	`jobId` varchar(240) NOT NULL,
	`status` enum('QUEUED','RUNNING','COMPLETED','PARTIAL','FAILED','STALE') NOT NULL DEFAULT 'QUEUED',
	`promptVersion` varchar(40),
	`modelName` varchar(120),
	`summary` text,
	`overallRisk` varchar(32),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`latencyMs` int,
	`inputTokens` int,
	`outputTokens` int,
	`estimatedCost` varchar(40),
	`errorCode` varchar(80),
	`errorMessage` text,
	`precheckResults` json,
	`contextSources` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `analyses_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int,
	`userId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80),
	`entityId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findingFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`userId` int NOT NULL,
	`feedback` enum('Accept','Dismiss','Inaccurate') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `findingFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`category` varchar(48) NOT NULL,
	`severity` varchar(32) NOT NULL,
	`confidence` varchar(20) NOT NULL,
	`filePath` text,
	`startLine` int,
	`endLine` int,
	`title` text NOT NULL,
	`evidence` text NOT NULL,
	`reasoning` text NOT NULL,
	`recommendation` text NOT NULL,
	`status` enum('OPEN','ACCEPTED','DISMISSED','INACCURATE') NOT NULL DEFAULT 'OPEN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`githubLogin` varchar(160),
	`accessToken` text,
	`scopes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `githubConnections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`relatedAnalysisId` int,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pullRequestRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pullRequestId` int NOT NULL,
	`headSha` varchar(80) NOT NULL,
	`baseSha` varchar(80) NOT NULL,
	`changedFilesCount` int NOT NULL DEFAULT 0,
	`additions` int NOT NULL DEFAULT 0,
	`deletions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pullRequestRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pullRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`githubPullRequestId` int NOT NULL,
	`number` int NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`state` varchar(32) NOT NULL,
	`author` varchar(160) NOT NULL,
	`headSha` varchar(80) NOT NULL,
	`baseSha` varchar(80) NOT NULL,
	`additions` int NOT NULL DEFAULT 0,
	`deletions` int NOT NULL DEFAULT 0,
	`changedFiles` int NOT NULL DEFAULT 0,
	`htmlUrl` text,
	`openedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pullRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`githubRepositoryId` int NOT NULL,
	`owner` varchar(160) NOT NULL,
	`name` varchar(160) NOT NULL,
	`fullName` varchar(320) NOT NULL,
	`defaultBranch` varchar(160) NOT NULL,
	`isPrivate` int NOT NULL DEFAULT 0,
	`syncStatus` enum('IDLE','SYNCING','FAILED') NOT NULL DEFAULT 'IDLE',
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repositories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`githubDeliveryId` varchar(160) NOT NULL,
	`repositoryId` int,
	`eventName` varchar(80) NOT NULL,
	`action` varchar(80),
	`payloadHash` varchar(128) NOT NULL,
	`payload` json,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhookDeliveries_githubDeliveryId_unique` UNIQUE(`githubDeliveryId`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('OWNER','ADMIN','MEMBER') NOT NULL DEFAULT 'MEMBER',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
