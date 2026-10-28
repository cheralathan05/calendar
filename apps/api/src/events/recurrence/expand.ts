import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import type { EventInstance, EventRow, ExceptionRow } from '../event-select';
import {
  dateOnlyFromInstantInTz,
  ensureEndAfterStartDateExclusive,
  localMidnightNaiveFromUtcInstant,
  naiveFromDateColumn,
  toLocalNaiveInTz,
} from './date-utils';
import { buildFloatingRule, generateAfterExclusive } from './rule';
import { applyExceptionToInstance } from './exceptions';
import { exceptionKey, makeInstanceId } from './instance-id';

// Small gated debug helper: prints only when DEBUG_RECURRENCE=1 and NODE_ENV=test.
const DEBUG_RECURRENCE_ENABLED =
  process.env.NODE_ENV === 'test' && process.env.DEBUG_RECURRENCE === '1';
function dbg(...args: unknown[]) {
  if (DEBUG_RECURRENCE_ENABLED) {
    console.error(...args);
  }
}

/** Hard cap on materialized occurrences per master event in a window — DoS guardrail. */
export const MAX_OCCURRENCES = 2000;

/** Turn a non-recurring DB row into an EventInstance (handles all-day normalization). */
export function masterToInstance(ev: EventRow): EventInstance {
  if (ev.allDay && ev.startDate && ev.endDate) {
    const tz = ev.recurrenceTimeZone ?? ev.timeZone ?? 'UTC';
    const startAt = fromZonedTime(naiveFromDateColumn(ev.startDate), tz);
    const endAt = fromZonedTime(naiveFromDateColumn(ev.endDate), tz);
    return {
      ...ev,
      allDay: true,
      startAt,
      endAt,
      recurrenceRule: null,
      recurringEventId: null,
      originalStartAt: null,
      isRecurringInstance: false,
    };
  }
  return {
    ...ev,
    recurringEventId: null,
    originalStartAt: null,
    isRecurringInstance: false,
  };
}

/**
 * Expand a recurring master into individual occurrences inside [from, to),
 * applying matching exceptions. Falls back to returning the master if rrule parsing fails.
 */
