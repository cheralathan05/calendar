'use client';

import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { useEffect, useMemo, useRef } from 'react';
import { XIcon } from 'lucide-react';
import { compareEventsInDayBucket, isCrossDayTimedEventOnCalendar } from '@/lib/events/day';
import { getEventRangeMs } from '@/lib/events/range';
import { resolveRsvpVisuals } from '@/components/calendar/events/rsvpVisuals';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  date: Date | null;
  events: CalendarEvent[];
  onClose: () => void;
  onPickEvent: (eventId: string, rect: DOMRect) => void;
  disableOutsideClose?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function DayEventsPopover({
  open,
  anchorRect,
  date,
  events,
  onClose,
  onPickEvent,
  disableOutsideClose,
}: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (disableOutsideClose) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = popoverRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, disableOutsideClose]);

  const position = useMemo(() => {
    if (!anchorRect) return null;

    const W = 320;
    const H = 320;
    const GAP = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const preferredLeft = anchorRect.right + GAP;
    const canFitRight = preferredLeft + W <= vw - 8;
    const left = canFitRight ? preferredLeft : anchorRect.left - GAP - W;

    const top = clamp(anchorRect.top, 8, vh - H - 8);
    return { left: Math.max(8, left), top };
  }, [anchorRect]);

  const dayStart = date ? startOfDay(date) : null;
  const dayEnd = dayStart ? addDays(dayStart, 1) : null;

  const eventsForDayWindow = useMemo(() => {
    if (!dayStart || !dayEnd) return [] as CalendarEvent[];

    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime(); // exclusive

    return events.filter((ev) => {
      const r = getEventRangeMs(ev);
      return r.endMsExclusive > startMs && r.startMs < endMs;
    });
  }, [events, dayStart, dayEnd]);

  if (!open || !anchorRect || !date || !position || !dayStart || !dayEnd) return null;

  const sorted = [...eventsForDayWindow].sort(compareEventsInDayBucket);
  const today = new Date();

  return (
    <div className="fixed inset-0 z-[55]">
      <div
        ref={popoverRef}
        className={[
          'fixed rounded-xl bg-[#f8fafd] p-1 text-gray-900 shadow-2xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-100/5',
          'w-[calc(100vw-2rem)] max-w-[260px] sm:w-[250px]',
        ].join(' ')}
        style={{ left: '50%', transform: 'translateX(-50%)', top: position.top }}
        role="dialog"
        aria-modal="true"
      >
        <div className="max-h-fit overflow-auto px-2 py-2">
          <div className="flex w-full items-center justify-between px-3 pb-2">
            <div className="mx-auto flex w-fit flex-col items-center justify-center text-gray-700 dark:text-white">
              <span className="uppercase">{format(date, 'EEE')}</span>
              <span
                className={`px-3 py-1.5 font-bold ${isSameDay(today, date) ? 'rounded-full bg-[var(--gcal-blue)] text-white' : ''}`}
              >
                {format(date, 'd')}
              </span>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-700">
              <XIcon size={16} />
            </button>
          </div>

          {sorted.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              There are no events scheduled on this day.
            </div>
          ) : (
            <ul className="space-y-1">
              {sorted.map((ev) => {
                const { startMs, endMsExclusive } = getEventRangeMs(ev);

                const continuesFromPrev = startMs < dayStart.getTime();
                const continuesToNext = endMsExclusive > dayEnd.getTime();

                const isBar = ev.allDay || isCrossDayTimedEventOnCalendar(ev);

                const leftCap = continuesFromPrev ? 'rounded-l-md ' : 'rounded-l-full';
                const rightCap = continuesToNext ? ' rounded-r-md' : 'rounded-r-full';

                const rv = resolveRsvpVisuals(ev);
                const { background, borderLeft, titleClass } = rv;
                const containerClass = isBar
                  ? `${leftCap} ${rightCap} ${rv.textColorClass} gcal-pill`
                  : 'rounded-md hover:bg-gray-100 text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700';
                const openId = ev.id;

                // Only show time for non-bar (timed single-day) events
                const evStart = parseISO(ev.start);

                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      className={`w-full px-3 py-1 text-left ${containerClass}`}
                      onClick={(clickEvt) => {
                        const rect = clickEvt.currentTarget.getBoundingClientRect();
                        onPickEvent(openId, rect);
                      }}
                      style={{ background: !isBar ? '' : background, borderLeft }}
                    >
                      <div className="flex items-center gap-2 truncate text-xs font-medium">
                        {!isBar && (
                          <>
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: ev.color ?? 'var(--gcal-blue)' }}
                            />
                            <span>{format(evStart, 'hh:mm a')}</span>
                          </>
                        )}
                        <span className={`${titleClass}`}>{ev.title}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
