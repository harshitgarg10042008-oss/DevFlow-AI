import { describe, expect, it } from "vitest";
import { CONTEXT_POLICY, consumeWorkspaceBudget, evaluateBenchmark, stableFindingFingerprint, typescriptDeterministicPlugin } from "./review-quality";

describe("review quality controls", () => {
  it("keeps fingerprints stable when line numbers shift and whitespace changes", () => {
    expect(stableFindingFingerprint({ category: "correctness", filePath: "src\\a.ts", title: "Bug", evidence: "const  value = 1; // line 42" })).toBe(stableFindingFingerprint({ category: "correctness", filePath: "src/a.ts", title: "Bug", evidence: "const value = 1; // line 99" }));
  });

  it("calculates precision, recall, and clean-case false positives", () => {
    const result = evaluateBenchmark([{ id: "bug", description: "known bug", clean: false, expectedFindingCategories: ["correctness"] }, { id: "clean", description: "clean PR", clean: true, expectedFindingCategories: [] }], [{ caseId: "bug", category: "correctness" }, { caseId: "clean", category: "performance" }]);
    expect(result.truePositives).toBe(1);
    expect(result.falsePositives).toBe(2);
    expect(result.precision).toBeCloseTo(1 / 3);
    expect(result.recall).toBe(1);
    expect(result.falsePositiveRate).toBe(1);
  });

  it("bounds context and workspace token spend", async () => {
    expect(CONTEXT_POLICY.maxChangedFiles).toBe(30);
    const workspace = 991234;
    expect((await consumeWorkspaceBudget(workspace, 10, 10)).allowed).toBe(true);
    expect((await consumeWorkspaceBudget(workspace, 1, 10)).allowed).toBe(false);
  });

  it("runs TypeScript-specific deterministic checks", () => {
    const result = typescriptDeterministicPlugin.run([{ filename: "src/a.ts", patch: "+ console.log(value)" }]);
    expect(result[0]?.key).toBe("console_log");
    expect(result[0]?.passed).toBe(false);
  });
});
