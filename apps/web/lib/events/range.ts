import { parseISO } from 'date-fns';

function toDateOnly(s: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

export function getEventRangeMs(ev: CalendarEvent): { startMs: number; endMsExclusive: number } {
  if (ev.allDay && ev.startDate && ev.endDate) {
    const sd = toDateOnly(ev.startDate);
    const ed = toDateOnly(ev.endDate);
    return {
      startMs: parseISO(`${sd}T00:00:00`).getTime(),
      endMsExclusive: parseISO(`${ed}T00:00:00`).getTime(),
    };
  }

  return {
    startMs: parseISO(ev.start).getTime(),
    endMsExclusive: parseISO(ev.end).getTime(),
  };
}
