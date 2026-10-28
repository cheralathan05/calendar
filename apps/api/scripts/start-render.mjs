/**
 * start-render.mjs
 * Production entrypoint for calendar-api web service on Render.
 * 
 * Features:
 * 1. Resilient PostgreSQL migration runner with automatic retry & backoff.
 *    (Crucial on Render because postgres container often spins up concurrently
 *    with web service, causing initial connection attempts to fail).
 * 2. Automatic idempotent database seed for instant demo access.
 * 3. Graceful signal propagation (SIGTERM, SIGINT) to NestJS process.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(apiDir, '..', '..');

const MAX_RETRIES = 25;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error(`[start-render] Process error:`, err.message);
      resolve(false);
    });
  });
}

function sanitizeDatabaseUrls() {
  const isLocalhost = (url) =>
    Boolean(url && (url.includes('localhost') || url.includes('127.0.0.1')));
  const isRemote = (url) => Boolean(url && !isLocalhost(url));

  if (isLocalhost(process.env.DATABASE_URL) && isRemote(process.env.DIRECT_URL)) {
    console.warn('[start-render] ⚠️ DATABASE_URL was set to localhost, but DIRECT_URL points to a remote database.');
    console.warn('[start-render] 🔄 Auto-correcting DATABASE_URL to DIRECT_URL for production execution.');
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  } else if (!process.env.DATABASE_URL && isRemote(process.env.DIRECT_URL)) {
    console.log('[start-render] ℹ️ DATABASE_URL was empty; populating from DIRECT_URL.');
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }

  if (process.env.NODE_ENV === 'production' && isLocalhost(process.env.DATABASE_URL)) {
    console.error('[start-render] ❌ WARNING: DATABASE_URL is pointing to localhost in production on Render.');
    console.error('[start-render] ❌ Please verify DATABASE_URL in the Render Dashboard environment settings.');
  }
}

async function runDatabaseMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('[start-render] ⚠️ DATABASE_URL is not defined. Skipping migrations.');
    return true;
  }

  console.log('[start-render] 🔄 Connecting to PostgreSQL and applying Prisma migrations...');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[start-render] Migration attempt ${attempt}/${MAX_RETRIES}...`);

    // Use pnpm from root to run prisma migrate deploy
    const success = await runProcess(
      'pnpm',
      ['--filter', 'api', 'exec', 'prisma', 'migrate', 'deploy'],
      rootDir
    );

    if (success) {
      console.log('[start-render] ✅ Database migrations applied successfully!');
      return true;
    }

    if (attempt < MAX_RETRIES) {
      console.log(`[start-render] ⏳ PostgreSQL not ready yet. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.error('[start-render] ❌ Failed to apply database migrations after maximum retries.');
  return false;
}

async function seedDatabase() {
  const allowDemo = (process.env.ALLOW_DEMO ?? '').toLowerCase() === 'true' || process.env.ALLOW_DEMO === '1';
  if (!allowDemo) {
    console.log('[start-render] Demo data seeding is disabled (ALLOW_DEMO != true).');
    return;
  }

  console.log('[start-render] 🌱 Seeding demo users and calendars...');
  try {
    const success = await runProcess(
      'pnpm',
      ['--filter', 'api', 'exec', 'ts-node', 'prisma/seed.ts'],
      rootDir
    );
    if (success) {
      console.log('[start-render] ✅ Seed script completed successfully.');
    } else {
      console.warn('[start-render] ⚠️ Seed script finished with non-zero exit code.');
    }
  } catch (err) {
    console.warn('[start-render] ⚠️ Seed notice:', err.message);
  }
}

async function ensureFrontendBuilt() {
  const webDir = path.resolve(rootDir, 'apps', 'web');
  const nextBuildDir = path.join(webDir, '.next');
  if (!fs.existsSync(nextBuildDir)) {
    console.log('[start-render] 📦 Building Next.js frontend (apps/web)...');
    const success = await runProcess('pnpm', ['--filter', 'web', 'run', 'build'], rootDir);
    if (!success) {
      console.warn('[start-render] ⚠️ Next.js build completed with non-zero exit code.');
    }
  }
}

async function startServer() {
  console.log('================================================================');
  console.log('🚀 CALENDAR MONOLITHIC RUNTIME (NESTJS API + NEXT.JS FRONTEND)');
  console.log('================================================================');

  await ensureFrontendBuilt();

  const publicPort = String(process.env.PORT || '3000');
  const apiInternalPort = publicPort === '3005' ? '3006' : '3005';

  console.log(`[start-render] 🔌 NestJS Internal API Port: ${apiInternalPort}`);
  console.log(`[start-render] 🌐 Next.js Public Web Port: ${publicPort}`);

  // 1. Start NestJS Backend on internal port
  console.log(`[start-render] 🚀 Launching NestJS Backend API (internal port ${apiInternalPort})...`);
  const apiEnv = {
    ...process.env,
    PORT: apiInternalPort,
    WEB_ORIGIN: `http://localhost:${publicPort},https://*.onrender.com`,
  };

  const apiProcess = spawn('node', ['dist/src/main.js'], {
    cwd: apiDir,
    stdio: 'inherit',
    env: apiEnv,
    shell: true,
  });

  // Wait for NestJS to initialize
  await sleep(3000);

  // 2. Start Next.js Frontend on Render's public PORT
  console.log(`[start-render] 🎨 Launching Next.js Calendar Web UI (public port ${publicPort})...`);
  const webDir = path.resolve(rootDir, 'apps', 'web');
  const webEnv = {
    ...process.env,
    PORT: publicPort,
    INTERNAL_API_URL: `http://127.0.0.1:${apiInternalPort}`,
    NEXT_PUBLIC_API_URL: '', // relative URLs proxy through Next.js
  };

  const webProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', publicPort], {
    cwd: webDir,
    stdio: 'inherit',
    env: webEnv,
    shell: true,
  });

  const forwardSignal = (sig) => {
    try { apiProcess.kill(sig); } catch (_) {}
    try { webProcess.kill(sig); } catch (_) {}
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  webProcess.on('close', (code) => {
    console.log(`[start-render] Next.js process exited with code ${code}`);
    try { apiProcess.kill(); } catch (_) {}
    process.exit(code ?? 0);
  });

  apiProcess.on('close', (code) => {
    console.log(`[start-render] NestJS process exited with code ${code}`);
    try { webProcess.kill(); } catch (_) {}
    process.exit(code ?? 0);
  });
}

async function main() {
  console.log('================================================================');
  console.log('🚀 CALENDAR MONOLITHIC RENDER PRODUCTION STARTUP');
  console.log('================================================================');

  sanitizeDatabaseUrls();

  const dbOk = await runDatabaseMigrations();
  if (!dbOk) {
    console.error('[start-render] ❌ Aborting startup: Could not establish database connection.');
    process.exit(1);
  }

  await seedDatabase();
  await startServer();
}

main().catch((err) => {
  console.error('[start-render] Fatal error during startup:', err);
  process.exit(1);
});


