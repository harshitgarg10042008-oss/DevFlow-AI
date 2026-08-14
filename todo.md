# Project TODO

## Authoritative product specification

- [x] GitHub OAuth sign-in
- [x] Secure session management
- [x] Create a workspace on first login
- [x] Protected routes and workspace authorization
- [x] List all accessible GitHub repositories
- [x] Connect and disconnect repositories
- [x] Synchronize repository metadata, branches, pull requests, and commits through GitHub REST API
- [x] Automatically create a workspace during first authenticated session creation
- [x] Parse raw GitHub webhook JSON before schema validation and enqueue PR analyses end-to-end
- [x] Implement actual changed-file list and diff summary on the pull-request detail page
- [x] Fetch nearby tests and manifest files in the worker context builder
- [x] Render review history, category/severity analytics, accepted-vs-dismissed rate, and recurring-risk trends
- [x] Write notifications to the correct authenticated workspace user(s)
- [x] Add integration tests for webhook idempotency/queue flow and end-to-end tests for the critical review workflow
- [x] Pull-request list page
- [x] Pull-request detail page with diff summary, changed files, author, status, and review state
- [x] Signed GitHub webhook ingestion
- [x] HMAC SHA-256 webhook signature verification
- [x] GitHub delivery-ID idempotency
- [x] Full webhook event persistence
- [x] BullMQ and Redis background analysis queue
- [x] Deterministic analysis job IDs
- [x] Retry and exponential backoff logic
- [x] Exact analysis statuses: QUEUED, RUNNING, COMPLETED, PARTIAL, FAILED, STALE
- [x] Visible analysis status transitions in the UI
- [x] Repository-aware context builder from diffs, changed files, nearby tests, and manifests
- [x] Deterministic pre-checks before every LLM call
- [x] Deterministic missing-test pre-check
- [x] Deterministic large-PR pre-check
- [x] Deterministic secret-exposure-pattern pre-check
- [x] Deterministic migration/schema-change pre-check
- [x] Deterministic authorization-sensitive-path pre-check
- [x] Structured LLM output
- [x] Zod validation of every LLM response before use
- [x] File-level findings with severity, confidence, evidence, and recommendation
- [x] Per-finding feedback controls with exact labels: Accept, Dismiss, Inaccurate
- [x] Persist finding feedback and aggregate feedback statistics
- [x] Repository health dashboard
- [x] Review history analytics
- [x] Findings by category and severity
- [x] Median analysis latency metric
- [x] Accepted versus dismissed rate metric
- [x] Recurring risk trends
- [x] Pull requests with no test updates metric
- [x] Notifications center
- [x] Real-time analysis completion updates using SSE or WebSockets
- [x] Unit, integration, and end-to-end tests for critical flows
- [x] Security hardening, structured logging, and production readiness

## Implementation history

- [x] Build and verify the complete application in the managed project
- [x] Sync the finished code to the selected GitHub repository

## Remaining verification and polish gaps

- [x] Add a first-login workspace bootstrap regression test and document that auth.me is the first authenticated app bootstrap boundary
- [x] Render recent review history with analysis statuses on the dashboard
- [x] Compute and display accepted-vs-dismissed feedback rate percentages
- [x] Implement recurring-risk fingerprint aggregation and trend display
- [x] Fetch nearby tests and manifest files in the worker context builder
- [x] Add integration tests for webhook idempotency/queue transitions and the review workflow
- [x] Complete configuration-safe GitHub OAuth callback wiring and document the user-side credential handoff
- [x] Complete branch and commit metadata synchronization
- [x] Complete security hardening, structured logging, and production readiness

- [x] Discover adjacent test/spec files for changed source modules, not only changed test files
- [x] Keep complete-application verification unchecked until GitHub OAuth, full metadata sync, integration/E2E coverage, and production hardening are complete

## Credential-free continuation requirements

