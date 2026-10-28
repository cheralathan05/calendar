import { describe, expect, it } from 'vitest';

import { compareEventsInDayBucket, eventsForDay, isCrossDayTimedEventOnCalendar } from './day';

function makeEvent(opts: {
  id?: string;
  start: string;
  end: string;
  allDay?: boolean;
}): CalendarEvent {
  return {
    id: opts.id ?? 'evt',
    title: 't',
    start: opts.start,
    end: opts.end,
    allDay: opts.allDay ?? false,
    color: '#039BE5',
  };
}

describe('isCrossDayTimedEventOnCalendar', () => {
  it('returns false for all-day events', () => {
    const ev = makeEvent({
      start: '2026-05-15T00:00:00',
      end: '2026-05-16T00:00:00',
      allDay: true,
    });
    expect(isCrossDayTimedEventOnCalendar(ev)).toBe(false);
  });

  it('returns false for timed events within the same day', () => {
    const ev = makeEvent({ start: '2026-05-15T09:00:00', end: '2026-05-15T10:00:00' });
    expect(isCrossDayTimedEventOnCalendar(ev)).toBe(false);
  });

  it('returns true when end day differs from start day', () => {
    const ev = makeEvent({ start: '2026-05-15T22:00:00', end: '2026-05-16T02:00:00' });
    expect(isCrossDayTimedEventOnCalendar(ev)).toBe(true);
  });
});

describe('compareEventsInDayBucket', () => {
  it('puts cross-day timed events before all-day events', () => {
    const crossDay = makeEvent({
      id: 'cd',
      start: '2026-05-15T22:00:00',
      end: '2026-05-16T02:00:00',
    });
    const allDay = makeEvent({
      id: 'ad',
      start: '2026-05-15T00:00:00',
      end: '2026-05-16T00:00:00',
      allDay: true,
    });
    expect(compareEventsInDayBucket(crossDay, allDay)).toBeLessThan(0);
  });

  it('puts all-day events before regular timed events', () => {
    const allDay = makeEvent({
      id: 'ad',
      start: '2026-05-15T00:00:00',
      end: '2026-05-16T00:00:00',
      allDay: true,
    });
    const timed = makeEvent({ id: 't', start: '2026-05-15T09:00:00', end: '2026-05-15T10:00:00' });
    expect(compareEventsInDayBucket(allDay, timed)).toBeLessThan(0);
  });

  it('orders two timed events by start time ascending', () => {
    const early = makeEvent({ id: 'e', start: '2026-05-15T09:00:00', end: '2026-05-15T10:00:00' });
    const late = makeEvent({ id: 'l', start: '2026-05-15T11:00:00', end: '2026-05-15T12:00:00' });
    expect(compareEventsInDayBucket(early, late)).toBeLessThan(0);
  });
});

describe('eventsForDay', () => {
  const DAY = new Date('2026-05-15T00:00:00');

  it('includes events fully within the day', () => {
    const evs = [makeEvent({ start: '2026-05-15T09:00:00', end: '2026-05-15T10:00:00' })];
    expect(eventsForDay(evs, DAY)).toHaveLength(1);
  });

  it('excludes events fully before the day', () => {
    const evs = [makeEvent({ start: '2026-05-14T09:00:00', end: '2026-05-14T10:00:00' })];
    expect(eventsForDay(evs, DAY)).toHaveLength(0);
  });

  it('excludes events fully after the day', () => {
    const evs = [makeEvent({ start: '2026-05-16T09:00:00', end: '2026-05-16T10:00:00' })];
    expect(eventsForDay(evs, DAY)).toHaveLength(0);
  });

  // Half-open semantics: an event ending exactly at 00:00 of the day
  // does NOT belong to the day (boundary excluded). This matches Google
  // Calendar behavior and is the reason endMsExclusive comparison uses `>`.
  it('excludes an event ending exactly at start-of-day', () => {
    const evs = [makeEvent({ start: '2026-05-14T23:00:00', end: '2026-05-15T00:00:00' })];
    expect(eventsForDay(evs, DAY)).toHaveLength(0);
  });

  it('includes a cross-day event that overlaps the day partially', () => {
    const evs = [makeEvent({ start: '2026-05-14T22:00:00', end: '2026-05-15T01:00:00' })];
    expect(eventsForDay(evs, DAY)).toHaveLength(1);
  });
});
