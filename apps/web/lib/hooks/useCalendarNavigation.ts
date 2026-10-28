'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { addDays, startOfDay, startOfWeek, endOfWeek } from 'date-fns';

import { formatIsoDate, parseIsoDateOrToday } from '@/lib/date';
import { generateMonthGrid } from '@/lib/month-grid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseView(value: string | null): CalendarView {
  if (value === 'year' || value === 'month' || value === 'week' || value === 'day' || value === 'schedule') return value;
  return 'month';
}

/**
 * Computes the API date range for the current view.
 * The backend requires a bounded window so we calculate exactly what's visible.
 */
function computeRange(view: CalendarView, date: Date): { from: Date; to: Date } {
  if (view === 'day') {
    const from = startOfDay(date);
    return { from, to: addDays(from, 1) };
  }
  if (view === 'week') {
    const from = startOfDay(startOfWeek(date, { weekStartsOn: 0 }));
    const to = addDays(startOfDay(endOfWeek(date, { weekStartsOn: 0 })), 1);
    return { from, to };
  }
  if (view === 'schedule') {
    // 31-day agenda window starting from current date
    const from = startOfDay(date);
    return { from, to: addDays(from, 31) };
  }
  if (view === 'year') {
    // Jan 1 00:00:00 → Dec 31 23:59:59.999 of the same year.
    // A leap year is exactly 366 days — matches the backend MAX_WINDOW_DAYS cap.
    const from = new Date(date.getFullYear(), 0, 1);
    const to = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { from, to };
  }
  // month: use the full 42-cell grid so partial weeks at edges are included
  const cells = generateMonthGrid(date);
  return {
    from: startOfDay(cells[0].date),
    to: addDays(startOfDay(cells[cells.length - 1].date), 1),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages calendar view + date state via URL search params.
 * This keeps the calendar deep-linkable and the browser back button working.
 */
export function useCalendarNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = useMemo(() => parseView(searchParams.get('view')), [searchParams]);
  const date = useMemo(() => parseIsoDateOrToday(searchParams.get('date')), [searchParams]);
  const range = useMemo(() => computeRange(view, date), [view, date]);

  const navigate = (next: { view?: CalendarView; date?: Date }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.view) params.set('view', next.view);
    if (next.date) params.set('date', formatIsoDate(next.date));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return { view, date, range, navigate };
}