export function expandRecurringMaster(
  ev: EventRow,
  from: Date,
  to: Date,
  exceptionMap: Map<string, ExceptionRow>,
): EventInstance[] {
  const tz = ev.recurrenceTimeZone ?? ev.timeZone ?? 'UTC';
  const ruleOnly = ev.recurrenceRule!;
  // Parse UNTIL from the rule if present so we can defensively filter
  // occurrences that are past the declared UNTIL (handles formatting oddities).
  let untilUtc: Date | null = null;
  const untilMatch = /UNTIL=(\d{8}T\d{6}Z?)/i.exec(ruleOnly);
  if (untilMatch) {
    const raw = untilMatch[1];
    if (raw.endsWith('Z')) {
      // UTC UNTIL like 20260312T095959Z -> 2026-03-12T09:59:59Z
      const y = raw.slice(0, 4);
      const m = raw.slice(4, 6);
      const d = raw.slice(6, 8);
      const hh = raw.slice(9, 11);
      const mm = raw.slice(11, 13);
      const ss = raw.slice(13, 15);
      untilUtc = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
    } else {
      // Floating UNTIL (no Z) treat as local in the event tz and convert to UTC
      const y = raw.slice(0, 4);
      const m = raw.slice(4, 6);
      const d = raw.slice(6, 8);
      const hh = raw.slice(9, 11);
      const mm = raw.slice(11, 13);
      const ss = raw.slice(13, 15);
      const naive = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss),
        0,
      );
      // convert naive local-in-tz to UTC instant
      untilUtc = fromZonedTime(naive, tz);
    }
  }
  const durationMs = ev.endAt.getTime() - ev.startAt.getTime();
  const out: EventInstance[] = [];

  // Debug: ensure master has a title (should always be true) — helps diagnose
  // unexpected undefined title observations in tests.
  if (typeof ev.title === 'undefined') {
    dbg('expandRecurringMaster: master has undefined title', {
      eventId: ev.id,
      ev,
    });
  }

  try {
    if (ev.allDay) {
      // ── all-day: date-only is the source of truth, rule iterated as floating local
      const startDateCol =
        ev.startDate ?? dateOnlyFromInstantInTz(ev.startAt, tz);
      const endDateCol = ensureEndAfterStartDateExclusive(
        startDateCol,
        ev.endDate ?? dateOnlyFromInstantInTz(ev.endAt, tz),
      );

      const masterStartNaive = naiveFromDateColumn(startDateCol);
      const masterEndNaiveExclusive = naiveFromDateColumn(endDateCol);
      const masterDurationDays = Math.max(
        1,
        Math.round(
          (masterEndNaiveExclusive.getTime() - masterStartNaive.getTime()) /
            86_400_000,
        ),
      );

      const rule = buildFloatingRule(ruleOnly, masterStartNaive);
      const fromNaive = localMidnightNaiveFromUtcInstant(from, tz);
      // For all-day expansions treat the query `to` bound as inclusive of the
      // local calendar date at the `to` midnight. This ensures weekday-only
      // rules with COUNT that fall on the `to` date are included in the window
      // (matches previous behavior expected by tests/clients).
      const toNaive = addDays(localMidnightNaiveFromUtcInstant(to, tz), 1);

      // Optional debug logging for CI troubleshooting.
      if (DEBUG_RECURRENCE_ENABLED) {
        try {
          const occNaivePreview = generateAfterExclusive({
            rule,
            fromNaive,
            toNaive,
            max: MAX_OCCURRENCES,
          }).map((d) => d.toISOString());
          dbg('expandRecurringMaster DEBUG', {
            eventId: ev.id,
            ruleOnly,
            tz,
            masterStartNaive: masterStartNaive.toISOString(),
            fromNaive: fromNaive.toISOString(),
            toNaive: toNaive.toISOString(),
            occNaivePreview,
          });
        } catch {
          // ignore logging errors
        }
      }

      const occNaive = generateAfterExclusive({
        rule,
        fromNaive,
        toNaive,
        max: MAX_OCCURRENCES,
      });

      for (const occStartNaive of occNaive) {
        const occEndNaiveExclusive = addDays(occStartNaive, masterDurationDays);
        const occStartUtc = fromZonedTime(occStartNaive, tz);
        const occEndUtc = fromZonedTime(occEndNaiveExclusive, tz);
        // For all-day events we treat an occurrence that starts exactly at the
        // query `to` instant as inside the requested window (tests and UI
        // expect the date-only `to` bound to be inclusive of that local day).
        // Keep strict >= for timed events elsewhere.
        if (occEndUtc <= from || occStartUtc > to) continue;

        const occStartDateCol = dateOnlyFromInstantInTz(occStartUtc, tz);
        const occEndDateCol = addDays(occStartDateCol, masterDurationDays);
        const originalStartAt = occStartUtc.toISOString();

        const instance: EventInstance = {
          ...ev,
          // Ensure title is always present on expanded instances (defensive).
          title: ev.title,
          id: makeInstanceId(ev.id, originalStartAt),
          allDay: true,
          startAt: occStartUtc,
          endAt: occEndUtc,
          startDate: occStartDateCol,
          endDate: occEndDateCol,
          recurringEventId: ev.id,
          originalStartAt,
          isRecurringInstance: true,
        };

        const ex = exceptionMap.get(exceptionKey(ev.id, originalStartAt));
        const applied = ex
          ? applyExceptionToInstance(instance, ex, tz)
          : instance;
        // Defensive: if applied exists but title ended up undefined, fall back
        // to the master's title so tests and consumers don't receive undefined.
        if (applied && typeof applied.title === 'undefined')
          applied.title = ev.title;
        if (applied) out.push(applied);
      }
    } else {
      // ── timed: iterate the rule in event-local time so weekdays don't drift in UTC
      const masterStartNaive = toLocalNaiveInTz(ev.startAt, tz);
      const rule = buildFloatingRule(ruleOnly, masterStartNaive);
      const fromNaive = toLocalNaiveInTz(from, tz);
      const toNaive = toLocalNaiveInTz(to, tz);

      const occNaive = generateAfterExclusive({
        rule,
        fromNaive,
        toNaive,
        max: MAX_OCCURRENCES,
      });

      for (const occStartNaive of occNaive) {
        const occStartUtc = fromZonedTime(occStartNaive, tz);
        const occEndUtc = new Date(occStartUtc.getTime() + durationMs);
        if (occEndUtc <= from || occStartUtc >= to) continue;

        const originalStartAt = occStartUtc.toISOString();

        const instance: EventInstance = {
          ...ev,
          title: ev.title,
          id: makeInstanceId(ev.id, originalStartAt),
          allDay: false,
          startAt: occStartUtc,
          endAt: occEndUtc,
          startDate: null,
          endDate: null,
          recurringEventId: ev.id,
          originalStartAt,
          isRecurringInstance: true,
        };

        const ex = exceptionMap.get(exceptionKey(ev.id, originalStartAt));
        const applied = ex
          ? applyExceptionToInstance(instance, ex, tz)
          : instance;
        if (applied && typeof applied.title === 'undefined')
          applied.title = ev.title;
        if (applied) out.push(applied);
      }
    }
  } catch {
    // Fallback: return master unexpanded so the UI doesn't lose the event
    out.push(masterToInstance(ev));
  }

  // expansion complete

  // If rule had an UNTIL we might defensively filter any occurrences that lie
  // after that instant (some rrule parsing edge-cases can produce an extra
  // occurrence; this ensures consistency with the explicit UNTIL value).
  if (untilUtc) {
    return out.filter((inst) => inst.startAt.getTime() <= untilUtc.getTime());
  }

  return out;
}
