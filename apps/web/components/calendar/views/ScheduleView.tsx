'use client';

import {
  CalendarIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
  VideoIcon,
} from 'lucide-react';
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { eventsForDay } from '@/lib/events/day';

type Props = {
  date: Date;
  events: CalendarEvent[];
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onCreateEvent?: (d: Date) => void;
  onUpdateEvent?: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
};

function formatEventTime(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day';
  try {
    const s = parseISO(ev.start);
    const e = parseISO(ev.end);
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  } catch {
    return 'Timed';
  }
}

export function ScheduleView({
  date,
  events,
  onOpenEvent,
  onCreateEvent,
  onUpdateEvent,
}: Props) {
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // Generate 31 consecutive days from the anchor date
  const daysList = useMemo(() => {
    const list: Date[] = [];
    const base = startOfDay(date);
    for (let i = 0; i < 31; i++) {
      list.push(addDays(base, i));
    }
    return list;
  }, [date]);

  // Group events by day
  const groupedDays = useMemo(() => {
    return daysList
      .map((d) => {
        const dayEvts = eventsForDay(events, d);
        return {
          date: d,
          events: dayEvts,
        };
      })
      .filter((g) => g.events.length > 0);
  }, [daysList, events]);

  const toggleTask = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.stopPropagation();
    const isNowCompleted = !completedTaskIds.has(ev.id);
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(ev.id)) next.delete(ev.id);
      else next.add(ev.id);
      return next;
    });
    if (onUpdateEvent) {
      void onUpdateEvent(ev.id, {
        busyStatus: isNowCompleted ? 'free' : 'busy',
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Schedule View Sub-header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
              Schedule & Agenda
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Chronological feed of your upcoming meetings, tasks, and events.
            </p>
          </div>
          {onCreateEvent && (
            <button
              type="button"
              onClick={() => onCreateEvent(date)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B57D0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#094bb5] active:scale-98"
            >
              <PlusIcon size={16} />
              <span>New Event</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {groupedDays.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/50 py-16 text-center dark:border-gray-800 dark:bg-gray-900/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0B57D0] dark:bg-blue-950/60 dark:text-blue-400">
              <CalendarIcon size={32} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
              No events scheduled in this period
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enjoy your free time, or schedule a new meeting or task to stay organized.
            </p>
            {onCreateEvent && (
              <button
                type="button"
                onClick={() => onCreateEvent(date)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B57D0] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#094bb5]"
              >
                <PlusIcon size={16} />
                <span>Create an event</span>
              </button>
            )}
          </div>
        )}

        {/* Day Groups */}
        {groupedDays.map(({ date: dayDate, events: dayEvents }) => {
          const isTodayDate = isToday(dayDate);
          const isTomorrowDate = isTomorrow(dayDate);

          return (
            <div key={dayDate.toISOString()} className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              {/* Left Day Pill */}
              <div className="flex shrink-0 items-start sm:w-36">
                <div
                  className={[
                    'flex w-full items-center justify-between rounded-2xl border px-3 py-2 sm:flex-col sm:items-start sm:px-4 sm:py-3',
                    isTodayDate
                      ? 'border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-850 dark:text-gray-300',
                  ].join(' ')}
                >
                  <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                      {isTodayDate ? 'Today' : isTomorrowDate ? 'Tomorrow' : format(dayDate, 'EEE')}
                    </span>
                    <div className="text-2xl font-black sm:text-3xl">
                      {format(dayDate, 'd')}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(dayDate, 'MMM yyyy')}
                  </span>
                </div>
              </div>

              {/* Right Event Cards Feed */}
              <div className="flex-1 space-y-2.5">
                {dayEvents.map((ev) => {
                  const isTask = ev.isTask || ev.title.includes('[Task]') || ev.description?.includes('#task');
                  const isCompleted = completedTaskIds.has(ev.id);
                  const color = ev.color || '#0B57D0';

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => onOpenEvent(ev.id, e.currentTarget.getBoundingClientRect())}
                      className={[
                        'group relative flex flex-col justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer sm:flex-row sm:items-center dark:bg-gray-850',
                        isCompleted
                          ? 'border-gray-200 opacity-60 dark:border-gray-800'
                          : 'border-gray-200 hover:border-blue-300 dark:border-gray-800 dark:hover:border-blue-600',
                      ].join(' ')}
                    >
                      {/* Left accent color strip */}
                      <span
                        className="absolute top-3 bottom-3 left-0 w-1.5 rounded-r-full transition-all group-hover:w-2"
                        style={{ backgroundColor: color }}
                      />

                      {/* Main details */}
                      <div className="min-w-0 pl-2">
                        <div className="flex items-center gap-2">
                          {isTask && (
                            <button
                              type="button"
                              onClick={(e) => toggleTask(e, ev)}
                              className="text-gray-400 hover:text-blue-600 transition"
                              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {isCompleted ? (
                                <CheckCircle2Icon size={18} className="text-emerald-500" />
                              ) : (
                                <CircleIcon size={18} />
                              )}
                            </button>
                          )}
                          <h4
                            className={[
                              'truncate text-base font-semibold',
                              isCompleted
                                ? 'text-gray-400 line-through dark:text-gray-500'
                                : 'text-gray-900 dark:text-white',
                            ].join(' ')}
                          >
                            {ev.title}
                          </h4>
                          {isTask && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Task
                            </span>
                          )}
                        </div>

                        {/* Event Metadata (time, location, guests) */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ClockIcon size={13} className="text-gray-400" />
                            {formatEventTime(ev)}
                          </span>

                          {ev.location && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                              <MapPinIcon size={13} className="text-gray-400 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}

                          {Array.isArray(ev.guests) && ev.guests.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <UsersIcon size={13} className="text-gray-400" />
                              <span>{ev.guests.length} guest{ev.guests.length > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 pl-2 sm:pl-0">
                        {ev.meetingUrl && (
                          <a
                            href={ev.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                          >
                            <VideoIcon size={14} />
                            <span>Join Video</span>
                            <ExternalLinkIcon size={12} className="opacity-70" />
                          </a>
                        )}

                        <span
                          className="hidden h-3 w-3 rounded-full sm:block"
                          style={{ backgroundColor: color }}
                          title="Calendar category color"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
