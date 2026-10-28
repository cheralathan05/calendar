import { format, isValid, parseISO } from 'date-fns';

/**
 * We store dates in the URL as YYYY-MM-DD (ISO date without time).
 * parseISO understands this format well and returns a Date in local time.
 */
export function parseIsoDateOrToday(value: string | null): Date {
  if (!value) return new Date();
  const d = parseISO(value);
  return isValid(d) ? d : new Date();
}

export function formatIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toLocalDateTimeInputValue(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function startOfDayDefaultHour(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDayExclusive(d: Date) {
  const x = startOfDayDefaultHour(d);
  x.setDate(x.getDate() + 1);
  return x;
}
