/**
 * Calendar loading skeletons — match each view's structure so the layout
 * doesn't shift when real data arrives. We keep these intentionally simple
 * (no spinner overlap) to preserve perceived performance.
 *
 * The `animate-pulse` class drives the shimmer; tailwind provides it.
 */

export function MonthSkeleton() {
  // 6 weeks × 7 days
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="grid grid-cols-7 border-b border-[var(--gcal-border,#dadce0)] dark:border-gray-700">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="py-2 text-center">
            <span className="inline-block h-3 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {Array.from({ length: 6 }).map((_, w) => (
        <div key={w} className="grid grid-cols-7">
          {Array.from({ length: 7 }).map((__, d) => (
            <div
              key={d}
              className="flex min-h-[64px] flex-col gap-1 border-r border-b border-[var(--gcal-border,#dadce0)] p-1 sm:min-h-[120px] sm:p-2 dark:border-gray-700"
            >
              <span className="mx-auto h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              {/* event bars placeholder, desktop only */}
              <span className="hidden h-2 w-3/4 animate-pulse rounded bg-gray-200 sm:block dark:bg-gray-700" />
              <span className="hidden h-2 w-1/2 animate-pulse rounded bg-gray-200 sm:block dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function WeekSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* day headers */}
      <div className="grid grid-cols-[36px_repeat(7,minmax(0,1fr))] border-b border-[var(--gcal-border,#dadce0)] sm:grid-cols-[56px_repeat(7,minmax(0,1fr))] dark:border-gray-700">
        <div />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <span className="h-2 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <span className="h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* hour rows */}
      <div>
        {Array.from({ length: 12 }).map((_, h) => (
          <div
            key={h}
            className="grid h-12 grid-cols-[36px_repeat(7,minmax(0,1fr))] border-b border-[var(--gcal-border,#dadce0)] sm:grid-cols-[56px_repeat(7,minmax(0,1fr))] dark:border-gray-700"
          >
            <div />
            {Array.from({ length: 7 }).map((__, d) => (
              <div
                key={d}
                className="border-l border-[var(--gcal-border,#dadce0)] dark:border-gray-700"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DaySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* day header */}
      <div className="grid grid-cols-[36px_1fr] border-b border-[var(--gcal-border,#dadce0)] sm:grid-cols-[56px_1fr] dark:border-gray-700">
        <div />
        <div className="flex flex-col items-center gap-1 py-2">
          <span className="h-2 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <span className="h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* hour rows */}
      <div>
        {Array.from({ length: 12 }).map((_, h) => (
          <div
            key={h}
            className="grid h-12 grid-cols-[36px_1fr] border-b border-[var(--gcal-border,#dadce0)] sm:grid-cols-[56px_1fr] dark:border-gray-700"
          >
            <div />
            <div className="border-l border-[var(--gcal-border,#dadce0)] dark:border-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
