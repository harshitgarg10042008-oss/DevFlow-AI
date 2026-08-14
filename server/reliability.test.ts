import { describe, expect, it } from "vitest";
import { withGithubBackoff } from "./github";
import { shouldRetryWebhookDelivery } from "./webhooks";

describe("reliability controls", () => {
  it("retries an unprocessed delivery after a crash but not a processed delivery", () => {
    expect(shouldRetryWebhookDelivery({ id: 4, processedAt: null })).toBe(true);
    expect(shouldRetryWebhookDelivery({ id: 4, processedAt: new Date() })).toBe(false);
    expect(shouldRetryWebhookDelivery(undefined)).toBe(false);
  });

  it("honors Retry-After during GitHub backoff", async () => {
    let calls = 0;
    const waits: number[] = [];
    const result = await withGithubBackoff(async () => { calls++; if (calls === 1) throw { status: 429, response: { headers: { "retry-after": "2" } } }; return "ok"; }, 2, async ms => { waits.push(ms); });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(waits).toEqual([2000]);
  });
});
