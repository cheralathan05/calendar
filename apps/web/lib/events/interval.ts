import { addDays, parseISO, startOfDay } from 'date-fns';

export function eventInterval(e: CalendarEvent) {
  return { start: parseISO(e.start), end: parseISO(e.end) };
}

export function dayInterval(day: Date) {
  const start = startOfDay(day);
  const end = addDays(start, 1);
  return { start, end };
}
