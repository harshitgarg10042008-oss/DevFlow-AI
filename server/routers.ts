import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { listAccessibleRepositories, getRepositoryBranches, getRepositoryCommits, getRepositoryPullRequests } from "./github";
import { addNotification, canAccessWorkspace, dashboardStats, disconnectRepository, ensureWorkspace, getAnalysis, getGithubConnection, getPullRequest, getRepository, listAnalysesForRepository, listFindings, listNotifications, listPullRequests, listRepositories, listUserWorkspaces, markNotificationRead, setFindingFeedback, upsertGithubConnection, connectRepository, upsertBranch, upsertCommit, listBranches, listCommits } from "./db";
import { enqueueAnalysis } from "./queue";
import { feedbackSchema } from "@shared/devflow-contracts";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });
export function defaultWorkspaceName(name?: string | null) { return `${name || "My"} Engineering Workspace`; }
async function assertWorkspace(userId: number, workspaceId: number) { if (!(await canAccessWorkspace(userId, workspaceId))) throw new Error("Workspace access denied"); }

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async opts => { if (opts.ctx.user) await ensureWorkspace(opts.ctx.user.id, defaultWorkspaceName(opts.ctx.user.name)); return opts.ctx.user; }),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listUserWorkspaces(ctx.user.id)),
    bootstrap: protectedProcedure.mutation(({ ctx }) => ensureWorkspace(ctx.user.id, defaultWorkspaceName(ctx.user.name))),
  }),
  github: router({
    status: protectedProcedure.query(async ({ ctx }) => ({ configured: Boolean(ENV.githubClientId), connected: Boolean(await getGithubConnection(ctx.user.id)) })),
    connectToken: protectedProcedure.input(z.object({ accessToken: z.string().min(1).optional(), githubLogin: z.string().optional() })).mutation(async ({ ctx, input }) => { const cookies = parseCookie(ctx.req.headers.cookie || ""); const accessToken = input.accessToken || cookies.devflow_github_token; if (!accessToken) throw new Error("GitHub OAuth is not configured or no access token is available"); await upsertGithubConnection({ userId: ctx.user.id, accessToken, githubLogin: input.githubLogin, scopes: "repo,read:user" }); return { success: true }; }),
    accessibleRepositories: protectedProcedure.query(async ({ ctx }) => { const connection = await getGithubConnection(ctx.user.id); if (!connection?.accessToken) return []; return listAccessibleRepositories(connection.accessToken); }),
  }),
  repository: router({
    list: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => { await assertWorkspace(ctx.user.id, input.workspaceId); return listRepositories(input.workspaceId); }),
    connect: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), githubRepositoryId: z.number().int(), owner: z.string(), name: z.string(), fullName: z.string(), defaultBranch: z.string(), isPrivate: z.boolean().default(false) })).mutation(async ({ ctx, input }) => { await assertWorkspace(ctx.user.id, input.workspaceId); return connectRepository({ ...input, isPrivate: input.isPrivate ? 1 : 0, syncStatus: "IDLE" }); }),
    disconnect: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); await disconnectRepository(input.repositoryId); return { success: true }; }),
    sync: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); const connection = await getGithubConnection(ctx.user.id); if (!connection?.accessToken) throw new Error("Connect GitHub before synchronizing"); const [prs, branches, commits] = await Promise.all([getRepositoryPullRequests(connection.accessToken, repository.owner, repository.name), getRepositoryBranches(connection.accessToken, repository.owner, repository.name), getRepositoryCommits(connection.accessToken, repository.owner, repository.name)]); for (const pr of prs) await (await import("./db")).upsertPullRequest({ repositoryId: repository.id, ...pr }); for (const branch of branches) await upsertBranch(repository.id, branch); for (const commit of commits) await upsertCommit(repository.id, commit); return { syncedPullRequests: prs.length, syncedBranches: branches.length, syncedCommits: commits.length }; }),
    branches: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).query(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); return listBranches(input.repositoryId); }),
    commits: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).query(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); return listCommits(input.repositoryId); }),
    pullRequests: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).query(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); return listPullRequests(input.repositoryId); }),
    health: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).query(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); return dashboardStats(input.repositoryId); }),
    reviews: protectedProcedure.input(z.object({ repositoryId: z.number().int().positive() })).query(async ({ ctx, input }) => { const repository = await getRepository(input.repositoryId); if (!repository) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repository.workspaceId); return listAnalysesForRepository(input.repositoryId); }),
  }),
  pullRequest: router({
    detail: protectedProcedure.input(z.object({ pullRequestId: z.number().int().positive() })).query(async ({ ctx, input }) => { const pr = await getPullRequest(input.pullRequestId); if (!pr) throw new Error("Pull request not found"); const repo = await getRepository(pr.repositoryId); if (!repo) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repo.workspaceId); const connection = await getGithubConnection(ctx.user.id); let files: Array<{ filename: string; status?: string; additions?: number; deletions?: number; patch?: string | null }> = []; let diff = ""; if (connection?.accessToken) { files = await (await import("./github")).getPullRequestFiles(connection.accessToken, repo.owner, repo.name, pr.number); diff = await (await import("./github")).getPullRequestDiff(connection.accessToken, repo.owner, repo.name, pr.number); } return { ...pr, repository: repo, files, diff }; }),
    analyze: protectedProcedure.input(z.object({ pullRequestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const pr = await getPullRequest(input.pullRequestId); if (!pr) throw new Error("Pull request not found"); const repo = await getRepository(pr.repositoryId); if (!repo) throw new Error("Repository not found"); await assertWorkspace(ctx.user.id, repo.workspaceId); return enqueueAnalysis({ repositoryId: repo.id, pullRequestId: pr.id, pullRequestNumber: pr.number, headSha: pr.headSha, baseSha: pr.baseSha, changedFilesCount: pr.changedFiles, additions: pr.additions, deletions: pr.deletions }); }),
  }),
  analysis: router({
    detail: protectedProcedure.input(z.object({ analysisId: z.number().int().positive() })).query(async ({ ctx, input }) => { const analysis = await getAnalysis(input.analysisId); if (!analysis) throw new Error("Analysis not found"); const findings = await listFindings(input.analysisId); return { analysis, findings }; }),
  }),
  finding: router({
    feedback: protectedProcedure.input(z.object({ findingId: z.number().int().positive(), feedback: feedbackSchema })).mutation(async ({ ctx, input }) => { await setFindingFeedback(input.findingId, ctx.user.id, input.feedback); return { success: true, feedback: input.feedback }; }),
  }),
  notification: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    read: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.notificationId, ctx.user.id).then(() => ({ success: true }))),
  }),
});
export type AppRouter = typeof appRouter;
