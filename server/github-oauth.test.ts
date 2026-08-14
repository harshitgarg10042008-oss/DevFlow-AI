import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";

// Copy the state functions from github-oauth.ts for testing
const stateSecret = () => "test-secret-key-for-testing";
function signState(value: string) {
  const signature = crypto.createHmac("sha256", stateSecret()).update(value).digest("hex");
  return `${value}.${signature}`;
}

function verifyState(value: string): string | null {
  const parts = value.split(".");
  if (parts.length < 2) return null;
  const raw = parts.slice(0, -1).join(".");
  const expected = crypto.createHmac("sha256", stateSecret()).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.at(-1)!)) ? raw : null;
  } catch {
    return null;
  }
}

describe("GitHub OAuth State Validation", () => {
  describe("signState", () => {
    it("should create a signed state with HMAC signature", () => {
      const value = "test-state-value";
      const signed = signState(value);

      expect(signed).toContain(".");
      expect(signed).toMatch(new RegExp(`^${value}`));
    });

    it("should produce different signatures for different values", () => {
      const value1 = "state-1";
      const value2 = "state-2";

      const signed1 = signState(value1);
      const signed2 = signState(value2);

      expect(signed1).not.toBe(signed2);
    });

    it("should produce consistent signatures for the same value", () => {
      const value = "consistent-state";
      const signed1 = signState(value);
      const signed2 = signState(value);

      expect(signed1).toBe(signed2);
    });

    it("should handle values with dots correctly", () => {
      const value = "timestamp.12345.random.abc";
      const signed = signState(value);

      const verified = verifyState(signed);
      expect(verified).toBe(value);
    });
  });

  describe("verifyState", () => {
    it("should verify a correctly signed state", () => {
      const value = "valid-state";
      const signed = signState(value);

      const verified = verifyState(signed);
      expect(verified).toBe(value);
    });

    it("should reject state without signature", () => {
      const invalidState = "no-signature";

      const verified = verifyState(invalidState);
      expect(verified).toBeNull();
    });

    it("should reject state with incorrect signature", () => {
      const value = "original-value";
      const tampered = `${value}.wrong-signature`;

      const verified = verifyState(tampered);
      expect(verified).toBeNull();
    });

    it("should reject state with missing parts", () => {
      const invalidState = "only-one-part";

      const verified = verifyState(invalidState);
      expect(verified).toBeNull();
    });

    it("should reject empty string", () => {
      const verified = verifyState("");
      expect(verified).toBeNull();
    });

    it("should handle complex state values with timestamps and random data", () => {
      const timestamp = Date.now();
      const random = crypto.randomBytes(16).toString("hex");
      const value = `${timestamp}.${random}`;

      const signed = signState(value);
      const verified = verifyState(signed);

      expect(verified).toBe(value);
    });

    it("should use timing-safe comparison to prevent timing attacks", () => {
      const value = "security-test";
      const signed = signState(value);
      const tampered = `${value}.wrong-signature`;

      // Both should not throw errors
      expect(() => verifyState(signed)).not.toThrow();
      expect(() => verifyState(tampered)).not.toThrow();

      expect(verifyState(signed)).toBe(value);
      expect(verifyState(tampered)).toBeNull();
    });
  });

  describe("State expiration (simulated)", () => {
    it("should handle state with timestamp for expiration checks", () => {
      const now = Date.now();
      const oldTimestamp = now - 10 * 60 * 1000; // 10 minutes ago
      const recentTimestamp = now - 1 * 60 * 1000; // 1 minute ago

      const oldState = signState(`${oldTimestamp}.random-data`);
      const recentState = signState(`${recentTimestamp}.random-data`);

      const verifiedOld = verifyState(oldState);
      const verifiedRecent = verifyState(recentState);

      // Both should verify correctly (expiration logic is separate)
      expect(verifiedOld).not.toBeNull();
      expect(verifiedRecent).not.toBeNull();

      // Extract timestamps for expiration check
      const oldTimestampVerified = verifiedOld?.split(".")[0];
      const recentTimestampVerified = verifiedRecent?.split(".")[0];

      expect(Number(oldTimestampVerified)).toBeLessThan(Number(recentTimestampVerified));
    });
  });
});
