# Observability Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out `feat/observability` with automated test coverage for the new error/log plumbing, a reliable manual way to trigger and confirm real Sentry events, and a clean git/PR workflow into `main`.

**Architecture:** Two tiny "debug" endpoints (one in the API, one in the web app) deliberately throw errors so the existing `AllExceptionsFilter`, `RequestIdMiddleware`, and Sentry SDKs can be exercised end-to-end, both locally and in production after deploy. Unit tests pin the filter/middleware behavior so future changes can't silently break error reporting.

**Tech Stack:** NestJS (jest), Next.js App Router (vitest + Testing Library), `@sentry/node`, `@sentry/nextjs`, `nestjs-pino`.

## Global Constraints

- No real Sentry DSN exists yet — it must be created (Task 1) before any manual verification step (Tasks 5, 7, 9) can run.
- Per the spec, do not amend or rewrite existing `feat/observability` commits — only add new commits on top.
- Open a PR into `main` and let `.github/workflows/ci.yml` gate the merge; do not push directly to `main`.
- Follow the repo's existing commit style: `type(scope): imperative summary` (see `git log` on this branch for examples).

---

### Task 1: Create Sentry account and projects (manual, no code)

**Files:** none

**Interfaces:** Produces two DSN strings used by Tasks 2, 5, 7, 9.

- [ ] **Step 1: Sign up / log in at sentry.io**

This is a manual browser step — no command to run.

- [ ] **Step 2: Create an API project**

Platform: Node.js / NestJS. Name it e.g. `calendar-clone-api`. Copy the DSN shown after creation (format: `https://<key>@<org>.ingest.<region>.sentry.io/<project>`).

- [ ] **Step 3: Create a web project**

Platform: Next.js. Name it e.g. `calendar-clone-web`. Copy its DSN.

- [ ] **Step 4: Record both DSNs somewhere safe (e.g. a password manager)**

You'll paste them into `.env` files in Task 2 and into Render/Vercel in Task 10. Do not commit them anywhere.

---

### Task 2: Wire DSNs into local env files (manual, no code)

**Files:**
- Modify: `apps/api/.env` (gitignored)
- Modify: `apps/web/.env.local` (gitignored)

**Interfaces:** Consumes the two DSNs from Task 1. Produces working local Sentry configuration consumed by Tasks 5 and 7.

- [ ] **Step 1: Add the API DSN**

Append to `apps/api/.env`:
```
SENTRY_DSN=<your API project DSN from Task 1>
```

- [ ] **Step 2: Add the web DSN**

Append to `apps/web/.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=<your web project DSN from Task 1>
```

- [ ] **Step 3: Confirm the values are picked up**

Run: `grep SENTRY apps/api/.env apps/web/.env.local`
Expected: both lines print back with non-empty values.

---

### Task 3: Unit test `RequestIdMiddleware`

**Files:**
- Create: `apps/api/src/common/middleware/request-id.middleware.spec.ts`
- Test: same file

**Interfaces:**
- Consumes: `RequestIdMiddleware` from `apps/api/src/common/middleware/request-id.middleware.ts` (`use(req, res, next)`).
- Produces: confidence that `req.id` and the `X-Request-ID` response header are set correctly — relied on by Task 4's filter test and Task 5's e2e test.

- [ ] **Step 1: Write the failing tests**

```typescript
import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('generates a request id when none is supplied', () => {
    const req: any = { headers: {} };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('reuses an incoming X-Request-ID header instead of generating one', () => {
    const req: any = { headers: { 'x-request-id': 'client-supplied-id' } };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe('client-supplied-id');
    expect(setHeader).toHaveBeenCalledWith('X-Request-ID', 'client-supplied-id');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm -C apps/api test request-id.middleware -- --no-coverage`
Expected: FAIL with "Cannot find module './request-id.middleware'" — wait, the module exists already, so this should actually PASS immediately since `RequestIdMiddleware` is already implemented. Run it and confirm: PASS, 2 tests.

