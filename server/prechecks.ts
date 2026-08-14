import crypto from "node:crypto";
import { precheckResultSchema, type PrecheckResult } from "@shared/devflow-contracts";
import { deterministicPluginForFiles } from "./review-quality";

export type ChangedFile = { filename: string; patch?: string | null; status?: string; additions?: number; deletions?: number };

const testPattern = /(^|[./_-])(test|spec)([./_-]|$)|__tests__/i;
const secretPattern = /(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----|api[_-]?key\s*[:=]\s*["'][^"']{12,})/i;
const authPattern = /(auth|permission|authorization|acl|role|owner|access[_-]?control|middleware)/i;
const migrationPattern = /(migrations?|schema|prisma|drizzle|sequelize|typeorm|knex)/i;

export function runDeterministicPrechecks(files: ChangedFile[], additions: number, deletions: number): PrecheckResult[] {
  const names = files.map(file => file.filename);
  const hasTests = names.some(name => testPattern.test(name));
  const hasSecretPattern = files.some(file => secretPattern.test(`${file.filename}\n${file.patch || ""}`));
  const hasMigration = names.some(name => migrationPattern.test(name));
  const hasAuthSensitive = names.some(name => authPattern.test(name));
  const totalLines = additions + deletions;
  const results: PrecheckResult[] = [
    precheckResultSchema.parse({ key: "missing_tests", kind: "deterministic", passed: hasTests || files.length === 0, severity: "medium", message: hasTests ? "Test changes detected for this pull request." : "No test file changes were detected for the changed files.", files: names.filter(name => !testPattern.test(name)).slice(0, 20) }),
    precheckResultSchema.parse({ key: "large_pr", kind: "deterministic", passed: totalLines <= 600 && files.length <= 30, severity: totalLines > 1200 || files.length > 50 ? "high" : "medium", message: totalLines <= 600 && files.length <= 30 ? "Pull request size is within the review budget." : `Large pull request: ${totalLines} changed lines across ${files.length} files.`, files: names.slice(0, 20) }),
    precheckResultSchema.parse({ key: "secret_pattern", kind: "deterministic", passed: !hasSecretPattern, severity: hasSecretPattern ? "critical" : "info", message: hasSecretPattern ? "A possible secret exposure pattern was found in the diff." : "No known secret exposure patterns were detected.", files: files.filter(file => secretPattern.test(`${file.filename}\n${file.patch || ""}`)).map(file => file.filename) }),
    precheckResultSchema.parse({ key: "migration_schema", kind: "deterministic", passed: !hasMigration, severity: hasMigration ? "medium" : "info", message: hasMigration ? "Migration or schema-sensitive files changed; verify compatibility and rollback safety." : "No migration or schema-sensitive paths were detected.", files: names.filter(name => migrationPattern.test(name)) }),
    precheckResultSchema.parse({ key: "authorization_sensitive", kind: "deterministic", passed: !hasAuthSensitive, severity: hasAuthSensitive ? "medium" : "info", message: hasAuthSensitive ? "Authorization-sensitive paths changed; verify access control and negative tests." : "No authorization-sensitive paths were detected.", files: names.filter(name => authPattern.test(name)) }),
  ];
  const plugin = deterministicPluginForFiles(files);
  if (plugin) for (const result of plugin.run(files)) results.push(precheckResultSchema.parse({ ...result, kind: "deterministic" }));
  return results;
}

export function deterministicFingerprint(parts: string[]) { return crypto.createHash("sha256").update(parts.join("|")).digest("hex"); }
