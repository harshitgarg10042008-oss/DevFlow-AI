import { invokeLLM } from "./_core/llm";
import { aiReviewSchema, type AIReview } from "@shared/devflow-contracts";
import { deterministicFingerprint, runDeterministicPrechecks, type ChangedFile } from "./prechecks";
import { CONTEXT_POLICY, consumeWorkspaceBudget, stableFindingFingerprint } from "./review-quality";

const PROMPT_VERSION = "v1.0";
const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "overallRisk", "findings", "filesAnalyzed", "contextSources", "modelMetadata"],
  properties: {
    summary: { type: "string" },
    overallRisk: { type: "string", enum: ["low", "medium", "high"] },
    filesAnalyzed: { type: "integer" },
    contextSources: { type: "array", items: { type: "string" } },
    modelMetadata: { type: "object", additionalProperties: false, required: ["model", "promptVersion"], properties: { model: { type: "string" }, promptVersion: { type: "string" }, estimatedCost: { type: "number" } } },
    findings: { type: "array", items: { type: "object", additionalProperties: false, required: ["category", "severity", "confidence", "title", "evidence", "reasoning", "recommendation"], properties: { category: { type: "string", enum: ["correctness", "security", "testing", "maintainability", "api", "performance", "deterministic"] }, severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] }, confidence: { type: "number" }, file: { type: ["string", "null"] }, startLine: { type: ["integer", "null"] }, endLine: { type: ["integer", "null"] }, title: { type: "string" }, evidence: { type: "string" }, reasoning: { type: "string" }, recommendation: { type: "string" } } } },
  },
} as const;

export function buildReviewContext(input: { diff: string; files: ChangedFile[]; nearbyTests: Record<string, string>; manifests: Record<string, string> }) {
  const boundedDiff = input.diff.slice(0, CONTEXT_POLICY.maxDiffChars);
  const fileContext = input.files.slice(0, CONTEXT_POLICY.maxChangedFiles).map(file => `FILE: ${file.filename}\nPATCH:\n${(file.patch || "").slice(0, CONTEXT_POLICY.maxPatchCharsPerFile)}`).join("\n\n");
  const testContext = Object.entries(input.nearbyTests).slice(0, CONTEXT_POLICY.maxNearbyTests).map(([name, content]) => `TEST: ${name}\n${content.slice(0, CONTEXT_POLICY.maxTestChars)}`).join("\n\n");
  const manifestContext = Object.entries(input.manifests).slice(0, CONTEXT_POLICY.maxManifests).map(([name, content]) => `MANIFEST: ${name}\n${content.slice(0, CONTEXT_POLICY.maxManifestChars)}`).join("\n\n");
  return { text: `PULL REQUEST DIFF:\n${boundedDiff}\n\nCHANGED FILES:\n${fileContext}\n\nNEARBY TESTS:\n${testContext}\n\nMANIFESTS:\n${manifestContext}`, sources: ["pull_request_diff", "changed_files", "nearby_tests", "manifests"], policy: CONTEXT_POLICY };
}

export async function runAIReview(input: { diff: string; files: ChangedFile[]; nearbyTests: Record<string, string>; manifests: Record<string, string>; additions: number; deletions: number; workspaceId?: number }): Promise<{ review: AIReview; prechecks: ReturnType<typeof runDeterministicPrechecks> }> {
  const prechecks = runDeterministicPrechecks(input.files, input.additions, input.deletions);
  const context = buildReviewContext(input);
  const deterministicFindings = prechecks.filter(item => !item.passed).map(item => ({ category: "deterministic" as const, severity: item.severity, confidence: 1, file: item.files[0] || null, startLine: null, endLine: null, title: item.message, evidence: item.files.length ? `Affected paths: ${item.files.join(", ")}` : item.message, reasoning: "This finding was produced by a deterministic pre-check before the LLM call.", recommendation: item.key === "missing_tests" ? "Add focused tests for the changed behavior." : item.message }));
  const estimatedTokens = Math.ceil(context.text.length / 4);
  if (input.workspaceId && !(await consumeWorkspaceBudget(input.workspaceId, estimatedTokens)).allowed) return { review: aiReviewSchema.parse({ summary: "Deterministic checks completed, but the workspace daily AI budget prevented an additional model call.", overallRisk: deterministicFindings.some(f => f.severity === "critical" || f.severity === "high") ? "high" : "medium", findings: deterministicFindings, filesAnalyzed: input.files.length, contextSources: [...context.sources, "budget_guard"], modelMetadata: { model: "budget-guard", promptVersion: PROMPT_VERSION } }), prechecks };
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are DevFlow AI, a careful senior code reviewer. Deterministic prechecks already cover test coverage, size, secrets, migrations, authorization-sensitive paths, and simple TypeScript hygiene. Use reasoning only for logic bugs, security edge cases, missing edge cases, API contracts, and performance tradeoffs. Only report actionable issues supported by the supplied evidence. Never invent files or line numbers. Return valid JSON matching the requested schema. It is acceptable to return zero findings." },
        { role: "user", content: `Review this pull request. Pre-check results: ${JSON.stringify(prechecks)}\n\n${context.text}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "devflow_review", strict: true, schema: responseSchema } },
    });
    const raw = response.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const parsed = aiReviewSchema.parse(JSON.parse(text));
    const merged = { ...parsed, findings: [...deterministicFindings, ...parsed.findings], contextSources: context.sources, modelMetadata: { ...parsed.modelMetadata, promptVersion: PROMPT_VERSION } };
    return { review: aiReviewSchema.parse(merged), prechecks };
  } catch (error) {
    const fallback: AIReview = { summary: "The deterministic checks completed, but the AI reviewer did not return a valid response. Retry the analysis when the model is available.", overallRisk: deterministicFindings.some(f => f.severity === "critical" || f.severity === "high") ? "high" : "medium", findings: deterministicFindings, filesAnalyzed: input.files.length, contextSources: context.sources, modelMetadata: { model: "unavailable", promptVersion: PROMPT_VERSION } };
    return { review: aiReviewSchema.parse(fallback), prechecks };
  }
}

export function normalizeReviewFindings(analysisId: number, findings: AIReview["findings"]) {
  return findings.map(item => ({ analysisId, fingerprint: stableFindingFingerprint({ category: item.category, filePath: item.file, title: item.title, evidence: item.evidence }), category: item.category, severity: item.severity, confidence: item.confidence.toFixed(3), filePath: item.file || null, startLine: item.startLine || null, endLine: item.endLine || null, title: item.title, evidence: item.evidence, reasoning: item.reasoning, recommendation: item.recommendation, status: "OPEN" as const }));
}
