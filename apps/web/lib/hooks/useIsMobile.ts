'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` when the viewport is narrower than the given breakpoint.
 * Defaults to Tailwind's `sm` (640px) so it matches CSS class behavior.
 *
 * SSR-safe: initial render returns `false`; updates after mount via matchMedia.
 */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);

    const onChange = () => setIsMobile(mq.matches);
    onChange(); // sync once on mount

    // Modern API (Safari < 14 needs addListener; safe to skip in 2026)
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpointPx]);

  return isMobile;
}