> Note: unlike a greenfield feature, this middleware already exists and works — this task is backfilling test coverage, not driving new implementation. If the tests fail, that's a real bug in existing code; fix `request-id.middleware.ts` to match the documented behavior in its own comments before moving on.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/middleware/request-id.middleware.spec.ts
git commit -m "test(api): add coverage for RequestIdMiddleware"
```

---

### Task 4: Unit test `AllExceptionsFilter`

**Files:**
- Create: `apps/api/src/common/filters/all-exceptions.filter.spec.ts`
- Test: same file

**Interfaces:**
- Consumes: `AllExceptionsFilter` from `apps/api/src/common/filters/all-exceptions.filter.ts` (`catch(exception, host)`); `req.id` set by `RequestIdMiddleware` (Task 3).
- Produces: confidence that 5xx errors call `Sentry.captureException` and 4xx errors don't — this is the behavior Task 7's manual Sentry-dashboard check depends on being correct.

- [ ] **Step 1: Write the failing tests**

```typescript
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './all-exceptions.filter';

jest.mock('@sentry/node', () => ({
  withScope: jest.fn((cb: (scope: any) => void) =>
    cb({ setTag: jest.fn(), setExtra: jest.fn() }),
  ),
  captureException: jest.fn(),
}));

function createHost(req: Partial<Record<string, unknown>>) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const fullReq = { id: 'req-123', url: '/v1/events', method: 'GET', ...req };
  const host = {
    switchToHttp: () => ({
      getRequest: () => fullReq,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
  });

  it('reports unhandled (5xx) errors to Sentry with the request id tagged', () => {
    const { host, status, json } = createHost({});
    const error = new Error('boom');

    filter.catch(error, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        requestId: 'req-123',
      }),
    );
  });

  it('does not report client errors (4xx) to Sentry', () => {
    const { host, status, json } = createHost({});
    const error = new BadRequestException('endAt must be after startAt');

    filter.catch(error, host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'endAt must be after startAt',
        requestId: 'req-123',
      }),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify current behavior**

Run: `pnpm -C apps/api test all-exceptions.filter -- --no-coverage`
Expected: PASS, 2 tests (this is existing, working code being pinned down — if either assertion fails, that's a real bug to fix in `all-exceptions.filter.ts`, not the test).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/filters/all-exceptions.filter.spec.ts
git commit -m "test(api): add coverage for AllExceptionsFilter Sentry reporting"
```

---

### Task 5: Add an API debug endpoint to trigger and verify Sentry capture

**Files:**
- Modify: `apps/api/src/app.controller.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `AllExceptionsFilter` (already registered globally in `main.ts:36`), `RequestIdMiddleware` (already applied globally in `app.module.ts`).
- Produces: `GET /v1/debug-sentry`, a permanent diagnostic route that always throws — used here for local verification (Task 7) and again after deploy (Task 10) to confirm production Sentry is wired correctly.

- [ ] **Step 1: Write the failing e2e test**

Add to `apps/api/test/app.e2e-spec.ts`, inside the existing `describe('Health (e2e)', ...)` block:

```typescript
  it('GET /v1/debug-sentry returns the standard error envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/debug-sentry')
      .expect(500);

    expect(res.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
    });
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.requestId.length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Run: `pnpm -C apps/api test:e2e`
Expected: FAIL on the new test — `GET /v1/debug-sentry` returns 404 because the route doesn't exist yet.

- [ ] **Step 3: Implement the endpoint**

In `apps/api/src/app.controller.ts`, add inside the `AppController` class (after the `dbHealth` method):

```typescript
  @Get('debug-sentry')
  debugSentry(): never {
    // Permanent diagnostic route: deliberately throws so AllExceptionsFilter
    // reports a real event to Sentry. Safe to hit repeatedly in any environment.
    throw new Error('Sentry test error — safe to ignore');
  }
```

- [ ] **Step 4: Run the e2e test to verify it passes**

Run: `pnpm -C apps/api test:e2e`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.controller.ts apps/api/test/app.e2e-spec.ts
git commit -m "feat(api): add /v1/debug-sentry diagnostic endpoint"
```

---

### Task 6: Add a web debug page to trigger client-side Sentry capture

**Files:**
- Create: `apps/web/app/debug-sentry/page.tsx`
- Create: `apps/web/app/debug-sentry/page.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone page).
- Produces: a route at `/debug-sentry` whose button throws, caught by the existing `apps/web/app/error.tsx` boundary (which calls `Sentry.captureException` — see `error.tsx:23`). Used in Task 7 (local) and Task 10 (production) for manual verification.

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DebugSentryPage from './page';

describe('DebugSentryPage', () => {
  it('throws a test error when the button is clicked', () => {
    render(<DebugSentryPage />);
    const button = screen.getByRole('button', { name: 'Throw test error' });

    expect(() => fireEvent.click(button)).toThrow('Sentry test error - safe to ignore');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -C apps/web test debug-sentry`
Expected: FAIL — `Cannot find module './page'` (the file doesn't exist yet).

- [ ] **Step 3: Implement the page**

```tsx
'use client';

export default function DebugSentryPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="max-w-md text-sm text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
        Permanent diagnostic page. Click the button to throw a test error and
        confirm it reaches Sentry.
      </p>
      <button
        type="button"
        onClick={() => {
          throw new Error('Sentry test error - safe to ignore');
        }}
        className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1765c2]"
      >
        Throw test error
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -C apps/web test debug-sentry`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/debug-sentry/page.tsx apps/web/app/debug-sentry/page.test.tsx
git commit -m "feat(web): add /debug-sentry diagnostic page"
```

---

### Task 7: Manual local verification (no code)

**Files:** none

**Interfaces:** Consumes the DSNs wired in Task 2 and the endpoints built in Tasks 5–6. Produces confidence that real Sentry events and structured logs work before opening the PR.

- [ ] **Step 1: Start both apps**

Run: `pnpm dev`
Expected: API listening on port 3001, web on port 3000, no startup errors.

- [ ] **Step 2: Trigger and confirm the API error in Sentry**

Run: `curl -s http://localhost:3001/v1/debug-sentry | jq`
Expected: JSON body with `"statusCode": 500` and a `requestId`. Then open your Sentry **API project** dashboard in a browser and confirm a new issue titled `Error: Sentry test error — safe to ignore` appears, tagged with the same `requestId`.

- [ ] **Step 3: Trigger and confirm the web error in Sentry**

In a browser, visit `http://localhost:3000/debug-sentry` and click "Throw test error". Expected: the `error.tsx` boundary renders ("Something went wrong"). Then open your Sentry **web project** dashboard and confirm a new issue titled `Error: Sentry test error - safe to ignore` appears.

- [ ] **Step 4: Confirm pino log format**

Run: `curl -s http://localhost:3001/v1/health` while watching the API's terminal output. Expected (dev mode): a single colorized, human-readable log line containing the request path — and no second log line for `/v1/health` beyond the one from this curl (it's excluded from `autoLogging` per `app.module.ts`, so confirm you don't see duplicate/noisy entries).

- [ ] **Step 5: Confirm production-style JSON logging**

Run: `NODE_ENV=production pnpm -C apps/api start:dev` in a separate terminal (stop the dev instance from Step 1 first to free port 3001), then `curl -s http://localhost:3001/v1/debug-sentry`.
Expected: the log line printed for that request is raw JSON (no color, no `pino-pretty` formatting) and includes a `req.id` field. Stop this instance afterward and restart normal `pnpm dev` if you want to keep working locally.

---

### Task 8: Local CI-parity check

**Files:** none

**Interfaces:** Consumes nothing new. Produces confidence that the PR's CI run (Task 9) will pass.

- [ ] **Step 1: Run the full check matching `.github/workflows/ci.yml`**

```bash
pnpm lint
pnpm -C apps/web typecheck
pnpm -C apps/api typecheck
pnpm -C apps/web test
pnpm -C apps/api test
pnpm -C apps/api test:e2e
pnpm -C apps/web build
pnpm -C apps/api build
```
Expected: every command exits 0. If anything fails, fix it and amend the relevant commit from Tasks 3–6 (these commits are new and unpushed, so amending them is fine — only avoid amending the pre-existing `feat/observability` commits from before this plan).

---

### Task 9: Push and open the PR

**Files:** none

**Interfaces:** Consumes the verified branch state from Tasks 1–8.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/observability
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --base main --head feat/observability --title "feat(observability): Sentry, structured logging, and request tracing" --body "$(cat <<'EOF'
## Summary
- Sentry error tracking for API (Node) and web (Next.js), no-op when DSN is unset
- Request-ID middleware + global exception filter for consistent error envelopes and log correlation
- Structured JSON logging via nestjs-pino
- New: /v1/debug-sentry and /debug-sentry diagnostic routes, plus unit/e2e coverage for the filter and middleware

## Manually verified locally (not covered by CI, since CI has no real Sentry DSN)
- [x] API error via /v1/debug-sentry appears in Sentry with requestId tag
- [x] Web error via /debug-sentry appears in Sentry
- [x] Dev logs are pretty-printed; NODE_ENV=production logs are raw JSON
- [x] /v1/health is excluded from access logs

## Test plan
- [x] pnpm lint / typecheck / test / test:e2e / build all pass locally
- [ ] CI passes on this PR
EOF
)"
```

- [ ] **Step 3: Wait for CI, then merge through the PR (not a direct push)**

Run: `gh pr checks feat/observability --watch`
Expected: all checks pass. Once green, merge via `gh pr merge --merge` (or the GitHub UI) — do not `git push origin feat/observability:main` directly, and do not force-push this branch while the PR is open.

---

### Task 10: Production secrets and final verification (manual, no code)

**Files:** none

**Interfaces:** Consumes the DSNs from Task 1 and the merged `/v1/debug-sentry` / `/debug-sentry` routes from Tasks 5–6.

- [ ] **Step 1: Set the API DSN in Render**

In the Render dashboard, open the API service → Environment, add `SENTRY_DSN` with the value from Task 1, and deploy.

- [ ] **Step 2: Set the web DSN in Vercel**

In the Vercel dashboard, open the web project → Settings → Environment Variables, add `NEXT_PUBLIC_SENTRY_DSN` (Production scope) with the value from Task 1, and redeploy.

- [ ] **Step 3: Verify production capture**

Run: `curl -s https://<your-render-api-url>/v1/debug-sentry`
Then visit `https://<your-vercel-web-url>/debug-sentry` and click the button.
Expected: both produce new issues in their respective Sentry projects tagged `environment: production`. This is the point at which `feat/observability` is actually complete — until both of these show up, the branch only "compiles," it doesn't observe anything in production.

---

## Self-Review Notes

- **Spec coverage:** A1 → Task 1; A2 → Task 2; A3 → Tasks 5–7; A4 → Task 8; A5 (git workflow) → Tasks 3–6, 9; A6 → Task 10. Section B is explicitly out of scope for this plan per the spec ("each gets its own future brainstorm/spec").
- **Placeholder scan:** no TBDs; the only bracketed values (`<your API project DSN>`, `<your-render-api-url>`) are genuinely user-specific secrets/URLs that can't be known in advance, not deferred design decisions.
- **Type consistency:** `req.id` (string) is consistent across `request-id.middleware.ts`, the filter, and both new test files; the error envelope shape (`statusCode`, `error`, `message`, `requestId`, `timestamp`, `path`) matches `all-exceptions.filter.ts:94-101` exactly in all assertions.
