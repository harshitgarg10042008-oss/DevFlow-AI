import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaceMembers = mysqlTable("workspaceMembers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["OWNER", "ADMIN", "MEMBER"]).default("MEMBER").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const githubConnections = mysqlTable("githubConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  githubLogin: varchar("githubLogin", { length: 160 }),
  accessToken: text("accessToken"),
  scopes: text("scopes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const repositories = mysqlTable("repositories", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  githubRepositoryId: int("githubRepositoryId").notNull(),
  owner: varchar("owner", { length: 160 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  fullName: varchar("fullName", { length: 320 }).notNull(),
  defaultBranch: varchar("defaultBranch", { length: 160 }).notNull(),
  isPrivate: int("isPrivate").default(0).notNull(),
  syncStatus: mysqlEnum("syncStatus", ["IDLE", "SYNCING", "FAILED"]).default("IDLE").notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  repositoryId: int("repositoryId").notNull(),
  githubBranchId: varchar("githubBranchId", { length: 160 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  protected: int("protected").default(0).notNull(),
  latestSha: varchar("latestSha", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const commits = mysqlTable("commits", {
  id: int("id").autoincrement().primaryKey(),
  repositoryId: int("repositoryId").notNull(),
  sha: varchar("sha", { length: 80 }).notNull(),
  message: text("message").notNull(),
  author: varchar("author", { length: 160 }),
  committedAt: timestamp("committedAt"),
  htmlUrl: text("htmlUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pullRequests = mysqlTable("pullRequests", {
  id: int("id").autoincrement().primaryKey(),
  repositoryId: int("repositoryId").notNull(),
  githubPullRequestId: int("githubPullRequestId").notNull(),
  number: int("number").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  state: varchar("state", { length: 32 }).notNull(),
  author: varchar("author", { length: 160 }).notNull(),
  headSha: varchar("headSha", { length: 80 }).notNull(),
  baseSha: varchar("baseSha", { length: 80 }).notNull(),
  additions: int("additions").default(0).notNull(),
  deletions: int("deletions").default(0).notNull(),
  changedFiles: int("changedFiles").default(0).notNull(),
  htmlUrl: text("htmlUrl"),
  openedAt: timestamp("openedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pullRequestRevisions = mysqlTable("pullRequestRevisions", {
  id: int("id").autoincrement().primaryKey(),
  pullRequestId: int("pullRequestId").notNull(),
  headSha: varchar("headSha", { length: 80 }).notNull(),
  baseSha: varchar("baseSha", { length: 80 }).notNull(),
  changedFilesCount: int("changedFilesCount").default(0).notNull(),
  additions: int("additions").default(0).notNull(),
  deletions: int("deletions").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webhookDeliveries = mysqlTable("webhookDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  githubDeliveryId: varchar("githubDeliveryId", { length: 160 }).notNull().unique(),
  repositoryId: int("repositoryId"),
  eventName: varchar("eventName", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }),
  payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
  payload: json("payload"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  pullRequestRevisionId: int("pullRequestRevisionId").notNull(),
  jobId: varchar("jobId", { length: 240 }).notNull().unique(),
  status: mysqlEnum("status", ["QUEUED", "RUNNING", "COMPLETED", "PARTIAL", "FAILED", "STALE"]).default("QUEUED").notNull(),
  promptVersion: varchar("promptVersion", { length: 40 }),
  modelName: varchar("modelName", { length: 120 }),
  summary: text("summary"),
  overallRisk: varchar("overallRisk", { length: 32 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  latencyMs: int("latencyMs"),
  inputTokens: int("inputTokens"),
  outputTokens: int("outputTokens"),
  estimatedCost: varchar("estimatedCost", { length: 40 }),
  errorCode: varchar("errorCode", { length: 80 }),
  errorMessage: text("errorMessage"),
  precheckResults: json("precheckResults"),
  contextSources: json("contextSources"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const findings = mysqlTable("findings", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  severity: varchar("severity", { length: 32 }).notNull(),
  confidence: varchar("confidence", { length: 20 }).notNull(),
  filePath: text("filePath"),
  startLine: int("startLine"),
  endLine: int("endLine"),
  title: text("title").notNull(),
  evidence: text("evidence").notNull(),
  reasoning: text("reasoning").notNull(),
  recommendation: text("recommendation").notNull(),
  status: mysqlEnum("status", ["OPEN", "ACCEPTED", "DISMISSED", "INACCURATE"]).default("OPEN").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const findingFeedback = mysqlTable("findingFeedback", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  userId: int("userId").notNull(),
  feedback: mysqlEnum("feedback", ["Accept", "Dismiss", "Inaccurate"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  relatedAnalysisId: int("relatedAnalysisId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId"),
  userId: int("userId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  githubConnections: many(githubConnections),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  repositories: many(repositories),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Repository = typeof repositories.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Finding = typeof findings.$inferSelect;
