import { getRepository, listBranches, listPullRequests } from "./db";
import { listCodeOwners, updateOnboardingScan } from "./second-release-db";

export async function runOnboardingScan(scanId: number, repositoryId: number) {
  await updateOnboardingScan(scanId, { status: "RUNNING" });
  try {
    const repository = await getRepository(repositoryId);
    if (!repository) throw new Error("Repository not found");
    const [pullRequests, branches, owners] = await Promise.all([listPullRequests(repositoryId), listBranches(repositoryId), listCodeOwners(repositoryId)]);
    const checks = [pullRequests.length > 0, branches.length > 0, owners.length > 0, Boolean(repository.lastSyncedAt)];
    const baselineScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const findings = [
      ...(pullRequests.length === 0 ? [{ category: "workflow", message: "No pull requests are synchronized yet." }] : []),
      ...(branches.length === 0 ? [{ category: "repository", message: "No branch metadata is synchronized yet." }] : []),
      ...(owners.length === 0 ? [{ category: "ownership", message: "No CODEOWNERS rules have been imported." }] : []),
    ];
    await updateOnboardingScan(scanId, { status: "COMPLETED", baselineScore, summary: `Baseline score ${baselineScore}/100 from repository metadata, ownership, and review workflow signals.`, findings, completedAt: new Date() });
    return { baselineScore, findings };
  } catch (error) {
    await updateOnboardingScan(scanId, { status: "FAILED", summary: error instanceof Error ? error.message : "Onboarding scan failed" });
    throw error;
  }
}
