# Deploying Calendar Clone to Render (Zero Errors Guide)

This guide provides everything you need to deploy the **PostgreSQL Database**, **NestJS API Backend**, and **Next.js Frontend** to Render with zero errors.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │             Render Cloud                │
                      │                                         │
┌──────────────┐      │   ┌───────────────┐   Private Network   │
│ User Browser │──────┼──▶│ calendar-web  │─────────────────┐   │
└──────────────┘      │   │  (Next.js 16) │                 │   │
       │              │   └───────────────┘                 │   │
       │              │           │                         ▼   │
       │              │      Client Auth Links       ┌───────────────┐
       └──────────────┼─────────────────────────────▶│ calendar-api  │
                      │                              │  (NestJS 11)  │
                      │                              └───────────────┘
                      │                                     │   │
                      │                               Prisma│   │
                      │                                     ▼   │
                      │                              ┌───────────────┐
                      │                              │  calendar-db  │
                      │                              │ (PostgreSQL)  │
                      │                              └───────────────┘
                      └─────────────────────────────────────────┘
```

- **Database:** Managed PostgreSQL 16 on Render (`calendar-db`).
- **Backend API:** NestJS 11 web service with Prisma ORM (`calendar-api`).
- **Frontend Web:** Next.js 16 web service with App Router & server-side API proxy rewrites (`calendar-web`).

---

## Option 1: Automatic Blueprint Deployment (Recommended)

Render Blueprints use Infrastructure as Code (`render.yaml`) to automatically provision the database, backend, and frontend with all connections pre-configured in one go.

### Step 1: Push Code to GitHub
Ensure your repository contains the updated `render.yaml` file and push your branch:
```bash
git add .
git commit -m "feat: complete Render deployment configuration"
git push origin main
```

### Step 2: Create Blueprint on Render
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top-right corner and select **Blueprint**.
3. Connect your GitHub repository (`calendar-clone`).
4. Select the `main` branch. Render will automatically detect `render.yaml`.
5. You will see three resources to be created:
   - **`calendar-db`** (PostgreSQL Database)
   - **`calendar-api`** (Web Service)
   - **`calendar-web`** (Web Service)
6. Click **Apply**. Render will begin provisioning all three resources automatically.

### Step 3: Link Public URLs
Once the services finish deploying:
1. Copy the public URL of **`calendar-api`** (e.g. `https://calendar-api-xxxx.onrender.com`).
2. Go to **`calendar-web`** → **Environment** → edit or add:
   - `NEXT_PUBLIC_API_URL` = `https://calendar-api-xxxx.onrender.com` (no trailing slash)
3. Save changes. Render will automatically re-deploy `calendar-web`.
4. Open your `calendar-web` URL (e.g. `https://calendar-web-xxxx.onrender.com`) and start using the app!

---

## Option 2: Step-by-Step Manual Dashboard Setup

If you prefer to configure each service manually in the Render dashboard, follow these steps in exact order.

### Step 1: Create the PostgreSQL Database
1. Go to **Dashboard** → **New +** → **PostgreSQL**.
2. Configure:
   - **Name:** `calendar-db`
   - **Database:** `calendar`
   - **User:** `calendar_user`
   - **Region:** `Oregon (US West)` *(or your preferred region; keep all services in the same region)*
   - **PostgreSQL Version:** `16`
   - **Plan:** `Free` (or `Starter`)
3. Click **Create Database**.
4. Once created, scroll down to the **Connections** section and copy the **Internal Database URL** (`postgres://...`).

---

### Step 2: Create the Backend API Service (`calendar-api`)
1. Go to **Dashboard** → **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `calendar-api`
   - **Language / Runtime:** `Node`
   - **Region:** Same as your database (e.g. `Oregon`)
   - **Branch:** `main`
   - **Root Directory:** `.` *(leave blank or set to repository root)*
   - **Build Command:**
     ```bash
     corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile && pnpm --filter api run build
     ```
   - **Start Command:**
     ```bash
     pnpm --filter api run start:render
     ```
   - **Plan:** `Free` (or `Starter`)
4. Expand **Advanced** and set:
   - **Health Check Path:** `/v1/health`
5. Under **Environment Variables**, add:

| Key | Value / Source | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `NODE_VERSION` | `22.14.0` | Node.js LTS version |
| `NODE_OPTIONS` | `--max-old-space-size=460` | Free tier memory safeguard |
| `PORT` | `3001` | Server port |
| `DATABASE_URL` | *Paste Internal Database URL from Step 1* | Primary database connection |
| `DIRECT_URL` | *Paste Internal Database URL from Step 1* | Direct migration connection |
| `JWT_SECRET` | *Generate a 32+ character random secret* | Used for signing auth tokens |
| `COOKIE_NAME` | `access_token` | HttpOnly session cookie name |
| `ALLOW_DEMO` | `true` | Enables instant 1-click test personas & seed data |
| `WEB_ORIGIN` | `https://calendar-web-xxxx.onrender.com` | Live URL of your frontend |

