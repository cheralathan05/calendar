import { differenceInMinutes, max, min } from 'date-fns';
import { dayInterval, eventInterval } from '@/lib/events/interval';

export function clamp(n: number, minN: number, maxN: number) {
  return Math.max(minN, Math.min(maxN, n));
}

export function eventMinutesWithinDay(e: CalendarEvent, day: Date) {
  const { start: dayStart, end: dayEnd } = dayInterval(day);
  const { start: evStart, end: evEnd } = eventInterval(e);

  const start = max([evStart, dayStart]);
  const end = min([evEnd, dayEnd]);

  const startMin = clamp(differenceInMinutes(start, dayStart), 0, 24 * 60);
  const endMin = clamp(differenceInMinutes(end, dayStart), 0, 24 * 60);

  return { startMin, endMin };
}
