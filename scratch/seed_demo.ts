import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import {
  pullRequests,
  pullRequestRevisions,
  analyses,
  findings,
  findingLifecycles,
  repositories,
} from "../drizzle/schema.js";

async function seed() {
  const pool = await mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 3,
  });
  const db = drizzle(pool);

  const repos = await db.select().from(repositories).execute();
  if (!repos.length) {
    console.error("No repositories found. Connect a repo first from the dashboard.");
    process.exit(1);
  }

  const targetRepo = repos.find(r => r.name === "DBOps-AI") || repos[0];
  console.log(`Seeding demo data for repo: ${targetRepo.fullName} (id=${targetRepo.id})`);

  const prData = [
    {
      number: 201,
      githubPullRequestId: 20001,
      title: "feat: implement role-based authorization checks",
      author: "harshitgarg10042008-oss",
      additions: 147, deletions: 12, changedFiles: 4,
      risk: "high",
      summary: "Adds RBAC middleware to all authenticated API routes. Three security findings detected.",
      findingsData: [
        { title: "Missing ownership check on mutation", severity: "critical", category: "security", evidence: "No ownership predicate found before updateRecord() call.", reasoning: "Allows any authenticated user to modify records they don't own.", recommendation: "Add verifyOwnership() check before modifying records.", status: "ACCEPTED" as const },
        { title: "Hardcoded admin role bypass", severity: "high", category: "security", evidence: "isAdmin check can be circumvented via header injection.", reasoning: "Header can be spoofed in non-proxy deployments.", recommendation: "Use session-stored role, not request headers.", status: "OPEN" as const },
        { title: "Inefficient permission lookup query", severity: "medium", category: "performance", evidence: "N+1 query pattern detected in role resolution.", reasoning: "Causes O(n) database calls per request.", recommendation: "Batch role lookups with a single JOIN query.", status: "DISMISSED" as const },
      ]
    },
    {
      number: 202,
      githubPullRequestId: 20002,
      title: "fix: resolve connection leak in database module",
      author: "harshitgarg10042008-oss",
      additions: 38, deletions: 61, changedFiles: 2,
      risk: "medium",
      summary: "Properly closes pooled connections after query execution.",
      findingsData: [
        { title: "Unclosed DB connection on error path", severity: "high", category: "reliability", evidence: "Connection not released in catch block — can exhaust pool.", reasoning: "Under load this causes connection pool exhaustion and service outage.", recommendation: "Use try/finally to guarantee pool.release() is called.", status: "ACCEPTED" as const },
      ]
    },
    {
      number: 203,
      githubPullRequestId: 20003,
      title: "chore: update dependencies and refactor logging",
      author: "harshitgarg10042008-oss",
      additions: 210, deletions: 190, changedFiles: 11,
      risk: "low",
      summary: "No significant risk signals detected in this dependency update.",
      findingsData: []
    },
  ];

  for (const pr of prData) {
    const headSha = crypto.randomBytes(20).toString("hex");
    const baseSha = crypto.randomBytes(20).toString("hex");

    const existing = await db.select().from(pullRequests)
      .where(eq(pullRequests.number, pr.number)).execute();

    let prId: number;
    if (existing.length > 0) {
      prId = existing[0].id;
      console.log(`  PR #${pr.number} already exists (id=${prId}), reusing.`);
    } else {
      const [ins] = await db.insert(pullRequests).values({
        repositoryId: targetRepo.id,
        githubPullRequestId: pr.githubPullRequestId,
        number: pr.number,
        title: pr.title,
        state: "open",
        headSha,
        baseSha,
        author: pr.author,
        htmlUrl: `https://github.com/${targetRepo.fullName}/pull/${pr.number}`,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
      });
      prId = ins.insertId as number;
    }

    const [revIns] = await db.insert(pullRequestRevisions).values({
      pullRequestId: prId,
      headSha,
      baseSha,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFilesCount: pr.changedFiles,
    });
    const revId = revIns.insertId as number;

    const [anaIns] = await db.insert(analyses).values({
      pullRequestRevisionId: revId,
      jobId: `seed-${targetRepo.id}-${pr.number}-${Date.now()}`,
      status: "COMPLETED",
      summary: pr.summary,
      overallRisk: pr.risk,
      latencyMs: Math.floor(Math.random() * 6000) + 2000,
      completedAt: new Date(),
    });
    const analysisId = anaIns.insertId as number;

    for (const f of pr.findingsData) {
      const fingerprint = `seed-${pr.number}-${f.category}-${f.title.slice(0, 12).replace(/\s/g, "_")}`;
      const [fIns] = await db.insert(findings).values({
        analysisId,
        fingerprint,
        title: f.title,
        severity: f.severity,
        category: f.category,
        confidence: "0.95",
        filePath: "src/api/handler.ts",
        startLine: 42,
        evidence: f.evidence,
        reasoning: f.reasoning,
        recommendation: f.recommendation,
        status: f.status,
      });

      await db.insert(findingLifecycles).values({
        findingId: fIns.insertId as number,
        repositoryId: targetRepo.id,
        fingerprint,
        lifecycle: "NEW",
      });
    }

    console.log(`  ✓ PR #${pr.number} "${pr.title}" — ${pr.findingsData.length} findings seeded.`);
  }

  console.log("\n✅ Demo data seeded! Refresh your dashboard to see the data.");
  await pool.end();
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
