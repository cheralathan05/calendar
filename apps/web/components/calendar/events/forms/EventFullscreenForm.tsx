'use client';

import { addDays, format, isValid, parseISO, subDays } from 'date-fns';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { startOfDayDefaultHour, toLocalDateTimeInputValue } from '@/lib/date';
import {
  BellIcon,
  BoldIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  ItalicIcon,
  Loader2Icon,
  MapPinIcon,
  NotebookPenIcon,
  UnderlineIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import {
  eventFormOption,
  eventVisibilityOptions,
  notificationOption,
  statusOptions,
  unitOfTimeOptions,
} from '@/constants';
import LocationAutocomplete, { PlaceSuggestion, } from '@/components/calendar/events/LocationAutoComplete';
import RecurrencePicker from '@/components/calendar/events/RecurrencePicker';
import ColorPicker from '@/components/calendar/events/ColorPicker';
import { GuestInput } from '@/lib/api/events';
import { useCalendarsApi } from '@/lib/calendars/useCalendarsApi';

type GuestEntry = string | { email: string; permissions?: string[] };

function ensureDateTimeInputValueFrom(value: string, preferHour = 9) {
  try {
    const d = parseISO(value);
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      d.setHours(preferHour, 0, 0, 0);
    }
    return toLocalDateTimeInputValue(d);
  } catch {
    return value;
  }
}

function dateOnlyToInputValue(dateOnly: string) {
  return `${dateOnly}T00:00`;
}

function displayEndDateFromExclusive(endDateExclusive: string) {
  const d = parseISO(`${endDateExclusive}T00:00:00`);
  if (!isValid(d)) return endDateExclusive;
  const prev = subDays(d, 1);
  return format(prev, 'yyyy-MM-dd');
}

type Props = {
  event?: CalendarEvent;
  initialDate: Date;
  onClose: () => void;
  onCreate?: (event: CalendarEvent) => void | Promise<unknown>;
  onSave?: (event: CalendarEvent) => void | Promise<unknown>;
  onDelete?: (id: string) => void | Promise<unknown>;
};

