import { fromZonedTime } from 'date-fns-tz';
import type { EventInstance, ExceptionRow } from '../event-select';
import {
  dateOnlyFromInstantInTz,
  ensureEndAfterStartDateExclusive,
  naiveFromDateColumn,
} from './date-utils';

/**
 * Merge a per-occurrence exception row onto a freshly-expanded instance.
 * Returns null if the occurrence was cancelled.
 */
export function applyExceptionToInstance(
  instance: EventInstance,
  ex: Omit<ExceptionRow, 'eventId' | 'originalStartAt'>,
  tz: string,
): EventInstance | null {
  if (ex.cancelled) return null;

  const nextAllDay = ex.allDay ?? instance.allDay;

  let nextStartAt = ex.startAt ?? instance.startAt;
  let nextEndAt = ex.endAt ?? instance.endAt;
  let nextStartDate = ex.startDate ?? instance.startDate;
  let nextEndDate = ex.endDate ?? instance.endDate;

  if (ex.allDay === false) {
    nextStartDate = null;
    nextEndDate = null;
  }

  if (nextAllDay) {
    if (!nextStartDate)
      nextStartDate = dateOnlyFromInstantInTz(nextStartAt, tz);
    nextEndDate = ensureEndAfterStartDateExclusive(
      nextStartDate,
      nextEndDate ?? dateOnlyFromInstantInTz(nextEndAt, tz),
    );

    if (ex.startDate || ex.endDate || ex.allDay === true) {
      nextStartAt = fromZonedTime(naiveFromDateColumn(nextStartDate), tz);
      nextEndAt = fromZonedTime(naiveFromDateColumn(nextEndDate), tz);
    }
  } else {
    nextStartDate = null;
    nextEndDate = null;
  }

  return {
    ...instance,
    title: ex.title ?? instance.title,
    description: ex.description ?? instance.description,
    location: ex.location ?? instance.location,
    allDay: nextAllDay,
    startAt: nextStartAt,
    endAt: nextEndAt,
    startDate: nextStartDate,
    endDate: nextEndDate,
    timeZone: ex.timeZone ?? instance.timeZone,
    color: ex.color ?? instance.color,
    guests: ex.guests ?? instance.guests,
    notifications: ex.notifications ?? instance.notifications,
    visibility: ex.visibility ?? instance.visibility,
    busyStatus: ex.busyStatus ?? instance.busyStatus,
  };
}
