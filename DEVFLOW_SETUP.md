# DevFlow AI Setup and Architecture

DevFlow AI is a GitHub-integrated pull-request intelligence platform. The application uses the managed React, Express, tRPC, Drizzle, and Manus OAuth scaffold. GitHub access, Redis, and AI services are optional during development; the UI and deterministic review pipeline remain available with explicit empty and PARTIAL states when credentials are absent.

## Runtime architecture

The browser uses React and typed tRPC procedures. Express owns the webhook endpoint, OAuth callback, server-sent event stream, storage proxy, and tRPC gateway. Drizzle persists users, workspaces, repositories, pull requests, branches, commits, webhook deliveries, analyses, findings, feedback, notifications, and audit records. BullMQ uses Redis when `REDIS_URL` is present and falls back to an inline worker in local development. The analysis worker runs deterministic pre-checks, builds bounded repository context, calls the configured LLM adapter, validates the result with Zod, persists findings, updates exact job states, and publishes notification events.

## Local development without credentials

Run `pnpm install`, then `pnpm dev`. Manus OAuth remains the application session provider. The dashboard can render without a GitHub token, repository list queries return an empty state, the queue can run inline, and the AI adapter returns a validated PARTIAL review when no LLM credential is available. Webhook and GitHub OAuth routes return explicit configuration responses instead of failing silently.

## Final production secrets

| Variable | Purpose |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application client secret. |
| `GITHUB_OAUTH_REDIRECT_URI` | Public callback URL ending in `/api/github/oauth/callback`. |
| `GITHUB_WEBHOOK_SECRET` | Shared GitHub webhook secret for HMAC SHA-256 verification. |
| `REDIS_URL` | Redis connection URL for durable BullMQ workers. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Managed AI gateway configuration already supplied by the project environment. |

Never commit `.env` files or access tokens. Configure the same variables in both development and production secret managers. After adding them, connect GitHub through `/api/github/oauth/start`, configure the repository webhook at `/api/webhooks/github`, and verify an opened or synchronized pull request produces one persisted delivery and one deterministic analysis job.

## Verification commands

Use `pnpm check` for TypeScript, `pnpm test` for unit and integration regression tests, and `pnpm build` for the production bundle. The critical security assertions are HMAC SHA-256 verification, delivery-ID idempotency, exact status transitions, deterministic job IDs, Zod validation, workspace access checks, and redacted request logging.

## Known final handoff step

The code is intentionally configuration-safe before credentials are entered. The last step is to add the real GitHub OAuth values, webhook secret, Redis URL, and any external AI credentials, then execute one live repository synchronization and one test pull request through the complete webhook-to-review workflow.
