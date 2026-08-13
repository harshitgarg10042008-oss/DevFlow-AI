import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySignature } from "./webhooks";

describe("GitHub webhook signature verification", () => {
  it("accepts the correct HMAC SHA-256 signature and rejects tampering", () => {
    const payload = Buffer.from(JSON.stringify({ action: "opened" }));
    const secret = "test-webhook-secret";
    const signature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
    expect(verifySignature(payload, signature, secret)).toBe(true);
    expect(verifySignature(Buffer.from(JSON.stringify({ action: "closed" })), signature, secret)).toBe(false);
    expect(verifySignature(payload, "sha256=invalid", secret)).toBe(false);
  });
});
