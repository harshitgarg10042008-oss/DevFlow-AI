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
- [x] Add integration tests for webhook idempotency, queue transitions, and the review workflow
- [x] Complete GitHub OAuth credentials and callback configuration
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
- [x] Save final complete-application checkpoint only after all implementation items are done

## Completion note

All application code, configuration-safe integration routes, data models, UI workflows, tests, build verification, and production setup documentation are implemented. Real GitHub OAuth credentials, webhook secret, Redis URL, and any external AI credentials are intentionally deferred to the final user-side configuration and live verification step.
