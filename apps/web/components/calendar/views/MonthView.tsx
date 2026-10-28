'use client';

import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { CircleIcon, Grid2X2Icon } from 'lucide-react';
import { resolveRsvpVisuals } from '@/components/calendar/events/rsvpVisuals';

import { daysOfWeek } from '@/constants';
import { eventsForDay } from '@/lib/events/day';
import { getEventLayoutRange } from '@/lib/events/layout-range';
import { isBarEventInMonth } from '@/lib/events/month-classify';
import { buildWeekBarLayout } from '@/lib/events/month-week-segments';
import { generateMonthGrid } from '@/lib/month-grid';
import { useMemo } from 'react';

export function MonthView(props: {
  date: Date;
  events: CalendarEvent[];
  onSelectDate?: (d: Date) => void;
  onCreate: (d: Date) => void;
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onOpenDayPopover?: (d: Date, rect: DOMRect) => void;
}) {
  const { date, events, onSelectDate, onCreate, onOpenEvent, onOpenDayPopover } = props;

  const cells = useMemo(() => generateMonthGrid(date), [date]);
  const weeks = useMemo(
    () =>
      Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7)),
    [cells],
  );

  const ROW_HEIGHT = 18;
  const ROW_GAP = 4;
  const BAR_ROWS = 2;
  const TOTAL_ROWS = 4;
  const OVERLAY_TOP = 44;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Day of week headers */}
      <div className="grid w-full grid-cols-7 border-b border-[var(--gcal-border,#dadce0)] text-center">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="py-2 text-[11px] font-medium tracking-wider text-[var(--gcal-text-muted,#70757a)] uppercase"
          >
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day.slice(0, 3)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1">
        {weeks.map((weekCells, weekIdx) => {
          const weekDates = weekCells.map((c) => c.date);

          const weekStart = startOfDay(weekDates[0]);
          const weekEnd = addDays(startOfDay(weekDates[6]), 1); // exclusive

          const eventsForWeek = events.filter((ev) => {
            const { startMs, endMsExclusive } = getEventLayoutRange(ev);
            return endMsExclusive > weekStart.getTime() && startMs < weekEnd.getTime();
          });

          const { segments, laneCount } = buildWeekBarLayout(weekDates, eventsForWeek);

          const lanesShown = Math.min(laneCount, BAR_ROWS);
          const timedRowsPerDay = Math.max(0, TOTAL_ROWS - lanesShown);
          const reservedOverlayHeight = BAR_ROWS * ROW_HEIGHT + Math.max(0, BAR_ROWS) * ROW_GAP;

          return (
            <div key={weekIdx} className="relative">
              <div className="grid grid-cols-7">
                {weekCells.map((cell, colIdx) => {
                  const label = format(cell.date, 'd');
                  const todayClass = cell.isToday
                    ? 'inline-flex items-center justify-center rounded-full bg-[#0B57D0] text-white'
                    : '';

                  const dayAll = eventsForDay(eventsForWeek, cell.date);

                  const timed = dayAll
                    .filter((ev) => !isBarEventInMonth(ev))
                    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

                  const visibleTimed = timed.slice(0, timedRowsPerDay);
                  const hiddenTimed = Math.max(0, timed.length - visibleTimed.length);

                  const hiddenBars = segments.filter(
                    (s) =>
                      s.lane >= lanesShown && colIdx >= s.startCol && colIdx < s.endColExclusive,
                  ).length;

                  const hiddenTotal = hiddenBars + hiddenTimed;

                  return (
                    <div
                      key={cell.date.toISOString()}
                      role="button"
                      className="flex min-h-[60px] cursor-pointer flex-col border-r border-b border-[var(--gcal-border,#dadce0)] p-1 text-sm hover:bg-[var(--gcal-bg-hover,#f1f3f4)] sm:min-h-[120px] sm:p-2"
                      onClick={() => onCreate(cell.date)}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          className={`${todayClass} h-7 w-7`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDate?.(cell.date);
                          }}
                        >
                          {label}
                        </button>
                      </div>

                      <div style={{ height: reservedOverlayHeight }} />

                      <div className="relative mt-1 space-y-1 text-left">
                        {visibleTimed.map((ev) => {
                          const isNotEvent = ev.isTask ? (
                            <CircleIcon size={8} />
                          ) : ev.isAppointment ? (
                            <Grid2X2Icon size={8} />
                          ) : null;

                          const openId = ev.id;

                          // RSVP visuals for visible timed events in month cells
                          const rv = resolveRsvpVisuals(ev);
                          const { background: bgStyle, titleClass, textColorClass } = rv;

                          return (
                            <div
                              key={ev.id}
                              className={`hidden cursor-pointer items-center gap-2 truncate rounded px-1 text-[11px] hover:bg-gray-200 sm:flex dark:hover:bg-gray-700 ${textColorClass}`}
                              title={ev.title}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                onOpenEvent(openId, rect);
                              }}
                              style={{ background: bgStyle }}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: ev.color ?? '#039BE5' }}
                              />
                              <span className="hidden shrink-0 text-white sm:inline">
                                {format(parseISO(ev.start), 'h:mma').toLowerCase()}
                              </span>
                              <div className="flex items-center gap-1">
                                {isNotEvent}
                                <span className={titleClass}>{ev.title}</span>
                              </div>
                            </div>
                          );
                        })}

                        {hiddenTotal > 0 && (
                          <button
                            type="button"
                            className="relative mt-1 w-full rounded px-1 py-0.5 text-left text-xs font-semibold text-gray-900 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                            onClick={(clickEvt) => {
                              clickEvt.stopPropagation();
                              if (onOpenDayPopover) {
                                const rect = clickEvt.currentTarget.getBoundingClientRect();
                                onOpenDayPopover(cell.date, rect);
                              }
                            }}
                          >
                            <span className="hidden sm:inline">{hiddenTotal} more</span>
                            <span className="sm:hidden">+{hiddenTotal}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-x-0 px-1" style={{ top: OVERLAY_TOP }}>
                <div
                  className="grid grid-cols-7"
                  style={{ gridAutoRows: `${ROW_HEIGHT}px`, rowGap: `${ROW_GAP}px` }}
                >
                  {segments
                    .filter((s) => s.lane < lanesShown)
                    .map((s) => {
                      const roundedLeft = !s.continuesFromPrevWeek;
                      const roundedRight = !s.continuesToNextWeek;

                      const leftCapClass = roundedLeft ? 'rounded-l-full' : 'rounded-l-none';
                      const rightCapClass = roundedRight ? 'rounded-r-full' : 'rounded-r-none';

                      const ev = s.event as CalendarEvent & { color?: string };
                      const rv = resolveRsvpVisuals(ev);
                      const { background: bg, borderLeft, titleClass, textColorClass } = rv;
                      const openId = ev.id;

                      return (
                        <div
                          key={`${s.event.id}-${weekIdx}-${s.startCol}-${s.lane}`}
                          className={`pointer-events-auto relative flex items-center truncate px-2 text-[11px] font-medium ${textColorClass} hover:bg-[#0090d6] ${leftCapClass} ${rightCapClass}`}
                          style={{
                            gridColumn: `${s.startCol + 1} / ${s.endColExclusive + 1}`,
                            gridRow: `${s.lane + 1}`,
                            background: bg,
                            borderLeft: borderLeft,
                          }}
                          title={s.event.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            onOpenEvent(openId, rect);
                          }}
                        >
                          <span className={titleClass + ' truncate'}>{s.event.title}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
