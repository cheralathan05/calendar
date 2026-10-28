import { parseISO } from 'date-fns';

function toDateOnly(s: string) {
  // Accept "YYYY-MM-DD" or ISO datetime like "YYYY-MM-DDT00:00:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

export function getEventLayoutRange(ev: CalendarEvent): {
  startMs: number;
  endMsExclusive: number;
} {
  if (ev.allDay && ev.startDate && ev.endDate) {
    const sd = toDateOnly(ev.startDate);
    const ed = toDateOnly(ev.endDate);

    const s = parseISO(`${sd}T00:00:00`);
    const e = parseISO(`${ed}T00:00:00`);
    return { startMs: s.getTime(), endMsExclusive: e.getTime() };
  }

  const s = parseISO(ev.start).getTime();
  const e = parseISO(ev.end).getTime();
  return { startMs: s, endMsExclusive: e };
}
