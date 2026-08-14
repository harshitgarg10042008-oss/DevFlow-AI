# DevFlow AI: Setup and Operations Guide

DevFlow AI is an evidence-based GitHub pull-request intelligence platform. The repository contains the React dashboard, tRPC API, Drizzle schema, signed GitHub webhook ingestion, deterministic pre-checks, repository-aware review pipeline, BullMQ-compatible analysis lifecycle, review policies, finding lifecycle tracking, CODEOWNERS routing, architecture insights, CI Check Run and inline-comment adapters, health analytics, notifications, onboarding scans, audit exports, and integration-test controls.

## Repository and release reference

The source is available at [harshitgarg10042008-oss/DevFlow-AI](https://github.com/harshitgarg10042008-oss/DevFlow-AI). The current pushed release is commit `35952a4` on `main`.

> Never commit `.env` files, access tokens, private keys, database credentials, or webhook secrets. Supply runtime values through the environment of the machine or hosting platform.

## Prerequisites

Use Node.js 22 or a compatible current LTS release, pnpm 10, a MySQL-compatible database, and Redis when running the distributed BullMQ worker mode. GitHub OAuth and webhooks are optional during initial development because the application deliberately falls back to safe configuration-aware adapters when external credentials are absent.

## Environment-key inventory

The following variables are read by the application. Values marked **required for the selected mode** must be supplied for that mode; optional integrations can remain empty while developing the dashboard and deterministic review flows.

| Variable | Required for | Purpose | Example shape |
|---|---|---|---|
| `DATABASE_URL` | All persistent runs | MySQL/TiDB connection string used by Drizzle ORM | `mysql://user:password@host:3306/devflow` |
| `JWT_SECRET` | All authenticated runs | Signs application sessions and GitHub OAuth state | Long random secret, 32+ bytes |
| `VITE_APP_ID` | Manus-authenticated deployment | Manus OAuth application identifier | Platform-provided value |
| `OAUTH_SERVER_URL` | Manus-authenticated deployment | Manus OAuth backend base URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Browser login | Frontend Manus login portal URL | Platform-provided value |
| `OWNER_OPEN_ID` | Owner-scoped platform features | Owner identity used by the template | Platform-provided value |
| `OWNER_NAME` | Owner-scoped platform features | Display name for the project owner | Platform-provided value |
| `BUILT_IN_FORGE_API_URL` | Built-in AI/notification adapters | Manus built-in API endpoint | Platform-provided value |
| `BUILT_IN_FORGE_API_KEY` | Built-in AI/notification adapters | Server-side bearer credential for built-in APIs | Platform-provided value |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend built-in integrations | Browser-safe built-in API endpoint | Platform-provided value |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend built-in integrations | Browser-safe built-in API credential | Platform-provided value |
| `GITHUB_CLIENT_ID` | GitHub OAuth connect flow | GitHub OAuth App client ID | GitHub OAuth App value |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth callback | GitHub OAuth App client secret | GitHub OAuth App secret |
| `GITHUB_OAUTH_REDIRECT_URI` | GitHub OAuth connect flow | Exact callback URL registered in GitHub | `http://localhost:3000/api/github/oauth/callback` |
| `GITHUB_WEBHOOK_SECRET` | Signed GitHub webhook verification | HMAC SHA-256 webhook signing secret | Random secret shared with GitHub |
| `REDIS_URL` | Distributed background workers | Redis connection used by BullMQ | `redis://localhost:6379` or TLS URL |
| `DEVFLOW_AI_MODEL` | Optional AI model selection | Overrides the built-in model selection label | `built-in-default` |

The platform-provided Manus variables are automatically injected in the managed WebDev environment. For a standalone clone, configure the platform auth variables only if you intend to use Manus OAuth; otherwise use the application’s credential-free development mode and provide the database plus `JWT_SECRET` first. GitHub and Redis are not needed to inspect the dashboard or run deterministic tests, but they are needed for live repository connection, webhook processing, and distributed analysis.

## GitHub OAuth and webhook configuration

Create a GitHub OAuth App and set its authorization callback to the value of `GITHUB_OAUTH_REDIRECT_URI`. For local development, use `http://localhost:3000/api/github/oauth/callback`; for a deployed site, use the deployed HTTPS origin followed by `/api/github/oauth/callback`. The application starts OAuth at `/api/github/oauth/start` and completes it at `/api/github/oauth/callback`.

For repository webhooks, create a webhook whose payload URL is `https://YOUR_HOST/api/webhooks/github`, choose the JSON content type, and set the same random value in GitHub’s secret field and `GITHUB_WEBHOOK_SECRET`. The server verifies the `X-Hub-Signature-256` HMAC header and uses delivery IDs for idempotency. Do not expose the webhook secret to the browser.

## Clone and install

```bash
git clone https://github.com/harshitgarg10042008-oss/DevFlow-AI.git
cd DevFlow-AI
pnpm install
```

The repository intentionally does not contain real credentials. Create a local `.env` file from the inventory above and keep it untracked. If an `.env.example` file is not present in the checkout, create `.env` directly; the server reads the variables from the process environment supplied by the runtime. **This project uses the MySQL/TiDB driver, so `DATABASE_URL` must begin with `mysql://`; PostgreSQL URLs are not supported.**

## Database and local services

Start MySQL and Redis using your preferred local tools, then set `DATABASE_URL`, `JWT_SECRET`, and `REDIS_URL`. Apply the current Drizzle schema with:

```bash
pnpm db:push
```

`db:push` generates any pending Drizzle migration and applies migrations to the configured database. Use a disposable development database when experimenting with schema changes. Do not run destructive SQL against a production database without a backup and review.

## Run, test, and build

Start the development server with hot reload:

```bash
pnpm dev
```

The application serves the dashboard at `http://localhost:${PORT}` (use the `PORT` value from `.env`; if omitted, the default is `3000`). Validate types and run the test suite with:

```bash
pnpm check
pnpm test
```

Create the production bundle and start it with:

```bash
pnpm build
pnpm start
```

The server obtains its port from the hosting environment; do not hardcode a production port. In distributed mode, run the web process and the analysis worker according to the deployment platform’s process model. The queue implementation uses inline-safe behavior when Redis is unavailable, so a credential-free local run remains usable for deterministic and configuration-safe workflows.

## First-run validation

After starting the server, open the dashboard and confirm that navigation reaches the repository, pull-request, health, notifications, and advanced-control sections. Without GitHub credentials, confirm that the UI presents a clear configuration state rather than a broken interaction. With GitHub credentials configured, connect a repository, run synchronization, open a pull request, trigger analysis, review findings, submit finding feedback, and verify that notification actions mark items read. For webhook validation, send a signed test delivery from GitHub and confirm that duplicate delivery IDs do not create duplicate analysis jobs.

## Current limitations and production hardening

The pushed release is feature-complete in credential-free mode, but live GitHub OAuth, GitHub webhook delivery, Redis-backed workers, and external AI behavior require the corresponding runtime values. Reviewer assignments are persisted from CODEOWNERS routing and can be managed from the control room; evaluation datasets can be created, selected, and populated with labeled samples; and Slack, email, and Teams adapters fail safely until valid HTTPS targets are configured. Before production rollout, configure observability, rotate secrets through the hosting platform, and validate database migrations against a staging database.

## Useful commands

| Goal | Command |
|---|---|
| Install locked dependencies | `pnpm install` |
| Apply schema migrations | `pnpm db:push` |
| Start development server | `pnpm dev` |
| Type-check | `pnpm check` |
| Run tests | `pnpm test` |
| Build production assets | `pnpm build` |
| Start production server | `pnpm start` |
| Format source | `pnpm format` |

## Review quality and reliability contract

DevFlow AI now separates deterministic checks from AI reasoning. Deterministic checks cover test-change presence, pull-request size, secret patterns, migration/schema paths, authorization-sensitive paths, and simple TypeScript hygiene such as `console.log`. The model is reserved for logic defects, security edge cases, missing edge cases, API-contract reasoning, and performance trade-offs. Every precheck is tagged as deterministic in the persisted analysis metadata.

The v1 context builder is explicitly bounded: at most 60,000 diff characters, 30 changed files, 8,000 patch characters per file, eight nearby tests at 5,000 characters each, and eight manifests at 4,000 characters each. This keeps model cost predictable while retaining the diff, changed-file patches, nearby tests, and dependency manifests as the primary evidence sources.

Finding fingerprints are SHA-256 hashes of normalized category, normalized file path, title, and whitespace/comment-normalized evidence. Line numbers are intentionally excluded, so a finding can remain recognizable when a later commit shifts line positions. The workspace AI budget guard defaults to 200,000 estimated input tokens per UTC day and can be changed with `DEVFLOW_AI_DAILY_TOKEN_CAP`; once exhausted, deterministic findings remain available and the model call is skipped safely.

Evaluation is managed through named datasets. Benchmark cases distinguish clean pull requests from injected-issue pull requests and report precision, recall, false-positive rate, and human agreement separately. Dismissed findings remain a feedback signal, not a substitute for a labeled benchmark. The project includes unit coverage for these metric definitions and the control-room/review UI supports dataset selection, sample labeling, and sample listing.

Webhook deliveries are persisted by GitHub delivery ID. Processed deliveries return a duplicate response; an unprocessed delivery is retried after a crash. Analysis jobs also use deterministic repository/pull-request/revision job IDs, so the database uniqueness constraint and BullMQ job ID prevent duplicate enqueueing during retries. Outbound GitHub requests use bounded exponential backoff and honor `Retry-After` and rate-limit reset headers. TypeScript deterministic checks are exposed through a plugin interface so Python or other language plugins can be added without rewriting the worker.

Benchmark datasets persist their `BENCHMARK` type and target precision, recall, and false-positive thresholds. Samples persist whether they are `CLEAN` or `INJECTED_ISSUE` and may store expected finding categories, allowing benchmark definitions to survive worker restarts and be managed through the protected evaluation procedures.

When `REDIS_URL` is configured, daily AI token accounting is shared across worker processes using Redis keys scoped by workspace and UTC day. If Redis is unavailable, credential-free development falls back to a process-local guard and continues returning deterministic findings rather than failing the review. For production, configure Redis so the cap is shared across instances.

## Local runtime diagnostics and port alignment

The server uses `PORT` for its listening port and derives OAuth error and success redirects from `FRONTEND_URL`; when `FRONTEND_URL` is omitted, the default origin follows `PORT` and otherwise uses `http://localhost:3000`. Keep the browser URL, `FRONTEND_URL`, and `GITHUB_OAUTH_REDIRECT_URI` on the same port.

The application uses the MySQL/TiDB Drizzle driver. `DATABASE_URL` must use the `mysql://` scheme. Local database initialization validates the scheme and uses a bounded connection timeout so a missing or unreachable database produces a clear diagnostic instead of an opaque OAuth internal error.

When `REDIS_URL` is configured but Redis is unavailable, BullMQ diagnostics are rate-limited and the application reports that distributed background processing is unavailable. Start Redis before relying on distributed analysis workers; credential-free inline fallback remains available where supported.
