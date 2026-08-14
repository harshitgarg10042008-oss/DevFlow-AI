ALTER TABLE `evaluationDatasets` ADD `benchmarkType` enum('PRODUCTION','BENCHMARK') DEFAULT 'PRODUCTION' NOT NULL;--> statement-breakpoint
ALTER TABLE `evaluationDatasets` ADD `targetPrecision` varchar(20);--> statement-breakpoint
ALTER TABLE `evaluationDatasets` ADD `targetRecall` varchar(20);--> statement-breakpoint
ALTER TABLE `evaluationDatasets` ADD `targetFalsePositiveRate` varchar(20);--> statement-breakpoint
ALTER TABLE `evaluationSamples` ADD `caseType` enum('CLEAN','INJECTED_ISSUE') DEFAULT 'INJECTED_ISSUE' NOT NULL;--> statement-breakpoint
ALTER TABLE `evaluationSamples` ADD `expectedCategories` json;