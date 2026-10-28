import { parseISO, startOfDay, subMilliseconds } from 'date-fns';

/**
 * Returns true for timed events that actually span multiple calendar days.
 * Uses end-1ms to respect the [start, end) semantics used throughout the app.
 */
export function isCrossDayTimedEvent(ev: CalendarEvent) {
  if (ev.allDay) return false;
  const s = parseISO(ev.start);
  const eInclusive = subMilliseconds(parseISO(ev.end), 1);
  return startOfDay(s).getTime() !== startOfDay(eInclusive).getTime();
}

/**
 * In month view, an event is rendered as a horizontal "bar" if it's either
 * an all-day event or a timed event that spans midnight.
 */
export function isBarEventInMonth(ev: CalendarEvent) {
  return !!ev.allDay || isCrossDayTimedEvent(ev);
}
