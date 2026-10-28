# Observability Branch Finalization & Production-Maturity Roadmap

**Date:** 2026-06-20
**Branch under review:** `feat/observability`
**Goal:** Verify the observability work is real (not just code that compiles), merge it cleanly via normal git practices, and sequence what comes next to maximize "production maturity" signal for a portfolio reviewer.

## Context

`feat/observability` adds, relative to `main`:
- Sentry init for the API (`apps/api/src/instrument.ts`) and web (`apps/web/sentry.client.config.ts`, `sentry.server.config.ts`), both no-op safe when `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are unset.
- `RequestIdMiddleware` + a global exception filter (`apps/api/src/common/...`) tying request IDs to error/log output.
- Structured JSON logging via `nestjs-pino`, wired into `app.module.ts`.
- Three new test files (`ViewSwitcher.test.tsx`, `Toast.test.tsx`, `useCurrentUser.test.ts`).

No Sentry account exists yet and no part of this branch has been run locally. `.github/workflows/ci.yml` already gates PRs to `main` on lint, typecheck, unit tests, e2e tests, and build for both apps — so the merge mechanics are in good shape; what's missing is functional verification and the production secrets that make Sentry actually do something post-merge.

## Section A: Finalize `feat/observability`

### A1. Sentry account setup (manual, human step)
Create a free Sentry account with two projects: one NestJS (API), one Next.js (web). Record both DSNs.

### A2. Local wiring
Add `SENTRY_DSN` to `apps/api/.env` and `NEXT_PUBLIC_SENTRY_DSN` to `apps/web/.env.local` (both gitignored — never commit real DSNs).

### A3. Functional verification
- API: trigger a deliberate thrown error via a route, confirm the event appears in the Sentry API project tagged with the `requestId` set by `RequestIdMiddleware`.
- Web: trigger a deliberate client-side error, confirm it appears in the Sentry web project.
- Confirm pino output: pretty-printed in dev, JSON in a simulated `NODE_ENV=production` run, and that `/v1/health` is excluded from access logs.

### A4. Local CI parity check
Run, in order, before pushing:
```
pnpm lint
pnpm -C apps/web typecheck && pnpm -C apps/api typecheck
pnpm -C apps/web test && pnpm -C apps/api test
pnpm -C apps/api test:e2e
pnpm -C apps/web build && pnpm -C apps/api build
```
This mirrors `ci.yml` step-for-step, so nothing surprises you in the PR checks.

### A5. Git workflow for the merge
- No new commits needed if A3/A4 pass clean — the existing commit history (`feat(observability): integrate Sentry...`, `fix(api): enable noImplicitAny...`, `feat(api): add nestjs-pino...`, `feat(api): add request ID middleware...`) is already well-scoped, one logical change per commit, imperative-mood messages. Keep it that way: if verification surfaces a fix, commit it separately with its own `fix(...)` message rather than amending.
- Push `feat/observability`, open a PR into `main` (not a direct push) so CI gates the merge and the diff is reviewable.
- PR description should state what was verified manually (Sentry capture, log format) since CI can't verify against a real Sentry DSN.
- Squash or keep commits as your repo's existing convention dictates — prior merges in `git log` are merge commits from PRs (`Merge pull request #54...`), so continue using the PR-merge flow rather than rebasing onto `main` directly.
- Do not force-push over `feat/observability` once the PR is open if anyone/anything (e.g. CI history) references it; prefer new commits.

### A6. Post-merge production secrets
Set the **real** `SENTRY_DSN` (Render → API service → Environment) and `NEXT_PUBLIC_SENTRY_DSN` (Vercel → web project → Environment Variables) in production. This step is easy to forget and silently no-ops (by design) without it — treat the branch as incomplete until this is done and a real production error has been confirmed in Sentry at least once.

## Section B: Production-maturity roadmap (post-merge, each item gets its own future brainstorm/spec)

Prioritized by leverage relative to effort, building directly on what `feat/observability` already ships:

1. **Source maps + release tracking in Sentry** — without this, production stack traces are minified and unreadable to anyone (including you) clicking into an error. Highest payoff for the lowest effort given Sentry SDKs already exist in the codebase.
2. **Test coverage reporting in CI** — tests exist but coverage is invisible. Add `--coverage` to the existing test steps and surface it (badge or PR comment).
3. **Uptime/health monitoring** — pair the existing `/v1/health` endpoint with an external check (UptimeRobot or Sentry Cron Monitors) to close the loop on "is it actually up."
4. **Architecture/runbook docs** (`docs/observability.md`) — a short doc explaining what's wired up and why; often the first thing a reviewer reads before the code.

Recommended sequencing: A (this spec) → B1 → B2 → B3/B4. Do not start B-items until Section A is fully complete, including A6 — shipping more observability tooling on top of an unverified base compounds the same risk.

## Out of scope
- New calendar-facing features (recurring events, sharing, etc.) — explicitly deprioritized in favor of production-maturity signal per user's stated portfolio goal.
- Choosing between Sentry alternatives — Sentry is already integrated; switching providers is not under consideration.
