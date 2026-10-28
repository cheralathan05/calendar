'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary (Next.js App Router convention).
 *
 * Renders when any component below in the route segment throws during render
 * or in an effect / event handler that wasn't caught locally.
 * Ships the error to Sentry when NEXT_PUBLIC_SENTRY_DSN is configured.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Dynamic import keeps Sentry out of the initial bundle when not configured.
    import('@sentry/nextjs')
      .then(({ captureException }) => captureException(error))
      .catch(() => console.error('[GlobalError]', error));
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-semibold text-[var(--gcal-text,#3c4043)] dark:text-gray-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
        An unexpected error occurred. You can try again, and if the problem persists please refresh
        the page.
      </p>
      {error.digest && (
        <code className="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Error ID: {error.digest}
        </code>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1765c2]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-[var(--gcal-border,#dadce0)] px-5 py-2 text-sm font-medium text-[var(--gcal-text,#3c4043)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
