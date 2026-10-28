'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'calendar-clone:events:v1';

function safeParse(json: string | null): CalendarEvent[] {
  try {
    if (!json) return [];
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data as CalendarEvent[];
  } catch {
    return [];
  }
}

export function useEventsStorage() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === 'undefined') return [];
    return safeParse(localStorage.getItem(STORAGE_KEY));
  });

  //   save on events change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const api = useMemo(
    () => ({
      events,
      setEvents,
      addEvent: (event: CalendarEvent) => {
        setEvents((prev) => [...prev, event]);
      },
      updateEvent: (next: CalendarEvent) => {
        setEvents((prev) => prev.map((ev) => (ev.id === next.id ? next : ev)));
      },
      removeEvent: (id: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      },
      clearAll: () => {
        setEvents([]);
      },
    }),
    [events],
  );
  return api;
}
