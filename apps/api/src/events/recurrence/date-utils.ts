import { addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** DTSTART:YYYYMMDDTHHMMSS (floating, no Z) — used to build a floating RRULE string. */
export function formatFloatingDtstart(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `DTSTART:${y}${m}${day}T${hh}${mm}${ss}`;
}

export function parseDateOnly(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error('Invalid date-only string');
  return new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0),
  );
}

/** A `@db.Date` value arrives as a Date with UTC Y/M/D; return a naive local Date with that Y/M/D. */
export function naiveFromDateColumn(dateCol: Date): Date {
  return new Date(
    dateCol.getUTCFullYear(),
    dateCol.getUTCMonth(),
    dateCol.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

/** Convert a UTC instant to the date-only column representation in a given timezone. */
export function dateOnlyFromInstantInTz(instant: Date, tz: string): Date {
  const z = toZonedTime(instant, tz);
  return new Date(
    Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0, 0),
  );
}

export function ensureEndAfterStartDateExclusive(
  startDate: Date,
  endDate: Date | null,
): Date {
  if (!endDate) return addDays(startDate, 1);
  if (endDate.getTime() <= startDate.getTime()) return addDays(startDate, 1);
  return endDate;
}

/** Convert a UTC instant to a naive Date carrying that wall-clock time in the given timezone. */
export function toLocalNaiveInTz(instantUtc: Date, tz: string): Date {
  const z = toZonedTime(instantUtc, tz);
  return new Date(
    z.getFullYear(),
    z.getMonth(),
    z.getDate(),
    z.getHours(),
    z.getMinutes(),
    z.getSeconds(),
    z.getMilliseconds(),
  );
}

/** Naive local-midnight Date corresponding to the given UTC instant in the given tz. */
export function localMidnightNaiveFromUtcInstant(
  utcInstant: Date,
  tz: string,
): Date {
  const z = toZonedTime(utcInstant, tz);
  return new Date(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0, 0);
}
