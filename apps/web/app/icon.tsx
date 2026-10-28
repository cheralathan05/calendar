import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Disable Next.js static/ISR caching so the icon is generated fresh on each
// CDN-level request. The response sets Cache-Control to expire at UTC midnight
// so both the CDN and browsers re-fetch exactly once per day.
export const revalidate = 0;

/** Seconds remaining until UTC midnight — used as Cache-Control max-age. */
function secondsUntilMidnight(now: Date): number {
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  // Floor at 60 s so the cache never expires "instantly" due to rounding.
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export default function Icon() {
  const now = new Date();
  const day = String(now.getUTCDate());
  const weekday = now
    .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    .toUpperCase();
  const ttl = secondsUntilMidnight(now);

  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          borderRadius: 14,
          border: '2px solid #E5E7EB',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#0B57D0',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {weekday}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1,
            }}
          >
            {day}
          </div>
        </div>
      </div>
    ),
    {
      width: 64,
      height: 64,
      headers: {
        // Cache until UTC midnight so browsers and Vercel's CDN both re-fetch
        // exactly once per day. Without this header both layers apply aggressive
        // default caching and the favicon stays stale until a hard refresh.
        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`,
      },
    },
  );
}