export function EventFullscreenForm({
  event,
  initialDate,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: Props) {
  const initialValues = useMemo(() => {
    if (event) {
      const startDateOnly = event.startDate ?? undefined;
      const endDateOnly = event.endDate ?? undefined;
      const allDayStart = startDateOnly ? dateOnlyToInputValue(startDateOnly) : undefined;
      const allDayEnd = endDateOnly
        ? dateOnlyToInputValue(displayEndDateFromExclusive(endDateOnly))
        : undefined;

      const fallbackStart = toLocalDateTimeInputValue(parseISO(event.start));
      const fallbackEnd = toLocalDateTimeInputValue(parseISO(event.end));

      let locationText = '';
      let locationPlaceValue: PlaceSuggestion | null = null;

      try {
        const parsed = typeof event.location === 'string' ? JSON.parse(event.location) : null;
        if (parsed && parsed.display_name) {
          locationText = parsed.display_name ?? '';
          locationPlaceValue = parsed;
        }
      } catch {
        // fall back to plain string below
      }

      if (!locationText) locationText = event.location ?? '';

      // Normalize guests: prefer attendees -> guests array -> invitation meta
      const normalizedGuests: GuestInput[] = (() => {
        const apiEv = event as
          | {
              attendees?: Array<{ email?: string; permissions?: unknown } | null> | null;
              guests?: unknown;
            }
          | undefined;

        if (!apiEv) return [] as GuestInput[];

        if (Array.isArray(apiEv.attendees) && apiEv.attendees.length > 0) {
          return apiEv.attendees
            .map((a) =>
              a && typeof a.email === 'string'
                ? {
                    email: String(a.email),
                    permissions: Array.isArray(a.permissions)
                      ? (a.permissions as unknown[]).map(String)
                      : undefined,
                  }
                : undefined,
            )
            .filter(Boolean) as GuestInput[];
        }

        if (Array.isArray(apiEv.guests) && apiEv.guests.length > 0) {
          return apiEv.guests.map((g) => {
            if (typeof g === 'string') return g;
            if (g && typeof g === 'object' && 'email' in (g as Record<string, unknown>)) {
              const gg = g as { email?: unknown; permissions?: unknown };
              return {
                email: String(gg.email),
                permissions: Array.isArray(gg.permissions)
                  ? (gg.permissions as unknown[]).map(String)
                  : undefined,
              };
            }
            return String(g);
          });
        }

        if (apiEv.guests && typeof apiEv.guests === 'object' && !Array.isArray(apiEv.guests)) {
          const meta = apiEv.guests as Record<string, unknown>;
          if (typeof meta.invitedEmail === 'string') {
            return [
              {
                email: meta.invitedEmail as string,
                permissions: Array.isArray(meta.permissions)
                  ? (meta.permissions as unknown[]).map(String)
                  : undefined,
              },
            ];
          }
        }

        return [] as GuestInput[];
      })();

      return {
        title: event.title ?? '',
        calendarId: event.calendarId ?? '',
        start: event.allDay ? (allDayStart ?? fallbackStart) : fallbackStart,
        end: event.allDay ? (allDayEnd ?? fallbackEnd) : fallbackEnd,
        allDay: event.allDay,
        showTime: !event.allDay,
        // guests may be strings or objects
        guests: normalizedGuests,
        guestInput: '',
        guestError: null as string | null,
        location: locationText,
        locationPlace: locationPlaceValue,
        notifications: event.notifications ?? [],
        description: event.description ?? '',
        busy: event.busyStatus ?? 'busy',
        visibility: event.visibility ?? 'default',
        recurrence: { rrule: event.recurrence ?? null } as RecurrenceValue,
        color: event.color ?? '#0B57D0',
        // If the event already has a meeting URL, default the "addMeeting" flag
        addMeeting: !!(event as { meetingUrl?: unknown } | undefined)?.meetingUrl,
        // expose existing meeting provider/url when editing
        meetingProvider:
          ((event as { meetingProvider?: unknown } | undefined)?.meetingProvider as
            | string
            | undefined) ?? undefined,
        meetingUrl:
          ((event as { meetingUrl?: unknown } | undefined)?.meetingUrl as string | undefined) ?? '',
      };
    }

    const s = startOfDayDefaultHour(new Date(initialDate));
    const e = startOfDayDefaultHour(new Date(initialDate));

    return {
      title: '',
      start: toLocalDateTimeInputValue(s),
      end: toLocalDateTimeInputValue(e),
      allDay: true,
      showTime: false,
      guests: [] as GuestEntry[],
      guestInput: '',
      guestError: null as string | null,
      location: '',
      locationPlace: null as PlaceSuggestion | null,
      notifications: [
        { id: crypto.randomUUID(), method: 'notification', amount: 30, unit: 'minutes' },
      ] as NotificationItem[],
      description: '',
      busy: 'busy' as 'busy' | 'free',
      visibility: 'default' as 'default' | 'public' | 'private',
      recurrence: { rrule: null } as RecurrenceValue,
      color: '#0B57D0',
      addMeeting: false,
      meetingProvider: undefined,
      meetingUrl: '',
    };
  }, [event, initialDate]);
  const { calendars } = useCalendarsApi();
  const [saving, setSaving] = useState(false);
  const defaultCalendarSet = useRef(false);
  const [title, setTitle] = useState(initialValues.title);
  const [start, setStart] = useState(initialValues.start);
  const [end, setEnd] = useState(initialValues.end);
  const [allDay, setAllDay] = useState(initialValues.allDay);
  const [calendarId, setCalendarId] = useState<string>(initialValues.calendarId ?? '');

  // Default to first available calendar once calendars load (only if not already set)
  useEffect(() => {
    if (!defaultCalendarSet.current && !calendarId && calendars.length > 0) {
      defaultCalendarSet.current = true;
      setCalendarId(calendars[0].id);
    }
  }, [calendars, calendarId]);
  // initialize addMeeting from the computed initialValues (handles edit case with meetingUrl)
  const [addMeeting, setAddMeeting] = useState(initialValues.addMeeting);

  // meeting details (provider / explicit URL)
  const [meetingProvider, setMeetingProvider] = useState<string | undefined>(
    (initialValues as { meetingProvider?: string | null }).meetingProvider ?? undefined,
  );
  const [meetingUrl, setMeetingUrl] = useState<string>(
    (initialValues as { meetingUrl?: string | null }).meetingUrl ?? '',
  );

  const [guests, setGuests] = useState<GuestEntry[]>(initialValues.guests as GuestEntry[]);
  const [guestInput, setGuestInput] = useState(initialValues.guestInput);
  const [guestError, setGuestError] = useState<string | null>(initialValues.guestError);

  const [location, setLocation] = useState(initialValues.location);
  const [locationPlace, setLocationPlace] = useState<PlaceSuggestion | null>(
    initialValues.locationPlace,
  ); // optional full place

  // Guest permissions (per-guest). Stored as array of permission keys.
  const permissionOptions = [
    { key: 'modify', label: 'Modify event', defaultChecked: false },
    { key: 'invite', label: 'Invite others', defaultChecked: true },
    { key: 'seeGuests', label: 'See guest list', defaultChecked: true },
  ] as const;
  // Setter is unused today because the guest-permissions UI is currently TODO.
  // Only destructure the value to avoid an unused-variable warning from the linter.
  const [guestPermissions] = useState<string[]>(() =>
    permissionOptions.filter((p) => p.defaultChecked).map((p) => p.key),
  );

  const [tab, setTab] = useState('detail');

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialValues.notifications,
  );

  const [descriptionHtml, setDescriptionHtml] = useState(initialValues.description);
  const descRef = useRef<HTMLDivElement | null>(null);
  // live ref to avoid re-rendering on every keystroke (prevents caret/IME issues)
  const descriptionHtmlRef = useRef<string>(String(initialValues.description ?? ''));
  const isComposingRef = useRef(false);

  // Toolbar active states
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  const isSelectionInsideEditor = () => {
    const el = descRef.current;
    if (!el) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    return el.contains(range.startContainer) || el === range.startContainer;
  };

  const updateToolbarState = () => {
    try {
      if (!isSelectionInsideEditor()) {
        setBoldActive(false);
        setItalicActive(false);
        setUnderlineActive(false);
        return;
      }

      // Prefer queryCommandState where available (simple and widely supported) and
      // fall back to DOM inspection for lists.
      const q = (cmd: string) => {
        try {
          // Safely access queryCommandState with a typed cast (avoid `any`)
          const docWithQuery = document as Document & {
            queryCommandState?: (c: string) => boolean;
          };
          return Boolean(
            typeof docWithQuery.queryCommandState === 'function' &&
            docWithQuery.queryCommandState(cmd),
          );
        } catch {
          return false;
        }
      };

      setBoldActive(q('bold'));
      setItalicActive(q('italic'));
      setUnderlineActive(q('underline'));

      // List detection: try queryCommandState if available (no-op here, toolbar doesn't show list state)
    } catch {
      // ignore
    }
  };

  // Update toolbar state on selection changes and pointer/keyboard events
  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState);
    document.addEventListener('mouseup', updateToolbarState);
    document.addEventListener('keyup', updateToolbarState);
    // initial update
    setTimeout(updateToolbarState, 0);
    return () => {
      document.removeEventListener('selectionchange', updateToolbarState);
      document.removeEventListener('mouseup', updateToolbarState);
      document.removeEventListener('keyup', updateToolbarState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize the editor's innerHTML once from initial values. Avoid updating innerHTML on every
  // render because it resets the DOM and breaks IME / caret position while typing.
  useEffect(() => {
    const el = descRef.current;
    const html = String(initialValues.description ?? '');
    descriptionHtmlRef.current = html;
    setDescriptionHtml(html);
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [initialValues.description]);

  // composition handlers to avoid applying formatting during IME composition
  const onCompositionStart = () => {
    isComposingRef.current = true;
  };
  const onCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // Ensure selection is inside the editor. If not, focus editor and put caret at end.
  const ensureSelectionInEditor = () => {
    if (isComposingRef.current) return;
    const el = descRef.current;
    if (!el) return;
    // Always focus the editor - many execCommand operations require the editable to be focused
    // but focusing itself does not change selection when selection is already inside.
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.startContainer) || el === range.startContainer) return;
    }
    // move caret to end
    try {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    } catch {
      // ignore
    }
  };

  // Local toolbar button component that preserves selection (preventDefault on mousedown)
  function ToolbarButtonLocal({
    children,
    label,
    onClick,
    active,
  }: {
    children: React.ReactNode;
    label?: string;
    onClick: () => void;
    active?: boolean;
  }) {
    const base = 'rounded p-1 text-xs';
    const inactive = 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700';
    const activeCls = 'bg-[#0B57D0] text-white rounded';
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (isComposingRef.current) return; // don't run while IME composing
          ensureSelectionInEditor();
          onClick();
          // refresh toolbar state after command
          setTimeout(updateToolbarState, 0);
        }}
        title={label}
        aria-pressed={active ? 'true' : 'false'}
        className={[base, active ? activeCls : inactive].join(' ')}
      >
        {children}
      </button>
    );
  }

  const [busy, setBusy] = useState<'busy' | 'free'>(initialValues.busy);
  const [visibility, setVisibility] = useState<'default' | 'public' | 'private'>(
    initialValues.visibility,
  );
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(initialValues.recurrence);
  const [color, setColor] = useState(initialValues.color);

  const [submitError, setSubmitError] = useState<string | null>(null);

  function isValidEmail(email: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  const addGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setGuestError('Enter a valid email address (e.g. name@example.com)');
      return;
    }
    setGuests((prev) => [...prev, trimmed]);
    setGuestInput('');
    setGuestError(null);
  };

  const onGuestInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGuest();
    }
  };

  const onToggleAllDayWhenShown = (checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      const s = startOfDayDefaultHour(parseISO(start));
      const e = startOfDayDefaultHour(parseISO(start));
      setStart(toLocalDateTimeInputValue(s));
      setEnd(toLocalDateTimeInputValue(e));
    } else {
      setStart((prev) => ensureDateTimeInputValueFrom(prev, 9));
      setEnd((prev) => ensureDateTimeInputValueFrom(prev, 10));
    }
  };

  // Notifications handlers...
  const addNotification = () => {
    const id = crypto.randomUUID();
    const defaultUnit: NotificationItem['unit'] = 'minutes';
    const defaultMethod = notificationOption[0]?.value ?? 'notification';
    setNotifications((prev) => [
      ...prev,
      { id, method: defaultMethod, amount: 30, unit: defaultUnit },
    ]);
  };
  const updateNotification = (id: string, updates: Partial<NotificationItem>) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };
  const removeNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const validateBeforeSubmit = () => {
    const s = parseISO(start).getTime();
    const e = parseISO(end).getTime();
    if (e <= s && !allDay) {
      setSubmitError('End must be after start');
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const submit = async () => {
    if (!validateBeforeSubmit()) return;
    setSaving(true);

    const payload: CalendarEvent = {
      id: crypto.randomUUID(),
      calendarId: calendarId,
      title,
      allDay,
      // If guestPermissions selected, attach permissions per-guest; otherwise send simple strings
      guests: guests.length
        ? guestPermissions.length
          ? guests.map((g) =>
              typeof g === 'string'
                ? { email: g, permissions: guestPermissions }
                : { email: g.email, permissions: g.permissions ?? guestPermissions },
            )
          : guests.map((g) => (typeof g === 'string' ? g : g.email))
        : undefined,
      // Store a human-readable location string to keep behavior consistent with the compact EventForm
      // and to avoid persisting JSON into `location` which ends up in emails.
      location: locationPlace ? locationPlace.display_name : location || undefined,
      notifications: notifications.length ? notifications : undefined,
      recurrence: recurrence?.rrule ?? null,
      // Prefer the live editor content if available (avoids race where ref/state not synced)
      description:
        (descRef.current?.innerHTML ?? descriptionHtmlRef.current ?? descriptionHtml) || undefined,
      busyStatus: busy || undefined,
      visibility: visibility || undefined,
      color: color || '#0B57D0',
      start: '',
      end: '',
      recurringEventId: event?.recurringEventId,
      originalStartAt: event?.originalStartAt,
      isRecurringInstance: event?.isRecurringInstance ?? false,
    };

    if (allDay) {
      const startDateStr = start.slice(0, 10); // "YYYY-MM-DD"
      const endDateStrDisplay = end.slice(0, 10); // inclusive display date

      // Build UTC-midnight instants for the date-only strings so toISOString() does
      // not shift the day due to local timezones. Convert the inclusive display
      // end date into an exclusive end (end + 1 day) to match server expectations.
      const startParts = startDateStr.split('-').map((p) => Number(p));
      const endParts = endDateStrDisplay.split('-').map((p) => Number(p));
      const startDateUtc = new Date(
        Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0),
      );
      const endDateUtc = addDays(
        new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 0, 0, 0, 0)),
        1,
      );

      const endDateStr = `${endDateUtc.getUTCFullYear()}-${String(endDateUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(endDateUtc.getUTCDate()).padStart(2, '0')}`;

      payload.startDate = startDateStr;
      payload.endDate = endDateStr;

      // Keep ISO instants for backward compatibility (optional)
      payload.start = startDateUtc.toISOString();
      payload.end = endDateUtc.toISOString();
    } else {
      const startObj = new Date(start);
      const endObj = new Date(end);
      payload.start = startObj.toISOString();
      payload.end = endObj.toISOString();
    }

    // Include meeting request flag and optional meeting fields
    payload.addMeeting = addMeeting || undefined;
    payload.meetingProvider = meetingProvider ?? undefined;
    payload.meetingUrl = meetingUrl || undefined;
    // Preserve any existing meetingData when editing (readonly)
    payload.meetingData =
      (event as { meetingData?: unknown } | undefined)?.meetingData ?? undefined;

    try {
      if (event) await onSave?.({ ...payload, id: event.id });
      else await onCreate?.(payload);
    } catch (err) {
      console.error('[EventFullscreenForm] submit error', err);
      setSubmitError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const recurrencePickerStartDate = (() => {
    try {
      return parseISO(start);
    } catch {
      return undefined;
    }
  })();

  // Lightweight alias for the raw API-backed event shape when present
  const apiAny = event as
    | { meetingUrl?: string | null; meetingProvider?: string | null }
    | undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex w-full items-center gap-2 px-4 py-3 sm:w-2/3 sm:gap-4 sm:px-6 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <XIcon size={20} />
        </button>

        <input
          className="min-w-0 flex-1 border-b bg-transparent text-xl text-gray-900 placeholder-gray-400 focus:border-[#0B57D0] focus:outline-none dark:text-gray-100"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add title"
          autoFocus
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#0B57D0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#044dc2] disabled:opacity-60 sm:px-5"
        >
          {saving ? <Loader2Icon size={14} className="animate-spin" /> : null}
          Save
        </button>

        {event && (
          <button
            type="button"
            onClick={() => void onDelete?.(event.id)}
            disabled={saving}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 sm:px-5"
          >
            Delete
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-auto px-6 sm:flex-row">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1 py-2">
            {/* Start date */}
            <div className="relative">
              <input
                type="date"
                className="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                value={start.slice(0, 10)}
                onChange={(e) =>
                  setStart(
                    allDay ? `${e.target.value}T00:00` : `${e.target.value}T${start.slice(11, 16)}`,
                  )
                }
              />
            </div>

            {/* Start time — only when not all-day */}
            {!allDay && (
              <input
                type="time"
                className="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                value={start.slice(11, 16)}
                onChange={(e) => setStart(`${start.slice(0, 10)}T${e.target.value}`)}
              />
            )}

            <span className="px-1 text-sm">to</span>

            {/* End time — only when not all-day */}
            {!allDay && (
              <input
                type="time"
                className="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                value={end.slice(11, 16)}
                onChange={(e) => setEnd(`${end.slice(0, 10)}T${e.target.value}`)}
              />
            )}

            {/* End date */}
            <input
              type="date"
              className="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              value={allDay ? end.slice(0, 10) : end.slice(0, 10)}
              onChange={(e) =>
                setEnd(
                  allDay ? `${e.target.value}T00:00` : `${e.target.value}T${end.slice(11, 16)}`,
                )
              }
            />
          </div>

          <div className="flex items-center gap-6 py-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => onToggleAllDayWhenShown(e.target.checked)}
                className="h-4 w-4 rounded accent-[#0B57D0]"
              />
              All day
            </label>

            <RecurrencePicker
              value={recurrence}
              onChange={setRecurrence}
              startDate={recurrencePickerStartDate}
            />
          </div>

          <div className="my-6 rounded-lg bg-white p-2 shadow dark:bg-gray-900">
            {/* ── Tabs: Event details / Find a time ────────────────────────────────── */}
            <div className="border-b border-gray-200 pt-4 dark:border-gray-700">
              {eventFormOption.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'px-4 py-2 text-sm font-medium transition-colors',
                    tab === option.value
                      ? 'border-b-2 border-[#0B57D0] text-[#0B57D0]'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
                  ].join(' ')}
                  onClick={() => setTab(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {tab === 'detail' && (
              <div className="space-y-1 pt-2">
                {/* Location */}
                <div className="flex items-start gap-4 rounded-lg px-2 py-2">
                  <div className="mt-2 shrink-0">
                    <MapPinIcon size={20} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={location}
                      onChange={(v) => {
                        setLocation(v);
                        setLocationPlace(null);
                      }}
                      onSelect={(place) => {
                        setLocation(place.display_name);
                        setLocationPlace(place);
                      }}
                      placeholder="Add location"
                    />
                  </div>
                </div>

                {/* Notifications */}
                <div className="flex items-start gap-4 px-2 py-2">
                  <div className="mt-2 shrink-0">
                    <BellIcon size={20} className="text-gray-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-center gap-2">
                        <select
                          className="rounded-md bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          value={n.method}
                          onChange={(e) => updateNotification(n.id, { method: e.target.value })}
                        >
                          {notificationOption.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={40320}
                          value={n.amount}
                          className="w-16 rounded-md bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                          onChange={(e) =>
                            updateNotification(n.id, { amount: Number(e.target.value) })
                          }
                        />

                        <select
                          value={n.unit}
                          className="rounded-md bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          onChange={(e) =>
                            updateNotification(n.id, {
                              unit: e.target.value as NotificationItem['unit'],
                            })
                          }
                        >
                          {unitOfTimeOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeNotification(n.id)}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                          aria-label="Remove notification"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addNotification}
                      className="text-sm font-medium text-[#0B57D0] hover:underline"
                    >
                      Add notification
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 px-2 py-2">
                  <div className="shrink-0">
                    <BriefcaseBusinessIcon size={20} className="text-gray-500" />
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    {/* Status: Busy / Free */}
                    <select
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      value={busy}
                      onChange={(e) => setBusy(e.target.value as 'busy' | 'free')}
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>

                    {/* Visibility */}
                    <select
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      value={visibility}
                      onChange={(e) =>
                        setVisibility(e.target.value as 'default' | 'public' | 'private')
                      }
                    >
                      {eventVisibilityOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color picker row */}

                <div className="flex items-center gap-4 px-2 py-2">
                  <div className="shrink-0">
                    <CalendarIcon size={20} className="text-gray-500" />
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    {calendars && calendars.length > 0 && (
                      <select
                        className="rounded border px-2 py-1.5 text-sm"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                      >
                        {calendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <ColorPicker value={color} onChange={setColor} />
                  </div>
                </div>

                {/* Meeting option */}
                <div className="flex flex-col gap-2 px-2 py-1">
                  {/* Row 1: icon + checkbox */}
                  <div className="flex items-center gap-4">
                    <div className="w-5 shrink-0">
                      <VideoIcon size={20} className="text-gray-500" />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={addMeeting}
                        onChange={(e) => setAddMeeting(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#0B57D0]"
                      />
                      <span>Add meeting (Jitsi)</span>
                    </label>
                  </div>

                  {/* Row 2: provider + URL (when addMeeting is on) */}
                  {addMeeting && (
                    <div className="ml-9 flex flex-wrap items-center gap-2">
                      <select
                        value={meetingProvider ?? 'jitsi'}
                        onChange={(e) => setMeetingProvider(e.target.value)}
                        className="rounded-md bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        <option value="jitsi">Jitsi (generate)</option>
                        <option value="custom">Custom URL</option>
                      </select>

                      <input
                        type="url"
                        placeholder="Optional meeting URL"
                        value={meetingUrl}
                        onChange={(e) => setMeetingUrl(e.target.value)}
                        className="min-w-0 flex-1 rounded-md bg-gray-100 px-2 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      />
                    </div>
                  )}

                  {/* Row 3: Join meeting link */}
                  {event && apiAny?.meetingUrl && (
                    <div className="ml-9">
                      <a
                        href={String(apiAny.meetingUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        <VideoIcon size={14} />
                        Join meeting
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-4 px-2 py-2">
                  <div className="mt-2 shrink-0">
                    <NotebookPenIcon size={20} className="text-gray-500" />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-lg border border-gray-800 bg-white dark:bg-gray-800 dark:text-gray-200">
                    {/* Rich text toolbar + editable area */}
                    <div className="flex items-center gap-1 border-b border-gray-300 px-2 py-1 dark:border-gray-700">
                      <ToolbarButtonLocal
                        label="Bold"
                        onClick={() => exec('bold')}
                        active={boldActive}
                      >
                        <BoldIcon size={14} />
                      </ToolbarButtonLocal>
                      <ToolbarButtonLocal
                        label="Italic"
                        onClick={() => exec('italic')}
                        active={italicActive}
                      >
                        <ItalicIcon size={14} />
                      </ToolbarButtonLocal>
                      <ToolbarButtonLocal
                        label="Underline"
                        onClick={() => exec('underline')}
                        active={underlineActive}
                      >
                        <UnderlineIcon size={16} />
                      </ToolbarButtonLocal>
                    </div>
                    <div
                      contentEditable
                      ref={descRef}
                      onCompositionStart={onCompositionStart}
                      onCompositionEnd={onCompositionEnd}
                      onInput={(e) => {
                        // update ref only; avoid setState to prevent re-renders while typing
                        descriptionHtmlRef.current = (e.target as HTMLElement).innerHTML;
                      }}
                      onBlur={() => {
                        // sync to state when user leaves the editor
                        setDescriptionHtml(descriptionHtmlRef.current);
                      }}
                      suppressContentEditableWarning
                      className="min-h-[120px] w-full resize-none p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none dark:bg-gray-900 dark:text-gray-200"
                      aria-label="Event description"
                      role="textbox"
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === 'time' && (
              <div className="py-6 text-sm text-gray-400">Find a time — coming soon</div>
            )}
          </div>

          {/* Validation error */}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <div className="w-full shrink-0 border-t px-4 py-4 sm:w-2/5 sm:border-t-0 sm:px-8 sm:py-32 dark:border-gray-700">
          <h3 className="mb-3 w-fit border-b-2 border-[#0B57D0] text-sm font-semibold text-[#0B57D0] dark:text-gray-300">
            Guests
          </h3>

          {/* Add guest input */}
          <div className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-1.5 focus-within:border-[#0B57D0] hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            <UsersIcon size={16} className="shrink-0 text-gray-400" />
            <input
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none dark:bg-transparent dark:text-gray-200"
              value={guestInput}
              onChange={(e) => {
                setGuestInput(e.target.value);
                if (guestError) setGuestError(null);
              }}
              onKeyDown={onGuestInputKey}
              placeholder="Add guests"
            />
          </div>

          {guestError && <p className="mt-1 text-xs text-red-600">{guestError}</p>}

          {/* Guest list */}
          {guests.length > 0 && (
            <ul className="mt-3 space-y-2">
              {guests.map((g, i) => (
                <li
                  key={`${g}-${i}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {/* Avatar circle */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B57D0] text-xs font-semibold text-white">
                      {typeof g === 'string' ? g[0]?.toUpperCase() : g.email[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {typeof g === 'string' ? g : g.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuests((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label={`Remove ${g}`}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* TODO: Guest permissions */}
          {/* <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Guest permissions
            </p>
            <div className="space-y-2">
              {permissionOptions.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={guestPermissions.includes(key)}
                    onChange={(e) => {
                      setGuestPermissions((prev) =>
                        e.target.checked ? [...prev, key] : prev.filter((x) => x !== key),
                      );
                    }}
                    className="h-4 w-4 rounded accent-[#0B57D0]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}

export default EventFullscreenForm;

function exec(command: string, value?: string) {
  try {
    document.execCommand(command, false, value ?? undefined);
  } catch {
    // noop
  }
}