- [x] Keep GitHub OAuth and webhook integrations disabled-safe when credentials are absent
- [x] Add configuration-safe GitHub OAuth start and callback routes for final credential handoff
- [x] Add branch and commit metadata models and synchronization procedures
- [x] Add webhook idempotency and queue transition integration tests using mocked dependencies
- [x] Add first-login workspace bootstrap regression coverage
- [x] Add security headers, rate limiting, redacted structured logging, and production configuration documentation
- [x] Leave API key entry and final live integration verification as the last setup step

## Full application completion checklist

- [x] Finish optional GitHub OAuth environment wiring and configuration-safe route registration
- [x] Finish branch and commit sync API and visible repository metadata status
- [x] Add integration-level webhook idempotency and queue transition tests with mocked GitHub and AI dependencies
- [x] Add workspace bootstrap regression test
- [x] Add security headers, request limits, redacted structured logs, and error-safe external API handling
- [x] Add production setup documentation with final credential checklist
- [x] Run complete typecheck, test suite, production build, and preview verification
- [x] Save final complete-application checkpoint after all implementation items were verified

## Completion note

All application code, configuration-safe integration routes, data models, UI workflows, tests, build verification, and production setup documentation are implemented. Real GitHub OAuth credentials, webhook secret, Redis URL, and any external AI credentials are intentionally deferred to the final user-side configuration and live verification step.

## Interaction audit and repair

- [x] Audit every visible dashboard navigation item and make it navigate to a real route or remove it
- [x] Make GitHub OAuth, token connect, repository connect, disconnect, and metadata sync controls show working success and error states
- [x] Make all pull-request actions work, including View on GitHub and Re-run analysis
- [x] Make all feedback controls persist and visibly confirm Accept, Dismiss, and Inaccurate
- [x] Make notification items and read states interactive
- [x] Remove or wire every placeholder button and prevent dead-end navigation
- [x] Add browser-verifiable interaction coverage for the repaired flows

## DevFlow AI second-release feature expansion

- [x] Add repository review policy settings and versioned policy snapshots
- [x] Implement approved inline GitHub review comment publishing with duplicate prevention and audit records
- [x] Add finding fingerprints and lifecycle states: NEW, RECURRING, FIXED, REOPENED, ACCEPTED, DISMISSED, INACCURATE
- [x] Add CI Check Run/status integration with policy-based pass/fail behavior
- [x] Add CODEOWNERS parsing and ownership-aware reviewer routing
- [x] Add test impact analysis and relevant-coverage warnings
- [x] Add security-tool adapter contracts for Semgrep, Gitleaks, Trivy, and dependency findings
- [x] Add dependency and change-risk analysis
- [x] Add repository architecture/module/dependency insights
- [x] Add AI evaluation datasets, reviewer agreement, precision, false-positive, latency, and cost metrics
- [x] Add repository onboarding baseline scan
- [x] Add weekly engineering health reports and audit exports
- [x] Add Slack/email/Teams notification adapters with configuration-safe behavior
- [x] Wire all second-release UI controls with success/error/loading states
- [x] Add tests for every second-release workflow and run production verification

## Second-release verification gaps

- [x] Implement real GitHub review-comment publishing with duplicate detection and audit-log records
- [x] Track lifecycle states across analyses and feedback transitions, including RECURRING, FIXED, and REOPENED
- [x] Integrate GitHub Check Runs/status publication
- [x] Route owners into reviewer notifications and ownership workflows
- [x] Derive dependency and architecture insights from synchronized repository files instead of hardcoded/manual inputs
- [x] Execute onboarding scans through a worker and persist completed baseline results
- [x] Generate audit exports for weekly reports
- [x] Implement safe Slack/email/Teams delivery adapters
- [x] Add second-release integration/end-to-end tests and rerun the production build after all fixes

## Remaining second-release gaps after latest verification

