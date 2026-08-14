import { z } from "zod";

export const analysisStatusSchema = z.enum(["QUEUED", "RUNNING", "COMPLETED", "PARTIAL", "FAILED", "STALE"]);
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

export const feedbackSchema = z.enum(["Accept", "Dismiss", "Inaccurate"]);
export type FindingFeedback = z.infer<typeof feedbackSchema>;

export const findingCategorySchema = z.enum(["correctness", "security", "testing", "maintainability", "api", "performance", "deterministic"]);
export const severitySchema = z.enum(["info", "low", "medium", "high", "critical"]);

export const reviewFindingSchema = z.object({
  category: findingCategorySchema,
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  file: z.string().min(1).nullable().optional(),
  startLine: z.number().int().positive().nullable().optional(),
  endLine: z.number().int().positive().nullable().optional(),
  title: z.string().min(1),
  evidence: z.string().min(1),
  reasoning: z.string().min(1),
  recommendation: z.string().min(1),
});

export const aiReviewSchema = z.object({
  summary: z.string().min(1),
  overallRisk: z.enum(["low", "medium", "high"]),
  findings: z.array(reviewFindingSchema),
  filesAnalyzed: z.number().int().nonnegative(),
  contextSources: z.array(z.string()),
  modelMetadata: z.object({
    model: z.string(),
    promptVersion: z.string(),
    estimatedCost: z.number().nonnegative().optional(),
  }),
});
export type AIReview = z.infer<typeof aiReviewSchema>;

export const precheckResultSchema = z.object({
  key: z.enum(["missing_tests", "large_pr", "secret_pattern", "migration_schema", "authorization_sensitive", "console_log"]),
  kind: z.literal("deterministic"),
  passed: z.boolean(),
  severity: severitySchema,
  message: z.string(),
  files: z.array(z.string()),
});
export type PrecheckResult = z.infer<typeof precheckResultSchema>;

export const webhookEventSchema = z.object({
  action: z.string().optional(),
  number: z.number().optional(),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
    name: z.string(),
    owner: z.object({ login: z.string() }),
    default_branch: z.string().default("main"),
    private: z.boolean().default(false),
  }).optional(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable().optional(),
    state: z.string(),
    user: z.object({ login: z.string() }),
    head: z.object({ sha: z.string() }),
    base: z.object({ sha: z.string() }),
    additions: z.number().default(0),
    deletions: z.number().default(0),
    changed_files: z.number().default(0),
    html_url: z.string().optional(),
  }).optional(),
});
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
