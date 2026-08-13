import type { Request, Response, NextFunction } from "express";

const buckets = new Map<string, { startedAt: number; count: number }>();
export function rateLimit(limit: number, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const now = Date.now(); const current = buckets.get(key);
    if (!current || now - current.startedAt >= windowMs) buckets.set(key, { startedAt: now, count: 1 });
    else current.count += 1;
    const bucket = buckets.get(key)!; res.setHeader("x-rate-limit-limit", String(limit)); res.setHeader("x-rate-limit-remaining", String(Math.max(0, limit - bucket.count)));
    if (bucket.count > limit) return res.status(429).json({ error: "Too many requests", retryAfterMs: Math.max(0, windowMs - (now - bucket.startedAt)) });
    next();
  };
}
