import { z } from "zod";

export const securityToolProvider = z.enum(["SEMGREP", "GITLEAKS", "TRIVY"]);
export type SecurityToolProvider = z.infer<typeof securityToolProvider>;
export const securityFindingSchema = z.object({ provider: securityToolProvider, ruleId: z.string(), filePath: z.string().optional(), line: z.number().int().positive().optional(), severity: z.enum(["critical", "high", "medium", "low", "info"]), message: z.string(), fingerprint: z.string() });
export type SecurityFinding = z.infer<typeof securityFindingSchema>;
export const dependencyFindingSchema = z.object({ packageName: z.string(), currentVersion: z.string().optional(), advisoryId: z.string(), severity: z.enum(["critical", "high", "medium", "low", "info"]), message: z.string(), fingerprint: z.string() });
export type DependencyFinding = z.infer<typeof dependencyFindingSchema>;
export function normalizeDependencyFinding(input: Omit<DependencyFinding, "fingerprint"> & { fingerprint?: string }): DependencyFinding { return dependencyFindingSchema.parse({ ...input, fingerprint: input.fingerprint || `dependency:${input.packageName}:${input.advisoryId}:${input.currentVersion || "unknown"}` }); }
export function normalizeSecurityFinding(input: Partial<SecurityFinding> & Pick<SecurityFinding, "provider" | "ruleId" | "severity" | "message">): SecurityFinding { const filePath = input.filePath || undefined; const fingerprint = input.fingerprint || `${input.provider}:${input.ruleId}:${filePath || "repository"}:${input.line || 0}:${input.message}`; return securityFindingSchema.parse({ ...input, filePath, fingerprint }); }
export function parseSecurityToolOutput(provider: SecurityToolProvider, payload: unknown): SecurityFinding[] { const records = Array.isArray(payload) ? payload : typeof payload === "object" && payload !== null && "findings" in payload && Array.isArray((payload as { findings: unknown[] }).findings) ? (payload as { findings: unknown[] }).findings : []; return records.flatMap(record => { if (typeof record !== "object" || record === null) return []; const item = record as Record<string, unknown>; const ruleId = String(item.ruleId || item.check_id || item.rule || "unknown"); const extra = typeof item.extra === "object" && item.extra !== null ? extraRecord(item.extra) : {}; const start = typeof item.start === "object" && item.start !== null ? extraRecord(item.start) : {}; const message = String(item.message || item.description || item.title || extra.message || "Security finding"); const severity = ["critical", "high", "medium", "low", "info"].includes(String(item.severity).toLowerCase()) ? String(item.severity).toLowerCase() as SecurityFinding["severity"] : "medium"; try { return [normalizeSecurityFinding({ provider, ruleId, message, severity, filePath: typeof item.filePath === "string" ? item.filePath : typeof item.path === "string" ? item.path : undefined, line: typeof item.line === "number" ? item.line : typeof start.line === "number" ? start.line : undefined })]; } catch { return []; } }); }
function extraRecord(value: object) { return value as Record<string, unknown>; }

export type NotificationProvider = "SLACK" | "EMAIL" | "TEAMS";
export function notificationAdapterStatus(provider: NotificationProvider, configured: boolean) { return { provider, configured, status: configured ? "READY" as const : "NOT_CONFIGURED" as const }; }
function validTarget(target: string | null | undefined) { if (!target) return false; try { const url = new URL(target); return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1"; } catch { return false; } }
export async function deliverNotification(provider: NotificationProvider, configured: boolean, target: string | null | undefined, message: string) {
  if (!configured || !target) return { provider, status: "NOT_CONFIGURED" as const, message: "Configure the provider target before sending notifications." };
  if (!validTarget(target)) return { provider, status: "INVALID_TARGET" as const, message: "Notification targets must be HTTPS webhook URLs or local development endpoints." };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const body = provider === "SLACK" ? { text: message } : provider === "TEAMS" ? { text: message, summary: "DevFlow AI notification" } : { to: target, subject: "DevFlow AI notification", text: message };
    const response = provider === "EMAIL" ? await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }) : await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    return { provider, status: response.ok ? "DELIVERED" as const : "FAILED" as const, httpStatus: response.status, message: response.ok ? "Notification delivered." : `Provider returned HTTP ${response.status}.` };
  } catch (error) { return { provider, status: "FAILED" as const, message: error instanceof Error && error.name === "AbortError" ? "Provider request timed out." : "Provider request failed safely." }; }
  finally { clearTimeout(timeout); }
}
