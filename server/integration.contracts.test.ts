import { describe, expect, it } from "vitest";
import { deterministicJobId } from "./queue";
import { verifySignature } from "./webhooks";

describe("DevFlow integration contracts", () => {
  it("uses a stable job ID for the same repository pull-request revision", () => {
    expect(deterministicJobId(7, 42, "abc123")).toBe("analysis:7:pr-42:abc123");
    expect(deterministicJobId(7, 42, "abc123")).toBe(deterministicJobId(7, 42, "abc123"));
    expect(deterministicJobId(7, 42, "abc123")).not.toBe(deterministicJobId(7, 42, "def456"));
  });

  it("rejects webhook requests when the signing secret or signature is unavailable", () => {
    expect(verifySignature(Buffer.from("{}"), undefined, "test-secret")).toBe(false);
    expect(verifySignature(Buffer.from("{}"), "sha256=invalid", "test-secret")).toBe(false);
  });
});
