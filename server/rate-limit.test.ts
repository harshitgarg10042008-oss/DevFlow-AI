import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("returns 429 after the configured request budget is exceeded", () => {
    const middleware = rateLimit(1, 60_000);
    const req = { path: "/test", ip: "127.0.0.10", socket: { remoteAddress: "127.0.0.10" } } as any;
    const headers: Record<string, string> = {};
    const res = { setHeader: (key: string, value: string) => { headers[key] = value; }, status: (code: number) => ({ json: (body: unknown) => ({ code, body }) }) } as any;
    let nextCalls = 0;
    middleware(req, res, () => { nextCalls += 1; });
    const blocked = middleware(req, res, () => { nextCalls += 1; });
    expect(blocked).toEqual({ code: 429, body: expect.objectContaining({ error: "Too many requests" }) });
    expect(nextCalls).toBe(1);
    expect(headers["x-rate-limit-limit"]).toBe("1");
  });
});
