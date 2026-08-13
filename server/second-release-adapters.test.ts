import { describe, expect, it } from "vitest";
import { normalizeDependencyFinding, normalizeSecurityFinding, notificationAdapterStatus, parseSecurityToolOutput } from "./security-and-notifications";
import { evaluationPrecision, ownerMatches, parseCodeowners, selectOwnerRecipientIds } from "./second-release";

describe("second-release adapters", () => {
  it("normalizes security-tool findings deterministically", () => {
    const findings = parseSecurityToolOutput("SEMGREP", [{ check_id: "python.lang.security", path: "server/auth.ts", start: { line: 12 }, extra: { message: "Authorization check" }, severity: "high" }]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ provider: "SEMGREP", ruleId: "python.lang.security", severity: "high", filePath: "server/auth.ts" });
    expect(findings[0]?.fingerprint).toBe(normalizeSecurityFinding({ provider: "SEMGREP", ruleId: "python.lang.security", severity: "high", filePath: "server/auth.ts", line: 12, message: "Authorization check" }).fingerprint);
  });

  it("normalizes dependency vulnerability findings", () => {
    expect(normalizeDependencyFinding({ packageName: "lodash", currentVersion: "4.17.20", advisoryId: "GHSA-test", severity: "high", message: "Upgrade dependency" })).toMatchObject({ packageName: "lodash", advisoryId: "GHSA-test", severity: "high" });
  });

  it("keeps notification providers safe when not configured", () => {
    expect(notificationAdapterStatus("SLACK", false)).toEqual({ provider: "SLACK", configured: false, status: "NOT_CONFIGURED" });
  });

  it("calculates labeled evaluation precision", () => {
    expect(evaluationPrecision([{ reviewerLabel: "high", modelLabel: "high" }, { reviewerLabel: "low", modelLabel: "high" }, { reviewerLabel: null, modelLabel: "medium" }])).toBe(50);
  });

  it("targets matching workspace owners and falls back safely", () => {
    expect(selectOwnerRecipientIds(["backend"], [{ userId: 7, name: "Backend Team", email: "backend@example.com" }, { userId: 8, name: "Frontend", email: "front@example.com" }], [7, 8])).toEqual([7]);
    expect(selectOwnerRecipientIds(["unknown"], [{ userId: 7, name: "Backend Team", email: "backend@example.com" }], [7, 8])).toEqual([7, 8]);
  });

  it("matches CODEOWNERS rules to changed files", () => {
    const rules = parseCodeowners("server/** @backend\nclient/** @frontend");
    expect(rules).toHaveLength(2);
    expect(rules.filter(rule => ownerMatches(rule.pattern, "server/routers.ts")).map(rule => rule.owner)).toEqual(["@backend"]);
  });
});
