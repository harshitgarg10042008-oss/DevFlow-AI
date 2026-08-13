import { invokeLLM } from "./_core/llm";
import { aiReviewSchema, type AIReview } from "@shared/devflow-contracts";
import { deterministicFingerprint, runDeterministicPrechecks, type ChangedFile } from "./prechecks";

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
  const boundedDiff = input.diff.slice(0, 60_000);
  const fileContext = input.files.slice(0, 30).map(file => `FILE: ${file.filename}\nPATCH:\n${(file.patch || "").slice(0, 8_000)}`).join("\n\n");
  const testContext = Object.entries(input.nearbyTests).slice(0, 8).map(([name, content]) => `TEST: ${name}\n${content.slice(0, 5_000)}`).join("\n\n");
  const manifestContext = Object.entries(input.manifests).map(([name, content]) => `MANIFEST: ${name}\n${content.slice(0, 4_000)}`).join("\n\n");
  return { text: `PULL REQUEST DIFF:\n${boundedDiff}\n\nCHANGED FILES:\n${fileContext}\n\nNEARBY TESTS:\n${testContext}\n\nMANIFESTS:\n${manifestContext}`, sources: ["pull_request_diff", "changed_files", "nearby_tests", "manifests"] };
}

export async function runAIReview(input: { diff: string; files: ChangedFile[]; nearbyTests: Record<string, string>; manifests: Record<string, string>; additions: number; deletions: number }): Promise<{ review: AIReview; prechecks: ReturnType<typeof runDeterministicPrechecks> }> {
  const prechecks = runDeterministicPrechecks(input.files, input.additions, input.deletions);
  const context = buildReviewContext(input);
  const deterministicFindings = prechecks.filter(item => !item.passed).map(item => ({ category: "deterministic" as const, severity: item.severity, confidence: 1, file: item.files[0] || null, startLine: null, endLine: null, title: item.message, evidence: item.files.length ? `Affected paths: ${item.files.join(", ")}` : item.message, reasoning: "This finding was produced by a deterministic pre-check before the LLM call.", recommendation: item.key === "missing_tests" ? "Add focused tests for the changed behavior." : item.message }));
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are DevFlow AI, a careful senior code reviewer. Only report actionable issues supported by the supplied evidence. Never invent files or line numbers. Return valid JSON matching the requested schema. It is acceptable to return zero findings." },
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
  return findings.map(item => ({ analysisId, fingerprint: deterministicFingerprint([item.category, item.file || "", item.title, item.evidence]), category: item.category, severity: item.severity, confidence: item.confidence.toFixed(3), filePath: item.file || null, startLine: item.startLine || null, endLine: item.endLine || null, title: item.title, evidence: item.evidence, reasoning: item.reasoning, recommendation: item.recommendation, status: "OPEN" as const }));
}