*(Optional Google OAuth & Email variables can be added later — see below).*

6. Click **Create Web Service**. Wait for the build and deployment to succeed.
7. Copy the public URL of `calendar-api` (e.g. `https://calendar-api-xxxx.onrender.com`).

---

### Step 3: Create the Frontend Web App (`calendar-web`)
1. Go to **Dashboard** → **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `calendar-web`
   - **Language / Runtime:** `Node`
   - **Region:** Same as backend (e.g. `Oregon`)
   - **Branch:** `main`
   - **Root Directory:** `.`
   - **Build Command:**
     ```bash
     corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile && pnpm --filter web run build
     ```
   - **Start Command:**
     ```bash
     pnpm --filter web run start
     ```
   - **Plan:** `Free` (or `Starter`)
4. Expand **Advanced** and set:
   - **Health Check Path:** `/login`
5. Under **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `NODE_VERSION` | `22.14.0` | Node.js LTS version |
| `NODE_OPTIONS` | `--max-old-space-size=460` | Free tier memory safeguard |
| `NEXT_PUBLIC_API_URL` | `https://calendar-api-xxxx.onrender.com` | Public URL of `calendar-api` (from Step 2) |
| `INTERNAL_API_URL` | `http://calendar-api:3001` | Optional: Private network URL for faster server proxy rewrites |

6. Click **Create Web Service**. Wait for the build and deployment to succeed.

---

## Configuring Google OAuth (Optional)

If you want real Google account sign-in in addition to the 1-click Demo accounts:

1. Visit [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select an **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized JavaScript origins**, add:
   - `https://calendar-web-xxxx.onrender.com` (your live frontend)
   - `https://calendar-api-xxxx.onrender.com` (your live backend)
4. Under **Authorized redirect URIs**, add:
   - `https://calendar-api-xxxx.onrender.com/v1/auth/google/callback`
5. Copy your **Client ID** and **Client Secret**.
6. In Render, go to **`calendar-api`** → **Environment** and set:
   - `GOOGLE_CLIENT_ID` = `your-client-id.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET` = `your-client-secret`
   - `GOOGLE_REDIRECT_URI` = `https://calendar-api-xxxx.onrender.com/v1/auth/google/callback`
7. Save changes.

---

## Configuring Email Delivery (Optional)

In production on cloud hosts like Render, standard outbound SMTP ports (25, 465, 587) are blocked at the network firewall level. For sending event invites and reminders:

1. Create a free account at [Brevo (formerly Sendinblue)](https://www.brevo.com/).
2. Generate an API Key under **SMTP & API** → **API Keys**.
3. In Render, go to **`calendar-api`** → **Environment** and add:
   - `BREVO_API_KEY` = `your-brevo-api-key`
   - `MAIL_FROM` = `Calendar App <no-reply@yourdomain.com>`

---

## Why This Setup Guarantees Zero Errors

| Potential Problem | Solution Implemented |
|---|---|
| **`pnpm: command not found`** | Build command activates pnpm using `corepack enable && corepack prepare pnpm@10.17.1 --activate` before running install. |
| **Prisma migration connection failed during build** | `prisma migrate deploy` runs during `startCommand` inside the runtime container where Render's internal private network DNS resolves. |
| **Missing `DIRECT_URL` error** | Both `DATABASE_URL` and `DIRECT_URL` are linked to the Render database connection string. |
| **Next.js port binding timeout on Render** | `next start` dynamically binds to `process.env.PORT` assigned by Render instead of hardcoded `3004`. |
| **404 on health check** | Root `/health` express route added to backend alongside `/v1/health`. Frontend health check uses `/login`. |
| **CORS blocked on cross-subdomain requests** | Backend CORS dynamically accepts all `*.onrender.com` subdomains in addition to configured `WEB_ORIGIN`. |
| **Auth redirecting to `localhost:3004` on production** | `AuthController` dynamically resolves the frontend origin from `req.headers.referer` if `WEB_ORIGIN` is not yet set. |
| **Double-slash in Next.js API rewrites** | `next.config.ts` sanitizes trailing slashes and ensures HTTP/HTTPS protocol automatically. |
| **Free tier cold start wake-up** | App incorporates resilient retry handling and cookie delegation to eliminate session loss when services spin up. |
