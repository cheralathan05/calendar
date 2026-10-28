import { apiFetch } from './client';

// ---------------------------------------------------------------------------
// API response shape from the backend
// ---------------------------------------------------------------------------
export type ApiEvent = {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startAt: string;
  endAt: string;
  timeZone: string | null;
  color: string | null;
  recurrenceRule: string | null;
  recurrenceTimeZone: string | null;
  // guests may be a plain list of emails OR an object holding invitation metadata
  guests: string[] | Record<string, unknown> | null;
  attendees?: { email: string; name?: string | null; rsvp: string; permissions?: unknown }[] | null;
  notifications: NotificationItem[] | null;
  visibility: 'public' | 'private' | 'default' | null;
  busyStatus: 'free' | 'busy' | null;
  // meeting fields (optional)
  meetingProvider?: string | null;
  meetingUrl?: string | null;
  meetingData?: unknown;
  recurringEventId: string | null;
  originalStartAt: string | null;
  isRecurringInstance: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurrenceScope = 'this' | 'following' | 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.includes('T') ? value.slice(0, 10) : value;
}

/** Strips the leading "RRULE:" prefix if present. */
export function normalizeRuleOnly(rule: string | null | undefined): string | null {
  if (!rule) return null;
  const trimmed = rule.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase().startsWith('RRULE:') ? trimmed.slice('RRULE:'.length) : trimmed;
}

/** Maps the raw API event shape to the UI CalendarEvent type. */
export function apiEventToCalendarEvent(ev: ApiEvent, currentUserEmail?: string): CalendarEvent {
  // Determine RSVP for the current user (if present in attendees)
  const userAtt = (ev.attendees ?? []).find((a) => a.email === currentUserEmail);
  const userRsvp = userAtt ? userAtt.rsvp : undefined;
  // If guests is an object with lighterColor metadata, prefer that for color
  const guestsMeta =
    ev.guests && typeof ev.guests === 'object' && !Array.isArray(ev.guests)
      ? (ev.guests as Record<string, unknown>)
      : undefined;
  const lighterColor = guestsMeta?.lighterColor as string | undefined | null;

  return {
    id: ev.id,
    calendarId: ev.calendarId,
    title: ev.title,
    start: ev.startAt,
    end: ev.endAt,
    startDate: toDateOnly(ev.startDate),
    endDate: toDateOnly(ev.endDate),
    allDay: ev.allDay,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    recurrence: ev.recurrenceRule ?? null,
    // If the backend stored invitation metadata (recipient copy), prefer
    // the lighterColor provided there so the recipient sees a softer background.
    color: lighterColor ?? ev.color ?? '#0B57D0',
    recurringEventId: ev.recurringEventId ?? undefined,
    originalStartAt: ev.originalStartAt ?? undefined,
    isRecurringInstance: ev.isRecurringInstance,
    guests: ev.guests ?? ev.attendees?.map((a) => a.email) ?? undefined,
    attendees: ev.attendees ?? undefined,
    userRsvp,
    // expose meetingUrl to the calendar UI so the popover/full editor can show a Join action
    // (CalendarEvent keeps a compact shape; components that need meetingUrl will access it via this property)
    meetingUrl: ev.meetingUrl ?? undefined,
    // Note: attendees remain available on the raw ApiEvent when needed via
    // the fetch response; CalendarEvent keeps the compact shape used by the
    // calendar UI components.
    // include attendees for UI components that may want RSVP/permissions
    // cast to any so CalendarEvent keeps the simple shape; components can access attendees via ev.attendees if needed
    // Note: where needed, we can extend CalendarEvent type to include attendees.
    notifications: ev.notifications ?? undefined,
    visibility: ev.visibility ?? 'default',
    busyStatus: ev.busyStatus ?? 'busy',
  };
}

/**
 * Guest input accepted by create/update APIs in the web client — either a simple
 * email string or an object with email + optional permissions.
 */
export type GuestInput = string | { email: string; permissions?: string[] };

/** Normalize guest inputs to an array of email strings suitable for the API.
 * Returns undefined when there are no guests. Filters out falsy/malformed entries.
 */
export function normalizeGuestsToStrings(guests?: Array<GuestInput> | null): string[] | undefined {
  if (!guests || guests.length === 0) return undefined;
  const out = guests
    .map((g) => (typeof g === 'string' ? g : g?.email))
    .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    .map((e) => e.trim());
  return out.length ? out : undefined;
}

// ---------------------------------------------------------------------------
// API calls — all throw ApiError on failure
// ---------------------------------------------------------------------------

export function listEvents(params: { from: Date; to: Date }) {
  const qs = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
  });
  return apiFetch<ApiEvent[]>(`/v1/events?${qs.toString()}`);
}

export function getEvent(id: string) {
  return apiFetch<ApiEvent>(`/v1/events/${encodeURIComponent(id)}`);
}

export function createEvent(input: {
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
  color?: string;
  calendarId?: string;
  recurrenceRule?: string | null;
  timeZone?: string;
  recurrenceTimeZone?: string;
  guests?: Array<string | { email: string; permissions?: string[] }>;
  notifications?: NotificationItem[];
  visibility?: 'public' | 'private' | 'default';
  busyStatus?: 'free' | 'busy';
  // request a meeting to be generated (MVP: Jitsi)
  addMeeting?: boolean;
  meetingProvider?: string;
  meetingUrl?: string;
  meetingData?: unknown;
}) {
  return apiFetch<ApiEvent>('/v1/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEvent(
  id: string,
  input: Partial<{
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    startDate: string;
    endDate: string;
    description: string;
    location: string;
    color: string | null;
    recurrenceRule: string | null;
    timeZone: string;
    recurrenceTimeZone: string;
    guests: Array<string | { email: string; permissions?: string[] }>;
    notifications: NotificationItem[];
    visibility: 'public' | 'private' | 'default';
    busyStatus: 'free' | 'busy';
    addMeeting?: boolean;
    meetingProvider?: string;
    meetingUrl?: string;
    meetingData?: unknown;
  }>,
  scope?: RecurrenceScope,
) {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  return apiFetch<ApiEvent>(`/v1/events/${encodeURIComponent(id)}${qs}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteEvent(id: string, scope?: RecurrenceScope) {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  return apiFetch<void>(`/v1/events/${encodeURIComponent(id)}${qs}`, {
    method: 'DELETE',
  });
}
