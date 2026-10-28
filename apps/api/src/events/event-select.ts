import { Prisma } from '@prisma/client';

/** Single source of truth for the Event columns we return to clients. */
export const EVENT_SELECT = {
  id: true,
  calendarId: true,
  title: true,
  description: true,
  location: true,
  allDay: true,
  startAt: true,
  endAt: true,
  startDate: true,
  endDate: true,
  timeZone: true,
  color: true,
  recurrenceRule: true,
  recurrenceTimeZone: true,
  guests: true,
  notifications: true,
  visibility: true,
  busyStatus: true,
  // meeting fields
  meetingProvider: true,
  meetingUrl: true,
  meetingData: true,
  createdAt: true,
  updatedAt: true,
  attendees: {
    select: { email: true, name: true, rsvp: true, permissions: true },
  },
} satisfies Prisma.EventSelect;

export type EventRow = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

export const EXCEPTION_SELECT = {
  eventId: true,
  originalStartAt: true,
  cancelled: true,
  title: true,
  description: true,
  location: true,
  allDay: true,
  startAt: true,
  endAt: true,
  startDate: true,
  endDate: true,
  color: true,
  timeZone: true,
  guests: true,
  notifications: true,
  visibility: true,
  busyStatus: true,
  // meeting override support
  meetingProvider: true,
  meetingUrl: true,
  meetingData: true,
} satisfies Prisma.EventRecurrenceExceptionSelect;

export type ExceptionRow = Prisma.EventRecurrenceExceptionGetPayload<{
  select: typeof EXCEPTION_SELECT;
}>;

/** A materialized event occurrence returned by the API (master OR expanded instance). */
export type EventInstance = {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startAt: Date;
  endAt: Date;
  startDate: Date | null;
  endDate: Date | null;
  timeZone: string | null;
  color: string | null;
  guests: unknown;
  notifications: unknown;
  visibility: string | null;
  busyStatus: string | null;
  createdAt: Date;
  updatedAt: Date;

  recurrenceRule?: string | null;
  recurrenceTimeZone?: string | null;

  // meeting fields
  meetingProvider?: string | null;
  meetingUrl?: string | null;
  meetingData?: unknown;

  recurringEventId: string | null;
  originalStartAt: string | null; // ISO UTC
  isRecurringInstance: boolean;

  attendees?: {
    email: string;
    name?: string | null;
    rsvp: string;
    permissions?: unknown;
  }[];
};