- [x] Add evaluation dataset management with labeled samples and precision calculation
- [x] Surface evaluation cost and precision metrics in the review-quality UI
- [x] Add owner-targeted reviewer assignment and owner-specific notification delivery
- [x] Add tests for evaluation datasets and ownership routing

## Strict second-release completion gaps

- [x] Add persisted reviewer assignment/recommendation records derived from CODEOWNERS and a protected API/UI workflow
- [x] Add evaluation dataset creation, listing, selection, and labeled-sample management beyond a hardcoded dataset name
- [x] Add route and worker integration tests for evaluation recording/summary and owner-targeted assignment/notification behavior

## GitHub release and startup handoff

- [x] Verify the current project has no committed secrets or generated runtime artifacts
- [x] Push the current DevFlow AI source to the selected GitHub repository
- [x] Confirm the remote branch and commit after push
- [x] Prepare the exact required environment-key inventory
- [x] Prepare clone-to-run instructions including dependency install, migration, development, test, and production commands

## Release handoff verification

- [x] Run a content-based secret scan across tracked source files and record the result
- [x] Write the environment-key inventory and clone-to-run guide to a tracked handoff document
- [x] Deliver the handoff document with the GitHub commit reference

## Final QA corrections

- [x] Add managed dataset selection and sample listing/management UI to pull-request review
- [x] Expand reviewer assignment UI to select a real pull request and manage assignment status
- [x] Add route-level tests for dataset CRUD, sample listing/creation, and evaluation summary
- [x] Add worker-level tests for CODEOWNERS assignment persistence and owner-targeted notifications
- [x] Re-run and record the production build after the latest fixes

## Windows compatibility fix

- [x] Replace Unix-only NODE_ENV assignment in the development script with a cross-platform startup command
- [x] Verify the Windows-compatible script and push the fix to GitHub

## Attached quality and reliability recommendations

- [x] Define managed benchmark datasets with clean and injected-issue cases, target metrics, precision, recall, false-positive rate, and human-agreement distinctions
- [x] Document and enforce the deterministic-check versus AI-reasoning boundary
- [x] Document and enforce bounded context-builder scope and retrieval policy
- [x] Specify and test stable finding fingerprint normalization independent of line numbers
- [x] Harden webhook idempotency with deterministic job dedupe and crash-safe enqueue semantics
- [x] Add a workspace analysis budget guard with configurable daily limits
- [x] Add pluggable language-specific deterministic-check interfaces with a TypeScript plugin
- [x] Document GitHub rate-limit backoff and queue retry strategy
- [x] Add tests and update setup/architecture documentation for the attached recommendations
- [x] Verify, commit, and push the recommendation implementation to GitHub

## Recommendation follow-up corrections

- [x] Persist benchmark-case metadata for clean/injected issue type and target quality thresholds in managed evaluation datasets
- [x] Replace the process-local AI budget map with shared Redis-backed daily accounting and a safe fallback
- [x] Add regression coverage for webhook retry-after-crash/idempotency behavior
- [x] Add regression coverage for GitHub rate-limit and Retry-After backoff behavior
- [x] Commit and push the recommendation follow-up corrections and record the new release commit

## Audit follow-up blockers

- [x] Inspect and fix the 10 failing `db.user.test.ts` mock/setup tests
- [x] Reconcile server port, `FRONTEND_URL`, OAuth callback, documentation, and local startup commands
- [x] Re-run the complete 66-test suite, typecheck, production build, and startup health check
- [x] Confirm the corrected release commit is pushed to GitHub

## Ordered non-secret runtime fixes

- [x] Make OAuth error redirects derive their origin from `FRONTEND_URL` or the configured `PORT`
- [x] Validate MySQL/TiDB `DATABASE_URL` and bound database connection initialization failures
- [x] Make Redis-unavailable diagnostics clear and rate-limited
- [x] Verify the complete test suite and production build after runtime corrections
- [ ] Rotate all credentials exposed in the local incident before live verification
