import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { webhookEventSchema } from "@shared/devflow-contracts";
import { ENV } from "./_core/env";
import { findWebhookDelivery, getRepositoryByGithubId, markWebhookProcessed, saveWebhookDelivery, upsertPullRequest } from "./db";
import { enqueueAnalysis } from "./queue";

export function verifySignature(rawBody: Buffer, signature: string | undefined, secret = ENV.githubWebhookSecret) {
  if (!secret || !signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function registerGithubWebhook(app: Express) {
  app.post("/api/webhooks/github", async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    if (!verifySignature(rawBody, req.header("x-hub-signature-256"))) return res.status(401).json({ error: "Invalid HMAC SHA-256 signature" });
    const deliveryId = req.header("x-github-delivery");
    const eventName = req.header("x-github-event") || "unknown";
    if (!deliveryId) return res.status(400).json({ error: "Missing GitHub delivery ID" });
    if (await findWebhookDelivery(deliveryId)) return res.status(202).json({ accepted: true, duplicate: true });
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    let payload: unknown;
    try { payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : req.body; } catch { return res.status(400).json({ error: "Invalid JSON payload" }); }
    const parsed = webhookEventSchema.safeParse(payload);
    const event = parsed.success ? parsed.data : undefined;
    const deliveryDbId = await saveWebhookDelivery({ githubDeliveryId: deliveryId, eventName, action: event?.action, payloadHash, payload });
    if (!event?.repository || !event.pull_request || !["opened", "reopened", "synchronize"].includes(event.action || "")) { if (deliveryDbId) await markWebhookProcessed(deliveryDbId); return res.status(202).json({ accepted: true, queued: false }); }
    const repository = await getRepositoryByGithubId(event.repository.id);
    if (!repository) { if (deliveryDbId) await markWebhookProcessed(deliveryDbId); return res.status(202).json({ accepted: true, queued: false, reason: "repository_not_connected" }); }
    const pullRequest = await upsertPullRequest({ repositoryId: repository.id, githubPullRequestId: event.pull_request.id, number: event.pull_request.number, title: event.pull_request.title, body: event.pull_request.body, state: event.pull_request.state, author: event.pull_request.user.login, headSha: event.pull_request.head.sha, baseSha: event.pull_request.base.sha, additions: event.pull_request.additions, deletions: event.pull_request.deletions, changedFiles: event.pull_request.changed_files, htmlUrl: event.pull_request.html_url, openedAt: new Date() });
    if (pullRequest) await enqueueAnalysis({ repositoryId: repository.id, pullRequestId: pullRequest.id, pullRequestNumber: pullRequest.number, headSha: pullRequest.headSha, baseSha: pullRequest.baseSha, changedFilesCount: pullRequest.changedFiles, additions: pullRequest.additions, deletions: pullRequest.deletions });
    if (deliveryDbId) await markWebhookProcessed(deliveryDbId);
    return res.status(202).json({ accepted: true, queued: true });
  });
}
