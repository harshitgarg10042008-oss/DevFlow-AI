import { Octokit } from "@octokit/rest";
import { ENV } from "./_core/env";

export function createGithubClient(accessToken?: string) {
  return new Octokit({ auth: accessToken || undefined, userAgent: "DevFlow-AI/1.0" });
}

export async function listAccessibleRepositories(accessToken: string) {
  const client = createGithubClient(accessToken);
  const repos = await client.paginate(client.rest.repos.listForAuthenticatedUser, { per_page: 100, sort: "updated", affiliation: "owner,collaborator,organization_member" });
  return repos.map(repo => ({ id: repo.id, owner: repo.owner.login, name: repo.name, fullName: repo.full_name, defaultBranch: repo.default_branch || "main", isPrivate: repo.private }));
}

export async function getRepositoryBranches(accessToken: string, owner: string, repo: string) { const client = createGithubClient(accessToken); return client.paginate(client.rest.repos.listBranches, { owner, repo, per_page: 100 }).then(rows => rows.map(branch => ({ githubBranchId: branch.name, name: branch.name, protected: branch.protected, latestSha: branch.commit.sha }))); }
export async function getRepositoryCommits(accessToken: string, owner: string, repo: string) { const client = createGithubClient(accessToken); return client.paginate(client.rest.repos.listCommits, { owner, repo, per_page: 100 }).then(rows => rows.map(commit => ({ sha: commit.sha, message: commit.commit.message, author: commit.author?.login || commit.commit.author?.name || null, committedAt: commit.commit.author?.date ? new Date(commit.commit.author.date) : null, htmlUrl: commit.html_url }))); }

export async function getRepositoryPullRequests(accessToken: string, owner: string, repo: string) {
  const client = createGithubClient(accessToken);
  const response = await client.rest.pulls.list({ owner, repo, state: "all", per_page: 50, sort: "updated", direction: "desc" });
  return response.data.map(pr => ({ githubPullRequestId: pr.id, number: pr.number, title: pr.title, body: pr.body, state: pr.state, author: pr.user?.login || "unknown", headSha: pr.head.sha, baseSha: pr.base.sha, additions: 0, deletions: 0, changedFiles: 0, htmlUrl: pr.html_url, openedAt: new Date(pr.created_at) }));
}

export async function getPullRequestDetails(accessToken: string, owner: string, repo: string, number: number) {
  const client = createGithubClient(accessToken);
  const response = await client.rest.pulls.get({ owner, repo, pull_number: number });
  return response.data;
}

export async function getPullRequestFiles(accessToken: string, owner: string, repo: string, number: number) {
  const client = createGithubClient(accessToken);
  return client.paginate(client.rest.pulls.listFiles, { owner, repo, pull_number: number, per_page: 100 });
}

export async function getPullRequestDiff(accessToken: string, owner: string, repo: string, number: number) {
  const client = createGithubClient(accessToken);
  const response = await client.rest.pulls.get({ owner, repo, pull_number: number, mediaType: { format: "diff" } });
  return typeof response.data === "string" ? response.data : String(response.data);
}

export async function getFileContent(accessToken: string, owner: string, repo: string, path: string, ref: string) {
  const client = createGithubClient(accessToken);
  try {
    const response = await client.rest.repos.getContent({ owner, repo, path, ref });
    if (!Array.isArray(response.data) && response.data.type === "file" && response.data.content) return Buffer.from(response.data.content, "base64").toString("utf8");
  } catch { return null; }
  return null;
}

export function githubConfigured() { return Boolean(ENV.githubClientId && ENV.githubClientSecret); }
