import crypto from "node:crypto";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delivery: { id: 9, processedAt: null as Date | null },
  findWebhookDelivery: vi.fn(), saveWebhookDelivery: vi.fn(), markWebhookProcessed: vi.fn(), getRepositoryByGithubId: vi.fn(), upsertPullRequest: vi.fn(), enqueueAnalysis: vi.fn(),
}));
vi.mock("./db", () => mocks);
vi.mock("./queue", () => ({ enqueueAnalysis: mocks.enqueueAnalysis }));
vi.mock("./_core/env", () => ({ ENV: { githubWebhookSecret: "test-secret" } }));

import { registerGithubWebhook } from "./webhooks";

afterEach(() => vi.clearAllMocks());

describe("GitHub webhook route retry semantics", () => {
  it("retries an existing unprocessed delivery and dedupes it after processing", async () => {
    mocks.findWebhookDelivery.mockImplementation(async () => mocks.delivery);
    mocks.getRepositoryByGithubId.mockResolvedValue({ id: 3, workspaceId: 7, owner: "acme", name: "app" });
    mocks.upsertPullRequest.mockResolvedValue({ id: 4, number: 12, headSha: "head", baseSha: "base", changedFiles: 1, additions: 2, deletions: 1 });
    mocks.enqueueAnalysis.mockResolvedValue({ id: 11 });
    const app = express();
    app.use(express.json());
    registerGithubWebhook(app);
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("test server did not start");
      const payload = { action: "synchronize", repository: { id: 3, full_name: "acme/app", name: "app", owner: { login: "acme" }, default_branch: "main", private: false }, pull_request: { id: 88, number: 12, title: "Improve review", body: null, state: "open", user: { login: "dev" }, head: { sha: "head" }, base: { sha: "base" }, additions: 2, deletions: 1, changed_files: 1, html_url: "https://github.com/acme/app/pull/12" } };
      const body = JSON.stringify(payload);
      const signature = `sha256=${crypto.createHmac("sha256", "test-secret").update(body).digest("hex")}`;
      const first = await fetch(`http://127.0.0.1:${address.port}/api/webhooks/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-delivery": "delivery-1", "x-github-event": "pull_request", "x-hub-signature-256": signature }, body });
      expect(first.status).toBe(202);
      expect(mocks.enqueueAnalysis).toHaveBeenCalledTimes(1);
      expect(mocks.saveWebhookDelivery).not.toHaveBeenCalled();
      mocks.delivery.processedAt = new Date();
      const second = await fetch(`http://127.0.0.1:${address.port}/api/webhooks/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-delivery": "delivery-1", "x-github-event": "pull_request", "x-hub-signature-256": signature }, body });
      expect(second.status).toBe(202);
      expect((await second.json()).duplicate).toBe(true);
      expect(mocks.enqueueAnalysis).toHaveBeenCalledTimes(1);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
