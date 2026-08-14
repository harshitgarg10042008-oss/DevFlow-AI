import Redis from "ioredis";
import { ENV } from "./_core/env";

const localState = new Map<string, number>();
let redis: Redis | undefined;
function getRedis() { if (!ENV.redisUrl) return undefined; if (!redis) redis = new Redis(ENV.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false }); return redis; }
function keyFor(workspaceId: number) { return `devflow:ai-budget:${workspaceId}:${new Date().toISOString().slice(0, 10)}`; }
export async function consumeSharedWorkspaceBudget(workspaceId: number, estimatedTokens: number, dailyCap = ENV.aiDailyTokenCap) { const key = keyFor(workspaceId); const client = getRedis(); if (client) { try { const used = Number(await client.incrby(key, estimatedTokens)); if (used === estimatedTokens) await client.expire(key, 172800); if (used > dailyCap) { await client.decrby(key, estimatedTokens); return { allowed: false, usedTokens: Math.max(0, used - estimatedTokens), remainingTokens: 0, dailyCap, source: "redis" as const }; } return { allowed: true, usedTokens: used, remainingTokens: Math.max(0, dailyCap - used), dailyCap, source: "redis" as const }; } catch { /* fall through to credential-free local mode */ } }
  const used = localState.get(key) || 0; if (used + estimatedTokens > dailyCap) return { allowed: false, usedTokens: used, remainingTokens: Math.max(0, dailyCap - used), dailyCap, source: "local" as const }; localState.set(key, used + estimatedTokens); return { allowed: true, usedTokens: used + estimatedTokens, remainingTokens: Math.max(0, dailyCap - used - estimatedTokens), dailyCap, source: "local" as const };
}
