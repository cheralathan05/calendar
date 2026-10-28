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
