import { addDays, startOfDay } from 'date-fns';
import { getEventRangeMs } from '@/lib/events/range';

/**
 * Predicate: a timed event whose [start, end) spans multiple calendar days.
 */
export function isCrossDayTimedEventOnCalendar(ev: CalendarEvent) {
  if (ev.allDay) return false;
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  return (
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate()
  );
}

/**
 * Comparison used for ordering events inside a single day bucket:
 *   1. cross-day timed events first
 *   2. then all-day events
 *   3. then other timed events by start time
 */
export function compareEventsInDayBucket(a: CalendarEvent, b: CalendarEvent): number {
  const aCross = isCrossDayTimedEventOnCalendar(a) ? 1 : 0;
  const bCross = isCrossDayTimedEventOnCalendar(b) ? 1 : 0;
  if (aCross !== bCross) return bCross - aCross;

  const aAllDay = a.allDay ? 1 : 0;
  const bAllDay = b.allDay ? 1 : 0;
  if (aAllDay !== bAllDay) return bAllDay - aAllDay;

  const aStart = new Date(a.start).getTime();
  const bStart = new Date(b.start).getTime();
  return aStart - bStart;
}

export function eventsForDay(events: CalendarEvent[], day: Date) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime(); // exclusive

  return events.filter((ev) => {
    const { startMs, endMsExclusive } = getEventRangeMs(ev);
    return startMs < dayEnd && endMsExclusive > dayStart;
  });
}
