'use client';

import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
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
import { resolveRsvpVisuals } from '@/components/calendar/events/rsvpVisuals';
import { layoutOverlappingEvents } from '@/lib/events/overlap-layout';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

function getGmtOffsetLabel(d: Date) {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'shortOffset',
  }).formatToParts(d);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

function isAllDayStyle(ev: CalendarEvent): boolean {
  if (ev.allDay) return true;
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  return start.toDateString() !== end.toDateString();
}

function hourLabel(h: number): string | null {
  if (h === 0) return null;
  if (h === 12) return '12 PM';
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${am ? 'AM' : 'PM'}`;
}

export function WeekView(props: {
  date: Date;
  events: CalendarEvent[];
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onCreateEvent: (d: Date) => void;
}) {
  const { date, events, onOpenEvent, onCreateEvent } = props;

  const isMobile = useIsMobile();
  const gutterPx = isMobile ? DAY_VIEW_GUTTER_PX_MOBILE : DAY_VIEW_GUTTER_PX;
  const gridTemplate = `${gutterPx}px repeat(7, minmax(0, 1fr))`;

  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const today = new Date();
  const tzLabel = getGmtOffsetLabel(today);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = nowMinutes * DAY_VIEW_PX_PER_MIN;

  const allDayEvents = events.filter(isAllDayStyle);
  const hasAllDay = allDayEvents.length > 0;

  const positionedByDay = days.map((day) => {
    const dayEvents = eventsForDay(events, day).filter((ev) => !isAllDayStyle(ev));
    return layoutOverlappingEvents(dayEvents, day);
  });

  // Auto-scroll to ~7 AM on mount (Google parity)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 7 * DAY_VIEW_PX_PER_HOUR;
  }, []);

  const gridHeight = 24 * DAY_VIEW_PX_PER_HOUR;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      {/*
        Single scroll container — guarantees column alignment because every
        row in here lives inside the same width context. The scrollbar
        gutter is reserved on the right so widths don't jitter when the
        scrollbar appears.
      */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 180px)',
          scrollbarGutter: 'stable',
        }}
      >
        {/* ── STICKY HEADER: day labels ───────────────────────────────── */}
        <div
          className="sticky top-0 z-20 grid border-b border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className="py-2 pr-1 text-right text-[10px] text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
            {tzLabel}
          </div>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col items-center justify-center py-2"
              >
                <div
                  className={`text-[10px] font-semibold tracking-wide uppercase sm:text-[11px] ${
                    isToday
                      ? 'text-[#1a73e8]'
                      : 'text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400'
                  }`}
                >
                  <span className="sm:hidden">{format(day, 'EEEEE')}</span>
                  <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                </div>
                <div
                  className={
                    isToday
                      ? 'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-bold text-white sm:h-8 sm:w-8'
                      : 'mt-0.5 flex h-7 w-7 items-center justify-center text-sm font-medium text-[var(--gcal-text,#3c4043)] sm:h-8 sm:w-8 dark:text-gray-100'
                  }
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STICKY HEADER: all-day row (only when there are all-day events) ── */}
        {hasAllDay && (
          <div
            className="sticky z-10 grid border-b border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900"
            style={{
              gridTemplateColumns: gridTemplate,
              top: 'var(--week-header-h, 56px)',
            }}
          >
            <div className="py-1 pr-1 text-right text-[10px] text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
              all-day
            </div>
            {days.map((day) => {
              const dayAllDay = allDayEvents.filter((ev) => {
                const s = new Date(ev.start).getTime();
                const e = new Date(ev.end).getTime();
                const ds = day.getTime();
                const de = addDays(day, 1).getTime();
                return s < de && e > ds;
              });
              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[28px] border-l border-[var(--gcal-border,#dadce0)] px-0.5 py-0.5 dark:border-gray-700"
                >
                  {dayAllDay.map((ev) => {
                    // RSVP + color resolution for all-day pills
                    const evTyped = ev as {
                      attendees?: Array<{ email?: string; rsvp?: string }>;
                      userRsvp?: string;
                    };
                    const attendee = evTyped.attendees?.find((a) => !!a.email);
                    const rsvp = evTyped.userRsvp ?? attendee?.rsvp;
                    const isDeclined = rsvp === 'declined';
                    const rv = resolveRsvpVisuals(ev);
                    const { background: bg, borderLeft } = rv;

                    return (
                      <div
                        key={ev.id}
                        className={`mb-0.5 cursor-pointer truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${isDeclined ? 'text-[#0B57D0]' : 'text-white'}`}
                        style={{ background: bg, borderLeft }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvent(ev.id, e.currentTarget.getBoundingClientRect());
                        }}
                      >
                        <span className={isDeclined ? 'line-through' : ''}>{ev.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TIMED GRID — same gridTemplate, columns guaranteed aligned ── */}
        <div className="relative" style={{ height: gridHeight }}>
          {/* Grid background: 24 rows × (gutter + 7 day) columns */}
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
              ...days.map((day) => (
                <div
                  key={`${day.toISOString()}-${h}`}
                  className="cursor-pointer border-r border-b border-[var(--gcal-border,#dadce0)] last:border-r-0 hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:border-gray-700 dark:hover:bg-gray-800"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onCreateEvent(d);
                  }}
                />
              )),
            ])}
          </div>

          {/* Hour labels — absolute, centered ON the grid line */}
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

          {/* Events overlay — offset by gutter, no padding loss */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: gutterPx, right: 0 }}
          >
            <div
              className="relative grid h-full"
              style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
            >
              {days.map((day, dayIdx) => {
                const positioned = positionedByDay[dayIdx];
                const dayStartMs = startOfDayDefaultHour(day).getTime();
                const dayEndMs = endOfDayExclusive(day).getTime();

                return (
                  <div key={day.toISOString()} className="relative">
                    {positioned.map((p) => {
                      const evStart = parseISO(p.event.start).getTime();
                      const evEnd = parseISO(p.event.end).getTime();
                      const continuesFromPrev = evStart < dayStartMs;
                      const continuesToNext = evEnd > dayEndMs;

                      const top = p.startMin * DAY_VIEW_PX_PER_MIN;
                      const height = Math.max(18, (p.endMin - p.startMin) * DAY_VIEW_PX_PER_MIN);
                      const leftPct = (p.col / p.colCount) * 100;
                      const widthPct = (1 / p.colCount) * 100;

                      // RSVP visual state and invitation lighter color
                      // Prefer userRsvp mapping, fall back to attendee.rsvp
                      const rv = resolveRsvpVisuals(p.event);
                      const { background: bg, borderLeft } = rv;

                      return (
                        <div
                          key={p.event.id}
                          className="pointer-events-auto absolute cursor-pointer"
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
                              'h-full overflow-hidden px-1.5 py-0.5 text-[11px]',
                              continuesFromPrev ? 'rounded-t-none rounded-b-md' : 'rounded-t-md',
                              continuesToNext ? 'rounded-b-none' : 'rounded-b-md',
                              rv.textColorClass,
                            ].join(' ')}
                            style={{ background: bg, borderLeft }}
                          >
                            <div className={`truncate font-semibold ${rv.titleClass}`}>
                              {p.event.title}
                            </div>
                            <div className="hidden truncate text-[10px] opacity-90 sm:block">
                              {format(parseISO(p.event.start), 'h:mma').toLowerCase()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Now indicator: only render inside the today's column */}
                    {isSameDay(day, today) && nowTop >= 0 && nowTop <= gridHeight && (
                      <div
                        className="pointer-events-none absolute right-0 left-0 z-10"
                        style={{ top: nowTop }}
                      >
                        <div className="relative">
                          <div className="absolute top-1/2 -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500" />
                          <div className="border-t-2 border-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
