import { Queue, Worker, type Job } from "bullmq";
import { ENV } from "./_core/env";
import { addNotification, createAnalysis, getAnalysis, getPullRequest, getRepository, listWorkspaceMemberIds, saveFindings, updateAnalysis } from "./db";
import { getFileContent, getPullRequestDiff, getPullRequestFiles } from "./github";
import { normalizeReviewFindings, runAIReview } from "./ai-reviewer";
import { publishEvent } from "./events";

export const analysisQueueName = "devflow-analysis";
const connection = ENV.redisUrl ? { url: ENV.redisUrl, maxRetriesPerRequest: null } : null;
export const analysisQueue = connection ? new Queue(analysisQueueName, { connection }) : null;

export function deterministicJobId(repositoryId: number, pullRequestNumber: number, headSha: string) { return `analysis:${repositoryId}:pr-${pullRequestNumber}:${headSha}`; }

async function processAnalysis(job: Job<{ analysisId: number; repositoryId: number; pullRequestNumber: number; headSha: string }>) {
  const started = Date.now();
  const analysis = await getAnalysis(job.data.analysisId);
  if (!analysis) return;
  await updateAnalysis(analysis.id, { status: "RUNNING", startedAt: new Date() });
  try {
    const repository = await getRepository(job.data.repositoryId);
    const pullRequest = await getPullRequestByNumber(job.data.repositoryId, job.data.pullRequestNumber);
    if (!repository || !pullRequest) throw new Error("Repository or pull request not found");
    const token = process.env.GITHUB_ACCESS_TOKEN || "";
    const files = token ? await getPullRequestFiles(token, repository.owner, repository.name, pullRequest.number) : [];
    const diff = token ? await getPullRequestDiff(token, repository.owner, repository.name, pullRequest.number) : "";
    const changedFiles = files.map(file => ({ filename: file.filename, patch: file.patch, status: file.status, additions: file.additions, deletions: file.deletions }));
    const nearbyTests: Record<string, string> = {}; const manifests: Record<string, string> = {};
    if (token) { const candidates = new Set<string>(); for (const file of files) { if (/(^|[./_-])(test|spec)([./_-]|$)|__tests__/i.test(file.filename)) candidates.add(file.filename); else { const match = file.filename.match(/^(.*)\.(tsx?|jsx?|py|go|java)$/); if (match) { const base = match[1]; const ext = file.filename.slice(base.length); candidates.add(`${base}.test${ext}`); candidates.add(`${base}.spec${ext}`); candidates.add(`${base.replace(/\/[^/]+$/, "")}/__tests__/${base.split("/").pop()}.test${ext}`); } } } for (const candidate of Array.from(candidates).slice(0, 12)) { const content = await getFileContent(token, repository.owner, repository.name, candidate, pullRequest.headSha); if (content) nearbyTests[candidate] = content; } for (const file of ["package.json", "pnpm-lock.yaml", "package-lock.json", "tsconfig.json"]) { const content = await getFileContent(token, repository.owner, repository.name, file, pullRequest.headSha); if (content) manifests[file] = content; } }
    const result = await runAIReview({ diff, files: changedFiles, nearbyTests, manifests, additions: pullRequest.additions, deletions: pullRequest.deletions });
    await saveFindings(analysis.id, normalizeReviewFindings(analysis.id, result.review.findings));
    const status = result.review.modelMetadata.model === "unavailable" ? "PARTIAL" : "COMPLETED";
    await updateAnalysis(analysis.id, { status, summary: result.review.summary, overallRisk: result.review.overallRisk, promptVersion: result.review.modelMetadata.promptVersion, modelName: result.review.modelMetadata.model, completedAt: new Date(), latencyMs: Date.now() - started, precheckResults: result.prechecks, contextSources: result.review.contextSources });
    const memberIds = await listWorkspaceMemberIds(repository.workspaceId);
    for (const userId of memberIds) await addNotification({ workspaceId: repository.workspaceId, userId, type: "analysis.completed", title: `PR #${pullRequest.number} analysis ${status.toLowerCase()}`, body: result.review.summary, relatedAnalysisId: analysis.id });
    publishEvent("analysis.completed", { analysisId: analysis.id, status, pullRequestNumber: pullRequest.number, summary: result.review.summary });
  } catch (error) {
    await updateAnalysis(analysis.id, { status: "FAILED", errorCode: "ANALYSIS_FAILED", errorMessage: error instanceof Error ? error.message : "Unknown analysis error", completedAt: new Date(), latencyMs: Date.now() - started });
    publishEvent("analysis.failed", { analysisId: analysis.id, status: "FAILED" });
    throw error;
  }
}

async function getPullRequestByNumber(repositoryId: number, number: number) {
  const { listPullRequests } = await import("./db");
  const rows = await listPullRequests(repositoryId);
  return rows.find(row => row.number === number);
}

export async function enqueueAnalysis(input: { repositoryId: number; pullRequestId: number; pullRequestNumber: number; headSha: string; baseSha: string; changedFilesCount: number; additions: number; deletions: number }) {
  const jobId = deterministicJobId(input.repositoryId, input.pullRequestNumber, input.headSha);
  const { createRevision } = await import("./db");
  const revision = await createRevision({ pullRequestId: input.pullRequestId, headSha: input.headSha, baseSha: input.baseSha, changedFilesCount: input.changedFilesCount, additions: input.additions, deletions: input.deletions });
  if (!revision) throw new Error("Database unavailable");
  const analysis = await createAnalysis({ pullRequestRevisionId: revision.id, jobId, status: "QUEUED" });
  if (!analysis) throw new Error("Database unavailable");
  if (analysis.jobId !== jobId) return analysis;
  if (analysisQueue) await analysisQueue.add("analyze-pull-request", { analysisId: analysis.id, repositoryId: input.repositoryId, pullRequestNumber: input.pullRequestNumber, headSha: input.headSha }, { jobId, attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 100, removeOnFail: 100 });
  else setTimeout(() => processAnalysis({ data: { analysisId: analysis.id, repositoryId: input.repositoryId, pullRequestNumber: input.pullRequestNumber, headSha: input.headSha } } as Job), 50);
  return analysis;
}

export function startAnalysisWorker() {
  if (!connection) return null;
  const worker = new Worker(analysisQueueName, processAnalysis, { connection, concurrency: 2 });
  worker.on("failed", (job, error) => console.error(`[Worker] Analysis ${job?.id} failed`, error));
  return worker;
}
