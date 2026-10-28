'use client';

import { format, parseISO } from 'date-fns';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import { toLocalDateTimeInputValue } from '@/lib/date';
import { useCalendarsApi } from '@/lib/calendars/useCalendarsApi';
import { useRouter } from 'next/navigation';
import { RecurrenceScopeModal } from '@/components/calendar/events/RecurrenceScopeModal';
import type { RecurrenceScope } from '@/lib/api/events';
import { playSuccessChime } from '@/lib/utils/sound';

type RecurringOccurrence = CalendarEvent & {
  isOccurrence: true;
  originalEventId: string;
};

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  event: CalendarEvent | RecurringOccurrence | null;
  onClose: () => void;
  onUpdate: (event: CalendarEvent, scope?: RecurrenceScope) => void;
  onDelete: (event: CalendarEvent | string, scope?: RecurrenceScope) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function EventPopover({ open, anchorRect, event, onClose, onUpdate, onDelete }: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Keep hook order stable: call calendars hook unconditionally.
  const { calendars } = useCalendarsApi();

  const initialTitle = event?.title ?? '';
  const initialStart = event ? toLocalDateTimeInputValue(parseISO(event.start)) : '';
  const initialEnd = event ? toLocalDateTimeInputValue(parseISO(event.end)) : '';

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const router = useRouter();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'update'; payload: CalendarEvent } | { type: 'delete'; payload: CalendarEvent } | null
  >(null);

  const [userRsvp, setUserRsvp] = useState<'accepted' | 'tentative' | 'declined' | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);

  const handleRsvp = (status: 'accepted' | 'tentative' | 'declined') => {
    setUserRsvp(status);
    playSuccessChime();
    if (event) {
      onUpdate({
        ...event,
        attendees: [
          ...(event.attendees?.filter((a) => a.email !== 'me@calendar.local') ?? []),
          { email: 'me@calendar.local', name: 'Me', rsvp: status },
        ],
      });
    }
  };

  const handleCopyDetails = () => {
    if (!event) return;
    const text = `${event.title}\n📅 ${formattedDate}${event.meetingUrl ? `\n🔗 Meeting: ${event.meetingUrl}` : ''}${event.location ? `\n📍 Location: ${event.location}` : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDetails(true);
      playSuccessChime();
      setTimeout(() => setCopiedDetails(false), 2000);
    });
  };

  const ensureInstanceId = (ev: CalendarEvent): CalendarEvent => {
    if (ev.isRecurringInstance && ev.recurringEventId && ev.originalStartAt) {
      return { ...ev, id: `${ev.recurringEventId}@${ev.originalStartAt}` };
    }
    return ev;
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !scopeOpen && !confirmDeleteOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, scopeOpen, confirmDeleteOpen]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      // Don't close if a modal/dialog on top is open
      if (scopeOpen || confirmDeleteOpen) return;
      const el = popoverRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, scopeOpen, confirmDeleteOpen]);

  const position = useMemo(() => {
    if (!anchorRect) return null;

    // Place to the right of the event; fall back to left if near edge
    const POPOVER_W = 320;
    const POPOVER_H = 220; // approx; ok for MVP
    const GAP = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If the viewport is narrow, we won't anchor the popover - we'll show a centered modal-like sheet
    const smallScreen = vw < 520;
    if (smallScreen) {
      return {
        left: Math.max(8, (vw - Math.min(POPOVER_W, vw - 32)) / 2),
        top: Math.max(8, vh - 360),
        smallScreen: true,
      } as { left: number; top: number; smallScreen: true };
    }

    const preferredLeft = anchorRect.right + GAP;
    const canFitRight = preferredLeft + POPOVER_W <= vw - 8;

    const left = canFitRight ? preferredLeft : anchorRect.left - GAP - POPOVER_W;

    const top = clamp(anchorRect.top, 8, vh - POPOVER_H - 8);

    return { left: Math.max(8, left), top, smallScreen: false } as {
      left: number;
      top: number;
      smallScreen: false;
    };
  }, [anchorRect]);

  if (!open || !event || !anchorRect || !position) return null;

  const editEvent = () => {
    if (!event) return;

    const ev = event as CalendarEvent;

    if (ev.isAppointment || ev.isTask) {
      setEditing(true);
      return;
    }

    if (ev.isRecurringInstance && ev.recurringEventId && ev.originalStartAt) {
      router.push(
        `/events/edit/${encodeURIComponent(ev.recurringEventId)}?occ=${encodeURIComponent(
          ev.originalStartAt,
        )}`,
      );
      return;
    }

    router.push(`/events/edit/${encodeURIComponent(ev.id)}`);
  };

  const submitEdit = () => {
    if (!event) return;

    const updated: CalendarEvent = {
      ...event,
      // keep event.id as-is (instance id stays instance id)
      title: title.trim(),
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    };

    if (event.isRecurringInstance) {
      setPendingAction({ type: 'update', payload: ensureInstanceId(updated) });
      setScopeOpen(true);
      return;
    }

    onUpdate(updated);

    setEditing(false);
    onClose();
  };

  const formattedDate = event.allDay
    ? `${format(parseISO(event.start), 'MMMM d')} · All day`
    : `${format(parseISO(event.start), 'EEE, MMM d · HH:mm')} - ${format(
        parseISO(event.end),
        'HH:mm',
      )}`;

  // Helpers to extract guest/attendee info safely
  const guestEmails = (() => {
    if (!event?.guests) return [] as string[];
    if (Array.isArray(event.guests)) {
      return event.guests
        .map((g) => {
          if (typeof g === 'string') return g;
          if (g && typeof g === 'object' && 'email' in g)
            return String((g as { email?: unknown }).email);
          return String(g);
        })
        .filter(Boolean) as string[];
    }
    return [] as string[];
  })();

  const attendeeList = event.attendees ?? [];
  const guestCount = (attendeeList && attendeeList.length) || guestEmails.length || 0;

  // Find calendar info (safe if event is null via optional chaining)
  const calendarForEvent = calendars.find((c) => c.id === event?.calendarId);

  // Notification description helper
  const notificationDesc = (() => {
    const n = event.notifications && event.notifications.length ? event.notifications[0] : null;
    if (!n) return null;
    // If it's 1 day before, show 'The day before at 5pm' style
    if (n.unit === 'days' && n.amount === 1) {
      try {
        const start = parseISO(event.start);
        return `The day before at ${format(start, 'h:mma').toLowerCase()}`;
      } catch {
        return '1 day before';
      }
    }
    return `${n.amount} ${n.unit} before`;
  })();

  // Organizer: prefer first attendee with a name, else show calendarId if present
  const organizerName =
    attendeeList.find((a) => a.name)?.name ??
    attendeeList[0]?.email ??
    // If no guests/attendees, prefer calendar display name over raw id
    (guestCount === 0 && calendarForEvent ? calendarForEvent.name : event.calendarId) ??
    undefined;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        ref={popoverRef}
        className={[
          'fixed rounded-3xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800',
          // Bottom-sheet style for small screens: full-width with side margin, rounded top, scrollable
          position.smallScreen
            ? 'top-auto right-4 bottom-4 left-4 max-h-[70vh] w-auto max-w-[95vw] overflow-auto rounded-t-2xl'
            : 'w-[320px]',
        ].join(' ')}
        style={
          position.smallScreen
            ? ({} as CSSProperties)
            : ({ left: position.left, top: position.top } as CSSProperties)
        }
        role="dialog"
        aria-modal="true"
      >
        <div className="m-2 flex justify-end gap-1">
          <button
            type="button"
            className="rounded-full p-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={handleCopyDetails}
            title={copiedDetails ? 'Copied event details!' : 'Copy event details'}
          >
            {copiedDetails ? (
              <CheckIcon size={16} className="text-emerald-500" />
            ) : (
              <Share2Icon size={16} />
            )}
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={editEvent}
          >
            <PencilIcon size={16} />
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => {
              if (event.isRecurringInstance) {
                setPendingAction({
                  type: 'delete',
                  payload: ensureInstanceId(event as CalendarEvent),
                });
                setScopeOpen(true);
                return;
              }

              setConfirmDeleteOpen(true);
            }}
          >
            <Trash2Icon size={16} />
          </button>
          <button
            type="button"
            className="ml-3 rounded-full p-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="items-start justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm"
              style={{ background: event.color ?? 'var(--gcal-blue)' }}
            />
            <div>
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {event.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-300">{formattedDate}</div>
            </div>
          </div>

          {!editing && event.meetingUrl && (
            <div className="my-2 flex min-w-0 items-start gap-3">
              <VideoIcon size={16} className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" />
              <div className="flex items-center gap-2 text-sm">
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-green-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Join meeting
                </a>
              </div>
            </div>
          )}

          {guestCount > 0 && (
            <div className="flex min-w-0 items-start gap-3">
              <UsersIcon size={16} className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" />
              <div className="flex items-center gap-2 text-sm">
                <span>{guestCount} guests</span>
              </div>
            </div>
          )}

          {notificationDesc && (
            <div className="my-2 flex min-w-0 items-start gap-3">
              <BellIcon size={16} className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" />
              <div className="flex items-center gap-2 text-sm">
                <span>{notificationDesc}</span>
              </div>
            </div>
          )}

          {organizerName && (
            <div className="my-2 flex min-w-0 items-start gap-3">
              <CalendarIcon size={16} className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" />
              <div className="flex items-center gap-2 text-sm">
                <span>{organizerName}</span>
              </div>
            </div>
          )}

          {/* RSVP Quick Response */}
          {!editing && (
            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700/60">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Going?</span>
                {userRsvp && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 capitalize">
                    ✓ {userRsvp}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRsvp('accepted')}
                  className={[
                    'rounded-xl py-1 text-xs font-semibold transition',
                    userRsvp === 'accepted'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
                  ].join(' ')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleRsvp('tentative')}
                  className={[
                    'rounded-xl py-1 text-xs font-semibold transition',
                    userRsvp === 'tentative'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
                  ].join(' ')}
                >
                  Maybe
                </button>
                <button
                  type="button"
                  onClick={() => handleRsvp('declined')}
                  className={[
                    'rounded-xl py-1 text-xs font-semibold transition',
                    userRsvp === 'declined'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
                  ].join(' ')}
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>

        {editing && (
          <div className="space-y-3 px-4 py-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-600">Title</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">Start</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">End</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                {event?.meetingUrl && (
                  <a
                    href={event.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gcal-btn bg-green-600 px-3 py-2 text-sm"
                  >
                    Join meeting
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  onClick={submitEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <RecurrenceScopeModal
        key={`${pendingAction?.payload?.id ?? 'none'}-${pendingAction?.type ?? 'none'}-${scopeOpen ? 'open' : 'closed'}`}
        open={scopeOpen}
        title={
          pendingAction?.type === 'delete' ? 'Delete recurring event' : 'Update recurring event'
        }
        defaultScope="this"
        onCancel={() => {
          setScopeOpen(false);
          setPendingAction(null);
        }}
        onConfirm={(scope) => {
          if (!pendingAction) return;

          if (pendingAction.type === 'update') {
            onUpdate(pendingAction.payload, scope);
          } else {
            onDelete(pendingAction.payload, scope);
          }

          setScopeOpen(false);
          setPendingAction(null);
          setEditing(false);
          onClose();
        }}
      />

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-lg font-semibold text-gray-900">Delete event?</div>
            <p className="mt-2 text-sm text-gray-600">
              &ldquo;{event.title}&rdquo; will be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete(event as CalendarEvent);
                  onClose();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
