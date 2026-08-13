import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { buildReviewerAssignments, deterministicJobId } from "./queue";
import { deliverNotification, notificationAdapterStatus } from "./security-and-notifications";

describe("DevFlow second-release integration contracts", () => {
  it("registers managed evaluation and reviewer procedures", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("evaluation.datasets");
    expect(procedures).toHaveProperty("evaluation.createDataset");
    expect(procedures).toHaveProperty("evaluation.addSample");
    expect(procedures).toHaveProperty("reviewer.repositoryList");
    expect(procedures).toHaveProperty("reviewer.update");
  });

  it("keeps reviewer-routed analysis job IDs deterministic", () => {
    expect(deterministicJobId(4, 12, "head-sha")).toBe("analysis:4:pr-12:head-sha");
  });

  it("returns explicit safe states for unconfigured and invalid notification targets", async () => {
    expect(notificationAdapterStatus("SLACK", false)).toEqual({ provider: "SLACK", configured: false, status: "NOT_CONFIGURED" });
    expect((await deliverNotification("TEAMS", false, undefined, "hello")).status).toBe("NOT_CONFIGURED");
    expect((await deliverNotification("EMAIL", true, "http://example.com/email", "hello")).status).toBe("INVALID_TARGET");
  });
});

import { createEvaluationDataset, saveReviewerAssignment } from "./second-release-db";
import { selectOwnerRecipientIds } from "./second-release";


describe("second-release persistence and routing fallbacks", () => {
  it("returns stable safe records when persistence is not configured", async () => {
    const dataset = await createEvaluationDataset({ workspaceId: 1, name: "qa", description: "managed" });
    const assignment = await saveReviewerAssignment({ pullRequestId: 2, repositoryId: 3, owner: "alice", source: "CODEOWNERS", status: "RECOMMENDED" });
    expect(dataset?.id).toBeTypeOf("number");
    expect(assignment?.id).toBeTypeOf("number");
  });

  it("routes CODEOWNERS handles to matching workspace users and falls back to all members", () => {
    expect(selectOwnerRecipientIds(["alice"], [{ userId: 7, name: "Alice", email: "alice@example.com" }], [7, 8])).toEqual([7]);
    expect(selectOwnerRecipientIds(["unknown"], [{ userId: 7, name: "Alice", email: "alice@example.com" }], [7, 8])).toEqual([7, 8]);
  });

  it("builds persisted reviewer assignments for each routed owner", () => {
    expect(buildReviewerAssignments(["alice", "security"], [{ userId: 7, name: "Alice", email: null }], 12, 4)).toEqual([
      { pullRequestId: 12, repositoryId: 4, owner: "alice", userId: 7, source: "CODEOWNERS", status: "ASSIGNED" },
      { pullRequestId: 12, repositoryId: 4, owner: "security", userId: undefined, source: "CODEOWNERS", status: "RECOMMENDED" },
    ]);
  });
});
