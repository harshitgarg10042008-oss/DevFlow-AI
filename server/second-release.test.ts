import { describe, expect, it } from "vitest";
import { architectureModules, deriveFindingLifecycle, findingFingerprint, impactedTests, normalizePolicy, ownerMatches, parseCodeowners, policyBlocksFindings, safeExternalAdapter } from "./second-release";

describe("second-release domain logic", () => {
  it("normalizes policies and deterministically blocks findings", () => {
    const policy = normalizePolicy({ minimumBlockingSeverity: "high", blockOnSecrets: true });
    expect(policy.maximumPrSize).toBe(800);
    expect(policyBlocksFindings(policy, [{ severity: "high", category: "security" }, { severity: "low", category: "testing" }])).toHaveLength(1);
  });
  it("creates stable fingerprints and lifecycle states", () => {
    const input = { category: "security", filePath: "src/auth.ts", title: "Missing ownership check", evidence: "line 42" };
    expect(findingFingerprint(input)).toBe(findingFingerprint(input));
    expect(deriveFindingLifecycle(undefined, findingFingerprint(input))).toBe("NEW");
    expect(deriveFindingLifecycle({ fingerprint: findingFingerprint(input) }, findingFingerprint(input))).toBe("RECURRING");
  });
  it("parses ownership and matches repository paths", () => {
    const owners = parseCodeowners("/src/api/** @platform\n*.tsx @frontend\n# comment");
    expect(owners).toHaveLength(2);
    expect(ownerMatches("/src/api/**", "/src/api/users.ts")).toBe(true);
  });
  it("finds impacted tests and architecture modules", () => {
    expect(impactedTests(["src/auth.ts"], ["src/auth.test.ts"])[0]?.coverageAvailable).toBe(true);
    expect(architectureModules(["src/auth.ts", "server/routers.ts"])).toHaveLength(2);
  });
  it("fails external adapters safely when unconfigured", () => {
    expect(safeExternalAdapter("SLACK", false)).toMatchObject({ status: "NOT_CONFIGURED", enabled: false });
  });
});
