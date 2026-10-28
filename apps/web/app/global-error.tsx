'use client';

import { useEffect } from 'react';

/**
 * Root-layout error boundary (Next.js App Router convention).
 *
 * Catches errors thrown by the root layout itself, which app/error.tsx
 * cannot — it has to render its own <html>/<body> since it replaces the
 * entire root layout when triggered. Providing this explicitly also avoids
 * relying on Next.js's internal default /_global-error page, whose static
 * prerendering has hit upstream build bugs on recent Next.js versions.
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
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-semibold text-[#3c4043]">Something went wrong</h1>
          <p className="max-w-md text-sm text-[#70757a]">
            An unexpected error occurred. Please try again, and if the problem persists, refresh
            the page.
          </p>
          {error.digest && (
            <code className="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
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
              className="rounded-full border border-[#dadce0] px-5 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#f1f3f4]"
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
