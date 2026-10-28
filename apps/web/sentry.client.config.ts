/**
 * Sentry browser SDK configuration.
 * Loaded automatically by @sentry/nextjs on the client side.
 *
 * Set NEXT_PUBLIC_SENTRY_DSN in Vercel → Environment Variables.
 * When the variable is absent, Sentry runs in no-op mode.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of sessions as replays so you can see exactly what
  // users did before an error — invaluable for debugging production issues.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Trace a fraction of navigations for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [Sentry.replayIntegration()],
});
