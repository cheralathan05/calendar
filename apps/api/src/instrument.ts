/**
 * Sentry instrumentation — must be imported at the very top of main.ts
 * BEFORE any other imports so Sentry can patch Node.js core modules.
 *
 * In production set the SENTRY_DSN env var (Render → Environment).
 * When SENTRY_DSN is absent, Sentry initialises in a no-op mode so
 * the app starts normally without any observability.
 */
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Attach the environment name to every event for filtering in Sentry UI
  environment: process.env.NODE_ENV ?? 'development',

  // Capture 100% of transactions in dev; tune down in high-traffic production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Prevent accidentally sending local data to Sentry
  enabled: !!process.env.SENTRY_DSN,
});
