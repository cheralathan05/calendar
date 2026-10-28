# Calendar Clone

[![CI](https://github.com/tanialapalelo/calendar-clone/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tanialapalelo/calendar-clone/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tanialapalelo/calendar-clone/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/tanialapalelo/calendar-clone/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![pnpm](https://img.shields.io/badge/pnpm-10.17-orange?logo=pnpm)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/)

A portfolio project: a Google Calendar–inspired app built as a TypeScript monorepo with a Next.js web app and a NestJS API.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | NestJS 11 + Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | Google OAuth 2.0 + HttpOnly cookie (JWT) |
| Tests | Vitest + React Testing Library (web) · Jest + Supertest (api) |
| Monorepo | Turborepo + pnpm workspaces |
| CI/CD | GitHub Actions + CodeQL + Dependabot |

---

## Architecture

```
calendar-clone/
├── apps/
│   ├── web/                         # Next.js frontend
│   │   ├── app/                     # App Router pages & layouts
│   │   │   └── error.tsx            # Route-level error boundary
│   │   ├── components/
│   │   │   ├── calendar/            # Calendar-specific components + views
│   │   │   │   ├── views/           # Year / Month / Week / Day
│   │   │   │   ├── events/          # Event forms, popovers, dialogs
│   │   │   │   └── Skeletons.tsx    # Loading skeletons per view
│   │   │   └── ui/                  # Generic reusable UI (Toast, SettingsMenu)
│   │   ├── lib/
│   │   │   ├── api/                 # apiFetch wrapper + per-resource modules
│   │   │   ├── auth/                # useCurrentUser
│   │   │   ├── events/              # Pure event utils + useEventsApi
│   │   │   ├── hooks/               # Reusable hooks
│   │   │   │   ├── useCalendarNavigation.ts
│   │   │   │   ├── useIsMobile.ts
│   │   │   │   ├── useKeyboardShortcuts.ts
│   │   │   │   ├── useModalA11y.ts          # Focus trap + scroll lock + Esc
│   │   │   │   └── usePopoverState.ts
│   │   │   └── theme/
│   │   └── types/
│   └── api/                         # NestJS backend
│       ├── src/
│       │   ├── auth/                # Google OAuth + JWT guard
│       │   ├── calendars/           # Calendars CRUD
│       │   ├── events/              # Events CRUD + recurrence
│       │   │   ├── recurrence/      # RRULE helpers + exception logic
│       │   │   └── rrule-until.ts
│       │   └── prisma/              # PrismaService
│       ├── prisma/                  # schema + migrations + seed
│       └── test/                    # e2e tests (supertest + real DB)
└── .github/
    ├── workflows/
    │   ├── ci.yml                   # lint + typecheck + test + build
    │   └── codeql.yml               # weekly security scan
    └── dependabot.yml               # weekly grouped dep updates
```

### Key architecture decisions

**API-owned OAuth flow.** The backend owns the entire Google OAuth redirect flow. The frontend never sees tokens — it only receives an HttpOnly cookie containing a signed JWT. This eliminates XSS token-theft risk.

**OAuth state CSRF.** `GET /v1/auth/google/start` mints a cryptographically random `state` and stores it in a path-scoped HttpOnly cookie; `/v1/auth/google/callback` verifies the cookie matches the returned `state` (one-shot, cleared on success).

**`apiFetch` throws, not returns `{ok}`.** The API client throws an `ApiError` on non-2xx responses instead of returning a `{ ok: boolean }` union. Callers write `await apiFetch(...)` and `catch(err)` once. Centralised 401 handling redirects to `/login`.

**Custom hooks for all stateful logic.** `CalendarPageClient` is a pure orchestrator — it composes hooks and renders. Logic lives in hooks:
- `useCalendarNavigation` — view/date state in URL search params (deep-linkable)
- `useEventsApi` — events list + CRUD with optimistic updates
- `usePopoverState` — event popover + day overflow popover
- `useModalA11y` — focus trap + scroll lock + Esc + return focus (WAI-ARIA Dialog pattern)
- `useIsMobile` — SSR-safe `matchMedia` wrapper

**SSR-safe theme.** `useTheme` initialises to `'system'` (matching the inline `<script>` in `layout.tsx`) to avoid hydration mismatches.

**Thin controllers, fat services.** Every NestJS controller method is one line — it calls a service method and returns. Business logic (ownership checks, NotFoundException, recurrence expansion) lives in the service.

---

## Local development

### Prerequisites

- Node.js ≥ 20 LTS
- pnpm 10 (`npm i -g pnpm`)
- Docker (recommended for PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
```

> **First time only:** pnpm 10 quarantines postinstall scripts. Approve the ones we need (Prisma + esbuild):
> ```bash
> pnpm approve-builds
> ```
> Space-bar to tick `@prisma/client`, `esbuild`, `prisma`, then `Enter` + `y`. This writes `pnpm.onlyBuiltDependencies` to the root `package.json` and re-runs scripts.

### 2. Start PostgreSQL

```bash
docker run --name calendar-clone-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=calendar_clone \
  -p 5432:5432 \
  -d postgres:16
```

Create a separate **test database** (used by API e2e tests):

```bash
docker exec -it calendar-clone-postgres \
  psql -U postgres -c "CREATE DATABASE calendar_clone_test;"
```

### 3. Environment variables

> Do not commit `.env` files. Only commit `.env.*.example` files.

**`apps/api/.env`** (local dev):

```env
PORT=3001
WEB_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_clone?schema=public

JWT_SECRET=replace-with-a-long-random-string
COOKIE_NAME=access_token

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/v1/auth/google/callback
```

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`apps/api/.env.test`** (e2e tests):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_clone_test?schema=public
JWT_SECRET=test-secret
COOKIE_NAME=access_token
```

**`apps/web/.env.local`** (local dev):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Run Prisma migrations + seed

```bash
pnpm -C apps/api exec prisma migrate dev
pnpm -C apps/api exec prisma generate
pnpm -C apps/api exec prisma db seed
```

### 5. Start both apps

```bash
pnpm dev
```

- Web → http://localhost:3000
- API → http://localhost:3001
- API health → `GET /v1/health` · DB health → `GET /v1/db-health`
- API docs (dev only) → http://localhost:3001/v1/docs

---

## Authentication

### Flow

1. User clicks "Sign in with Google" → browser navigates to `GET /v1/auth/google/start`
2. API mints a CSRF `state`, stores it in a path-scoped HttpOnly cookie, redirects to Google's consent screen
3. Google redirects to `GET /v1/auth/google/callback?code=…&state=…`
4. API verifies the cookie matches the `state`, exchanges the code, verifies the ID token, upserts the user, sets the **HttpOnly JWT cookie**
5. API redirects back to the web app (`WEB_ORIGIN`)

### Why HttpOnly cookies?

- Tokens are not accessible to JavaScript — eliminates XSS token theft
- Browser sends the cookie automatically on every API request
- `JwtCookieGuard` validates the JWT and sets `req.user` on every protected route

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/google/start` | No | Mint CSRF state, redirect to Google |
| `GET` | `/v1/auth/google/callback` | No | Verify state, set cookie |
| `GET` | `/v1/auth/me` | Required | Return current user |
| `POST` | `/v1/auth/logout` | No | Clear cookie |

---

## API reference

### Calendars

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/calendars` | List all calendars for current user |
| `GET` | `/v1/calendars/:id` | Get a single calendar |
| `POST` | `/v1/calendars` | Create `{ name, color? }` |
| `PATCH` | `/v1/calendars/:id` | Rename / recolor |
| `DELETE` | `/v1/calendars/:id` | Delete calendar + all its events |

### Events

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/events?from=&to=` | List events in date range (required, ≤ 366 days) |
| `GET` | `/v1/events/search?q=` | Full-text search across title, description, location |
| `GET` | `/v1/events/:id` | Get a single event |
| `POST` | `/v1/events` | Create |
| `PATCH` | `/v1/events/:id?scope=` | Update (`scope`: `this`/`following`/`all`) |
| `DELETE` | `/v1/events/:id?scope=` | Delete (`scope`: `this`/`following`/`all`) |

All routes require the auth cookie. Swagger docs available at `/v1/docs` in dev.

---

## Google OAuth setup (local)

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create / select a project
3. **APIs & Services → OAuth consent screen** — choose "External", add yourself as a test user
4. **APIs & Services → Credentials → Create OAuth client ID** (Web application)
5. **Authorised redirect URIs:** `http://localhost:3001/v1/auth/google/callback`
6. **Authorised JavaScript origins:** `http://localhost:3000`, `http://localhost:3001`
7. Copy Client ID + Secret into `apps/api/.env`

---

## Testing

### Frontend (`apps/web`)

Vitest + React Testing Library.

```bash
pnpm -C apps/web test            # one-shot
pnpm -C apps/web test:watch      # watch mode
pnpm -C apps/web test:ui         # browser UI
pnpm -C apps/web test:coverage   # HTML report in coverage/
```

Test categories:
- `lib/**/*.test.ts` — pure utility & hook tests (no DOM)
- `components/**/*.test.tsx` — component tests with RTL

### Backend (`apps/api`)

Jest + Supertest. `pretest` regenerates the Prisma client; `pretest:e2e` runs `prisma migrate deploy` against the test DB.

```bash
pnpm -C apps/api test            # unit
pnpm -C apps/api test:e2e        # e2e (requires test DB)
pnpm -C apps/api test:cov        # coverage
```

E2E tests sign JWTs with `JWT_SECRET` from `.env.test` and send them as cookies via supertest, exercising the real `JwtCookieGuard`.

### Continuous Integration

Every PR runs:
- ESLint
- TypeScript strict typecheck (both apps)
- Vitest (web) + Jest (api unit + e2e against an ephemeral Postgres service)
- Production builds (`next build`, `nest build`)
- CodeQL security analysis (`security-extended` queries)

CI status is required to pass before merging to `main`.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `t` | Go to today |
| `d` | Day view |
| `w` | Week view |
| `m` | Month view |
| `y` | Year view |
| `c` | Create new event |
| `←` / `p` / `k` | Previous period |
| `→` / `n` / `j` | Next period |
| `Esc` | Close any open modal/popover |

---

## Production deployment

### Docker Compose (all-in-one)

```bash
cp apps/api/.env.example .env.prod
# Fill in JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Services:
- `db` — PostgreSQL 16
- `api` — NestJS API on port 3001
- `web` — Next.js on port 3000

---

## Milestones

The completed milestones are listed below. Further planned milestones have been moved to `docs/TODO.md` so they can be tackled separately and tracked as individual tasks.

### ✅ Milestone 1 — UI prototype
- Calendar UI: month / week / day / year views
- Sidebar with mini-calendar + calendar visibility toggles
- Dark mode (light / dark / system) persisted to localStorage
- Settings menu with appearance + export/import
- Responsive layout with collapsible sidebar (hamburger toggle)

### ✅ Milestone 2 — Backend foundation
- NestJS + Prisma + PostgreSQL
- `GET /v1/health` + `GET /v1/db-health`
- Docker Compose for local Postgres

### ✅ Milestone 3 — Authentication
- Google OAuth 2.0 (API-owned flow)
- HttpOnly cookie session (JWT)
- `JwtCookieGuard` protecting all private routes

### ✅ Milestone 4 — API-backed core data
- Events + Calendars CRUD with DTOs and validation
- URL-driven view/date navigation (deep-linkable, back button works)
- e2e tests: events CRUD + auth smoke tests

### ✅ Milestone 5 — Google Calendar feature parity
- Recurring events with RRULE + per-instance exceptions (`this` / `following` / `all`)
- Correct all-day / timezone handling
- Event colour: per-calendar default + per-event override
- Reminders / notifications editor
- Custom recurrence rule builder dialog

### ✅ Milestone 6 - UI polish + UX improvements
- Year / Month / Week / Day views with Google-style layout
- Mobile-responsive (dots in MonthView, sticky headers in Week/DayView)
- Dark mode (light / dark / system) persisted to localStorage
- Loading skeletons (no spinner-over-content layout shift)
- Route-level error boundary (`app/error.tsx`)
- Modal a11y: focus trap, scroll lock, Esc to close, return focus
- Bounded toast queue (max 3, pause-on-hover, dark-mode, mobile-responsive)
- `React.memo` on all four views — no re-render on parent state change
- All visual styling driven by `--gcal-*` CSS tokens

### ✅ Milestone 7 — Testing & CI
- Vitest + RTL set up in `apps/web`
- Unit tests for `generateMonthGrid`, `layoutOverlappingEvents`, `day.ts`, `useIsMobile`
- GitHub Actions CI: lint + typecheck + test + build on every PR
- CodeQL weekly security scan (`security-extended`)
- Dependabot with grouped weekly minor/patch updates
- Required status checks on `main`

## License

MIT © Tania Lapalelo
