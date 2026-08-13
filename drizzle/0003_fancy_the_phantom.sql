CREATE TABLE `analysisEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`findingId` int,
	`reviewerLabel` varchar(32),
	`modelLabel` varchar(32),
	`agreement` int,
	`falsePositive` int,
	`latencyMs` int,
	`estimatedCost` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisEvaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `architectureModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`modulePath` text NOT NULL,
	`language` varchar(40),
	`fileCount` int NOT NULL DEFAULT 0,
	`dependencyCount` int NOT NULL DEFAULT 0,
	`riskScore` int NOT NULL DEFAULT 0,
	`hotspotScore` int NOT NULL DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `architectureModules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ciChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`repositoryId` int NOT NULL,
	`githubCheckRunId` varchar(160),
	`conclusion` enum('queued','in_progress','success','failure','neutral') NOT NULL DEFAULT 'queued',
	`blockingFindings` int NOT NULL DEFAULT 0,
	`detailsUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ciChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `codeOwners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`pattern` varchar(320) NOT NULL,
	`owner` varchar(240) NOT NULL,
	`source` varchar(40) NOT NULL DEFAULT 'CODEOWNERS',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `codeOwners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dependencyRisks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`packageName` varchar(240) NOT NULL,
	`currentVersion` varchar(80),
	`severity` varchar(32) NOT NULL,
	`source` varchar(80) NOT NULL,
	`advisoryId` varchar(160),
	`fixedVersion` varchar(80),
	`details` text,
	`status` enum('OPEN','RESOLVED','ACCEPTED') NOT NULL DEFAULT 'OPEN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dependencyRisks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engineeringReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`repositoryId` int,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`reportType` varchar(40) NOT NULL DEFAULT 'WEEKLY',
	`summary` text NOT NULL,
	`metrics` json,
	`exportKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engineeringReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findingLifecycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`repositoryId` int NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`lifecycle` enum('NEW','RECURRING','FIXED','REOPENED','ACCEPTED','DISMISSED','INACCURATE') NOT NULL,
	`previousFindingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `findingLifecycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubReviewComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`repositoryId` int NOT NULL,
	`githubCommentId` varchar(160),
	`filePath` text NOT NULL,
	`line` int,
	`body` text NOT NULL,
	`status` enum('DRAFT','PUBLISHED','FAILED','SKIPPED') NOT NULL DEFAULT 'DRAFT',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp,
	CONSTRAINT `githubReviewComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`provider` enum('SLACK','EMAIL','TEAMS','SEMGREP','GITLEAKS','TRIVY') NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`target` varchar(320),
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboardingScans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`status` enum('QUEUED','RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'QUEUED',
	`baselineScore` int,
	`summary` text,
	`findings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `onboardingScans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repositoryId` int NOT NULL,
	`version` int NOT NULL,
	`minimumBlockingSeverity` varchar(32) NOT NULL DEFAULT 'critical',
	`requireTestsFor` json,
	`ignoredPaths` json,
	`enabledPrechecks` json,
	`maximumPrSize` int NOT NULL DEFAULT 800,
	`blockOnSecrets` int NOT NULL DEFAULT 1,
	`postInlineComments` int NOT NULL DEFAULT 0,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewPolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testImpacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`changedFile` text NOT NULL,
	`impactedTest` text,
	`coverageAvailable` int NOT NULL DEFAULT 0,
	`confidence` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `testImpacts_id` PRIMARY KEY(`id`)
);
