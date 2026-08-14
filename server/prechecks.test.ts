import { describe, expect, it } from "vitest";
import { deterministicFingerprint } from "./prechecks";
import { runDeterministicPrechecks } from "./prechecks";

const files = [{ filename: "src/auth/permissions.ts", patch: `+ const apiKey = '${["AKIA", "1234567890ABCDEF"].join("")}';\n+ updateRecord(id, payload);` }];

describe("DevFlow deterministic pre-checks", () => {
  it("detects required risk categories deterministically", () => {
    const results = runDeterministicPrechecks(files, 900, 120);
    expect(results.map(result => result.key)).toEqual(["missing_tests", "large_pr", "secret_pattern", "migration_schema", "authorization_sensitive", "console_log"]);
    expect(results.find(result => result.key === "secret_pattern")?.passed).toBe(false);
    expect(results.find(result => result.key === "authorization_sensitive")?.passed).toBe(false);
    expect(results.find(result => result.key === "large_pr")?.passed).toBe(false);
  });

  it("returns the same fingerprint for the same finding inputs", () => {
    const first = deterministicFingerprint(["security", "src/auth/permissions.ts", "ownership", "missing predicate"]);
    const second = deterministicFingerprint(["security", "src/auth/permissions.ts", "ownership", "missing predicate"]);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});
