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
    await runProcess(
      'pnpm',
      ['--filter', 'api', 'exec', 'ts-node', 'prisma/seed.ts'],
      rootDir
    );
    console.log('[start-render] ✅ Seed script completed.');
  } catch (err) {
    console.warn('[start-render] ⚠️ Seed notice:', err.message);
  }
}

function startServer() {
  console.log('[start-render] 🚀 Starting NestJS API in production mode...');
  const child = spawn('node', ['dist/src/main.js'], {
    cwd: apiDir,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  const forwardSignal = (sig) => {
    try {
      child.kill(sig);
    } catch (_) {}
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

async function main() {
  console.log('================================================================');
  console.log('🚀 CALENDAR-API RENDER PRODUCTION STARTUP');
  console.log('================================================================');

  const dbOk = await runDatabaseMigrations();
  if (!dbOk) {
    console.error('[start-render] ❌ Aborting startup: Could not establish database connection.');
    process.exit(1);
  }

  await seedDatabase();
  startServer();
}

main().catch((err) => {
  console.error('[start-render] Fatal error during startup:', err);
  process.exit(1);
});
