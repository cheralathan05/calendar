'use client';

import { useMemo, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the state for the event detail popover and the day-overflow popover.
 * Extracted from CalendarPageClient to keep that component focused on layout.
 */
export function usePopoverState(events: CalendarEvent[]) {
  // ── Event popover ──────────────────────────────────────────────────────────
  const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
  const [eventPopoverEventId, setEventPopoverEventId] = useState<string | null>(null);
  const [eventPopoverRect, setEventPopoverRect] = useState<DOMRect | null>(null);

  // ── Day overflow popover ───────────────────────────────────────────────────
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false);
  const [dayPopoverDate, setDayPopoverDate] = useState<Date | null>(null);
  const [dayPopoverRect, setDayPopoverRect] = useState<DOMRect | null>(null);

  // ── Derived: active event for the event popover ────────────────────────────
  const activeEvent = useMemo(() => {
    if (!eventPopoverEventId) return null;

    // Direct match (works for both regular and already-resolved instance IDs)
    const direct = events.find((e) => e.id === eventPopoverEventId);
    if (direct) return direct;

    // Fallback: if the stored ID is a master ID, find the earliest instance
    const candidates = events.filter((e) => e.recurringEventId === eventPopoverEventId);
    return candidates[0] ?? null;
  }, [events, eventPopoverEventId]);

  // ── Derived: events for the day overflow popover ───────────────────────────
  const dayPopoverEvents = useMemo(() => {
    if (!dayPopoverDate) return [];
    const dayStart = startOfDay(dayPopoverDate).getTime();
    const dayEnd = addDays(startOfDay(dayPopoverDate), 1).getTime();
    return events.filter((e) => {
      const start = new Date(e.start).getTime();
      const end = new Date(e.end).getTime();
      return end > dayStart && start < dayEnd;
    });
  }, [events, dayPopoverDate]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const openEventPopover = (id: string, rect: DOMRect) => {
    setEventPopoverEventId(id);
    setEventPopoverRect(rect);
    setEventPopoverOpen(true);
  };

  const closeEventPopover = () => setEventPopoverOpen(false);

  const openDayPopover = (date: Date, rect: DOMRect) => {
    setDayPopoverDate(date);
    setDayPopoverRect(rect);
    setDayPopoverOpen(true);
  };

  const closeDayPopover = () => setDayPopoverOpen(false);

  return {
    // Event popover
    eventPopoverOpen,
    eventPopoverRect,
    activeEvent,
    openEventPopover,
    closeEventPopover,
    // Key to force re-mount when a different event is selected
    eventPopoverKey: activeEvent?.id ?? eventPopoverEventId ?? 'popover',

    // Day popover
    dayPopoverOpen,
    dayPopoverDate,
    dayPopoverRect,
    dayPopoverEvents,
    openDayPopover,
    closeDayPopover,
  };
}
