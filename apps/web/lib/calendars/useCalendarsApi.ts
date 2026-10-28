'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';

export type ApiCalendar = {
  id: string;
  name: string;
  color: string | null;
};

export const CALENDAR_COLORS = [
  '#039BE5',
  '#0B57D0',
  '#4CAF50',
  '#FFB300',
  '#F44336',
  '#9C27B0',
  '#FF7043',
  '#607D8B',
];

export function getCalendarColor(cal: ApiCalendar, index: number): string {
  return cal.color ?? CALENDAR_COLORS[index % CALENDAR_COLORS.length]!;
}

export function useCalendarsApi() {
  const [calendars, setCalendars] = useState<ApiCalendar[]>([]);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ApiCalendar[]>('/v1/calendars');
      setCalendars(data);
      // Only initialise visibility on first load (don't reset user toggles on re-fetch)
      setVisibleCalendarIds((prev) => {
        if (prev.size === 0) return new Set(data.map((c) => c.id));
        // Ensure any newly created calendar is visible by default
        const next = new Set(prev);
        data.forEach((c) => {
          if (!prev.has(c.id)) next.add(c.id);
        });
        return next;
      });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        console.error('[useCalendarsApi] fetch failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleCalendar = useCallback((id: string) => {
    setVisibleCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const createCalendar = useCallback(
    async (name: string, color?: string) => {
      await apiFetch<ApiCalendar>('/v1/calendars', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
      });
      await refresh();
    },
    [refresh],
  );

  const updateCalendar = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      await apiFetch<ApiCalendar>(`/v1/calendars/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      await refresh();
    },
    [refresh],
  );

  const deleteCalendar = useCallback(
    async (id: string) => {
      await apiFetch<void>(`/v1/calendars/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setVisibleCalendarIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await refresh();
    },
    [refresh],
  );

  return useMemo(
    () => ({
      calendars,
      visibleCalendarIds,
      loading,
      refresh,
      toggleCalendar,
      createCalendar,
      updateCalendar,
      deleteCalendar,
    }),
    [
      calendars,
      visibleCalendarIds,
      loading,
      refresh,
      toggleCalendar,
      createCalendar,
      updateCalendar,
      deleteCalendar,
    ],
  );
}
