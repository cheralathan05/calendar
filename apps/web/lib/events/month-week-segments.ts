import { addDays, parseISO, startOfDay } from 'date-fns';
import { isBarEventInMonth } from './month-classify';

export type WeekBarSegment = {
  event: CalendarEvent;
  startCol: number;
  endColExclusive: number;
  lane: number;
  continuesFromPrevWeek: boolean;
  continuesToNextWeek: boolean;
};

function intersectsRange(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aEnd > bStart && aStart < bEnd;
}

function toDateOnly(s: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

function dateOnlyStartMs(value: string) {
  const d = toDateOnly(value);
  return parseISO(`${d}T00:00:00`).getTime();
}

export function buildWeekBarLayout(weekDates: Date[], events: CalendarEvent[]) {
  const weekStart = startOfDay(weekDates[0]).getTime();
  const weekEnd = startOfDay(addDays(weekDates[6], 1)).getTime(); // exclusive

  const candidates = events.filter(isBarEventInMonth);

  const base = candidates
    .map((ev) => {
      // Prefer date-only range for all-day bars
      const rawStart =
        ev.allDay && ev.startDate ? dateOnlyStartMs(ev.startDate) : parseISO(ev.start).getTime();
      const rawEndExclusive =
        ev.allDay && ev.endDate ? dateOnlyStartMs(ev.endDate) : parseISO(ev.end).getTime();

      if (!intersectsRange(rawStart, rawEndExclusive, weekStart, weekEnd)) return null;

      const DAY_MS = 86400000;

      const segStart = Math.max(rawStart, weekStart);
      const segEndExclusive = Math.min(rawEndExclusive, weekEnd);

      const startCol = Math.max(0, Math.min(6, Math.floor((segStart - weekStart) / DAY_MS)));

      const segEndInclusive = Math.max(segStart, segEndExclusive - 1);
      const lastDayIdx = Math.max(
        0,
        Math.min(6, Math.floor((segEndInclusive - weekStart) / DAY_MS)),
      );
      const endColExclusive = lastDayIdx + 1;

      return {
        event: ev,
        startCol,
        endColExclusive,
        continuesFromPrevWeek: rawStart < weekStart,
        continuesToNextWeek: rawEndExclusive > weekEnd,
      } as Omit<WeekBarSegment, 'lane'>;
    })
    .filter(Boolean) as Omit<WeekBarSegment, 'lane'>[];

  const lanes: { endColExclusive: number }[] = [];
  const packed: WeekBarSegment[] = [];

  for (const seg of base.sort(
    (a, b) => a.startCol - b.startCol || a.endColExclusive - b.endColExclusive,
  )) {
    let lane = 0;
    for (; lane < lanes.length; lane++) {
      if (seg.startCol >= lanes[lane].endColExclusive) break;
    }
    if (!lanes[lane]) lanes[lane] = { endColExclusive: seg.endColExclusive };
    else lanes[lane].endColExclusive = seg.endColExclusive;

    packed.push({ ...seg, lane } as WeekBarSegment);
  }

  return { segments: packed, laneCount: lanes.length };
}
