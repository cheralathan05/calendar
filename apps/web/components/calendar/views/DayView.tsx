'use client';

import { format, isSameDay, parseISO } from 'date-fns';
import { CircleIcon, Grid2X2Icon } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  DAY_VIEW_COLUMN_GAP_PX,
  DAY_VIEW_GUTTER_PX,
  DAY_VIEW_GUTTER_PX_MOBILE,
  DAY_VIEW_PX_PER_HOUR,
  DAY_VIEW_PX_PER_MIN,
} from '@/constants';
import { endOfDayExclusive, startOfDayDefaultHour } from '@/lib/date';
import { eventsForDay } from '@/lib/events/day';
import { layoutOverlappingEvents } from '@/lib/events/overlap-layout';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { resolveRsvpVisuals } from '@/components/calendar/events/rsvpVisuals';

function getGmtOffsetLabel(d: Date) {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'shortOffset',
  }).formatToParts(d);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/**
 * Google-style hour label: 1 → "1 AM", 13 → "1 PM", 0 → null (would clip at y=0)
 */
function hourLabel(h: number): string | null {
  if (h === 0) return null;
  if (h === 12) return '12 PM';
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${am ? 'AM' : 'PM'}`;
}

export function DayView(props: {
  date: Date;
  events: CalendarEvent[];
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onCreateEvent?: (d: Date) => void;
}) {
  const { date, events, onOpenEvent, onCreateEvent } = props;

  const isMobile = useIsMobile();
  const gutterPx = isMobile ? DAY_VIEW_GUTTER_PX_MOBILE : DAY_VIEW_GUTTER_PX;
  const gridTemplate = `${gutterPx}px minmax(0, 1fr)`;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  const tzLabel = getGmtOffsetLabel(today);
  const showNowIndicator = isSameDay(date, today);

  const dayEvents = eventsForDay(events, date);
  const positioned = layoutOverlappingEvents(dayEvents, date);

  // Now indicator position — no spacer offset
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = nowMinutes * DAY_VIEW_PX_PER_MIN;
  const gridHeight = 24 * DAY_VIEW_PX_PER_HOUR;

  // Auto-scroll to ~7 AM on mount (Google parity)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 7 * DAY_VIEW_PX_PER_HOUR;
  }, [date]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      {/*
        Single scroll container — same pattern as WeekView so the day header
        stays visible while the timed grid scrolls, and so column widths can
        never desync.
      */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)', scrollbarGutter: 'stable' }}
      >
        {/* Sticky day header */}
        <div
          className="sticky top-0 z-20 grid border-b border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className="py-2 pr-1 text-right text-[10px] text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
            {tzLabel}
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <div
              className={`text-[10px] font-semibold tracking-wide uppercase sm:text-[11px] ${
                showNowIndicator
                  ? 'text-[#1a73e8]'
                  : 'text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400'
              }`}
            >
              {format(date, 'EEE')}
            </div>
            <div
              className={
                showNowIndicator
                  ? 'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-bold text-white sm:h-8 sm:w-8'
                  : 'mt-0.5 flex h-7 w-7 items-center justify-center text-sm font-medium text-[var(--gcal-text,#3c4043)] sm:h-8 sm:w-8 dark:text-gray-100'
              }
            >
              {format(date, 'd')}
            </div>
          </div>
        </div>

        {/* Timed grid */}
        <div className="relative" style={{ height: gridHeight }}>
          {/* Grid background: 24 rows × (gutter + 1 day) columns */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: gridTemplate,
              gridTemplateRows: `repeat(24, ${DAY_VIEW_PX_PER_HOUR}px)`,
            }}
          >
            {hours.map((h) => [
              <div
                key={`gutter-${h}`}
                className="border-r border-[var(--gcal-border,#dadce0)] dark:border-gray-700"
              />,
              <button
                key={`cell-${h}`}
                type="button"
                aria-label={`Create event at ${hourLabel(h) ?? '12 AM'}`}
                className="cursor-pointer border-b border-[var(--gcal-border,#dadce0)] text-left hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={() => {
                  if (!onCreateEvent) return;
                  const d = new Date(date);
                  d.setHours(h, 0, 0, 0);
                  onCreateEvent(d);
                }}
              />,
            ])}
          </div>

          {/* Hour labels — absolute, centered ON grid lines (translateY -50%) */}
          {hours.map((h) => {
            const label = hourLabel(h);
            if (!label) return null;
            return (
              <div
                key={`label-${h}`}
                className="pointer-events-none absolute -translate-y-1/2 pr-1 text-right text-[10px] text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400"
                style={{ top: h * DAY_VIEW_PX_PER_HOUR, left: 0, width: gutterPx }}
              >
                {label}
              </div>
            );
          })}

          {/* Events overlay */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: gutterPx, right: 0 }}
          >
            <div className="relative h-full">
              {positioned.map((p) => {
                const allDay = !!p.event.allDay;
                const crossDay = !isSameDay(parseISO(p.event.start), parseISO(p.event.end));

                const dayStartMs = startOfDayDefaultHour(date).getTime();
                const dayEndMs = endOfDayExclusive(date).getTime();
                const evStart = parseISO(p.event.start).getTime();
                const evEnd = parseISO(p.event.end).getTime();

                const continuesFromPrev = evStart < dayStartMs;
                const continuesToNext = evEnd > dayEndMs;

                // No spacer offset — top is just minutes from midnight
                const top = allDay || crossDay ? 0 : p.startMin * DAY_VIEW_PX_PER_MIN;
                const height =
                  allDay || crossDay
                    ? DAY_VIEW_PX_PER_HOUR / 2
                    : Math.max(18, (p.endMin - p.startMin) * DAY_VIEW_PX_PER_MIN);

                const leftPct = (p.col / p.colCount) * 100;
                const widthPct = (1 / p.colCount) * 100;

                // Resolve visuals via centralized helper
                const rv = resolveRsvpVisuals(p.event);
                const { background, borderLeft, titleClass, textColorClass } = rv;

                const KindIcon = p.event.isTask
                  ? CircleIcon
                  : p.event.isAppointment
                    ? Grid2X2Icon
                    : null;

                return (
                  <button
                    key={p.event.id}
                    type="button"
                    title={`${p.event.title} (${format(parseISO(p.event.start), 'MMM d HH:mm')}–${format(parseISO(p.event.end), 'MMM d HH:mm')})`}
                    className="pointer-events-auto absolute cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + ${DAY_VIEW_COLUMN_GAP_PX / 2}px)`,
                      width: `calc(${widthPct}% - ${DAY_VIEW_COLUMN_GAP_PX}px)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvent(p.event.id, e.currentTarget.getBoundingClientRect());
                    }}
                  >
                    <div
                      className={[
                        'relative h-full overflow-hidden px-2 py-1 text-left text-xs',
                        continuesFromPrev ? 'rounded-t-none' : 'rounded-t-md',
                        continuesToNext ? 'rounded-b-none' : 'rounded-b-md',
                        textColorClass,
                      ].join(' ')}
                      style={{ background, borderLeft }}
                    >
                      <div className={`truncate font-semibold ${titleClass}`}>{p.event.title}</div>
                      {!allDay && !crossDay && (
                        <div className="truncate text-[11px] opacity-90">
                          {format(parseISO(p.event.start), 'h:mma').toLowerCase()} –{' '}
                          {format(parseISO(p.event.end), 'h:mma').toLowerCase()}
                        </div>
                      )}
                      {KindIcon && (
                        <div className="absolute top-1 right-1" aria-hidden="true">
                          <KindIcon size={8} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Now indicator */}
          {showNowIndicator && (
            <div
              className="pointer-events-none absolute right-0 z-10"
              style={{ left: gutterPx, top: nowTop }}
            >
              <div className="relative">
                <div className="absolute top-1/2 -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500" />
                <div className="border-t-2 border-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DayView;
