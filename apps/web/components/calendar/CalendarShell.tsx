'use client';

import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { useState } from 'react';

import { CalendarHeader } from './CalendarHeader';
import { CreateMenu } from './CreateMenu';
import { Sidebar } from './Sidebar';
import { DayView } from './views/DayView';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { YearView } from './views/YearView';
import { ScheduleView } from './views/ScheduleView';

import type { ApiCalendar } from '@/lib/calendars/useCalendarsApi';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { DaySkeleton, MonthSkeleton, WeekSkeleton } from '@/components/calendar/Skeletons';

export function CalendarShell(props: {
  view: CalendarView;
  date: Date;
  events: CalendarEvent[];
  loading?: boolean;
  calendars: ApiCalendar[];
  visibleCalendarIds: Set<string>;
  onToggleCalendar: (id: string) => void;
  onCreateCalendar: (name: string, color?: string) => Promise<void>;
  onUpdateCalendar: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  onDeleteCalendar: (id: string) => Promise<void>;
  onChangeView: (v: CalendarView) => void;
  onChangeDate: (d: Date) => void;
  onNavigate: (next: { view?: CalendarView; date?: Date }) => void;
  onCreateEvent: (d: Date, kind?: CreateKind) => void;
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onOpenDayPopover: (d: Date, rect: DOMRect) => void;
  onExportCalendar?: () => void;
  onImportCalendar?: (file: File) => void;
  onToggleTasks?: () => void;
  tasksOpen?: boolean;
  pendingTasksCount?: number;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenAnalytics?: () => void;
  onOpenTemplates?: () => void;
  onOpenWorldClock?: () => void;
  onOpenSettings?: () => void;
}) {
  const {
    view,
    date,
    events,
    loading = false,
    calendars,
    visibleCalendarIds,
    onToggleCalendar,
    onCreateCalendar,
    onUpdateCalendar,
    onDeleteCalendar,
    onChangeView,
    onChangeDate,
    onNavigate,
    onCreateEvent,
    onOpenEvent,
    onOpenDayPopover,
    onExportCalendar,
    onImportCalendar,
    onToggleTasks,
    tasksOpen,
    pendingTasksCount,
    onOpenCommandPalette,
    onOpenShortcutsHelp,
    onOpenAnalytics,
    onOpenTemplates,
    onOpenWorldClock,
    onOpenSettings,
  } = props;

  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const onToday = () => onChangeDate(new Date());

  const onPrev = () => {
    if (view === 'year') return onChangeDate(addYears(date, -1));
    if (view === 'month') return onChangeDate(addMonths(date, -1));
    if (view === 'week') return onChangeDate(addWeeks(date, -1));
    if (view === 'schedule') return onChangeDate(addDays(date, -14));
    return onChangeDate(addDays(date, -1));
  };

  const onNext = () => {
    if (view === 'year') return onChangeDate(addYears(date, 1));
    if (view === 'month') return onChangeDate(addMonths(date, 1));
    if (view === 'week') return onChangeDate(addWeeks(date, 1));
    if (view === 'schedule') return onChangeDate(addDays(date, 14));
    return onChangeDate(addDays(date, 1));
  };

  const sidebarNode = (
    <Sidebar
      currentDate={date}
      selectedDate={date}
      calendars={calendars}
      visibleCalendarIds={visibleCalendarIds}
      onToggleCalendar={onToggleCalendar}
      onCreateCalendar={onCreateCalendar}
      onUpdateCalendar={onUpdateCalendar}
      onDeleteCalendar={onDeleteCalendar}
      onPickDate={(d) => {
        onNavigate({ date: d });
        if (isMobile) setSidebarOpen(false);
      }}
      onCreate={(kind) => onCreateEvent(date, kind)}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFD] dark:bg-gray-950">
      <CalendarHeader
        view={view}
        date={date}
        onToday={onToday}
        onPrev={onPrev}
        onNext={onNext}
        onChangeView={onChangeView}
        onChangeDate={onChangeDate}
        onCreate={(kind) => onCreateEvent(date, kind)}
        onExportCalendar={onExportCalendar}
        onImportCalendar={onImportCalendar}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenEvent={onOpenEvent}
        sidebarOpen={sidebarOpen}
        onToggleTasks={onToggleTasks}
        tasksOpen={tasksOpen}
        pendingTasksCount={pendingTasksCount}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenShortcutsHelp={onOpenShortcutsHelp}
        onOpenAnalytics={onOpenAnalytics}
        onOpenTemplates={onOpenTemplates}
        onOpenWorldClock={onOpenWorldClock}
        onOpenSettings={onOpenSettings}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/*
          DESKTOP SIDEBAR — inline (flex push, NO z-index)
          Width animates between w-56 (open) and w-0 (closed).
          On close, the inner Sidebar stays mounted but is clipped + invisible.
          That keeps state alive (mini-calendar cursor, etc) across toggles.
        */}
        <aside
          aria-hidden={!sidebarOpen}
          className={[
            'shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out',
            sidebarOpen ? 'w-44 sm:w-56' : 'w-0',
          ].join(' ')}
        >
          <div
            className={[
              'h-full w-44 transition-opacity duration-150 sm:w-56',
              sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
          >
            {sidebarNode}
          </div>
        </aside>

        {/*
          DESKTOP COLLAPSED FAB — only thing with z-index.
          Floats above the main calendar at the top-left, matching Google.
        */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-30">
            <CreateMenu collapsed onSelect={(kind) => onCreateEvent(date, kind)} />
          </div>
        )}

        {/*
          MOBILE DRAWER — fixed overlay, separate render path from desktop.
          Closed = slid off-screen via translate-x, no DOM unmount (so the
          opening animation runs on every toggle).
        */}
        <aside
          aria-hidden={!sidebarOpen}
          className={[
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform overflow-y-auto bg-[#F8FAFD] shadow-xl transition-transform duration-200 ease-in-out sm:hidden dark:bg-gray-900',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          {sidebarNode}
        </aside>

        {/* MOBILE BACKDROP — sits BELOW the drawer (z-40), above main */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 sm:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="relative flex-1 overflow-auto p-2 sm:p-4">
          {view === 'year' &&
            (loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a73e8] border-t-transparent" />
              </div>
            ) : (
              <YearView
                date={date}
                events={events}
                onPickMonth={(d) => onNavigate({ date: d, view: 'month' })}
                onOpenDayPopover={onOpenDayPopover}
              />
            ))}
          {view === 'month' &&
            (loading ? (
              <MonthSkeleton />
            ) : (
              <MonthView
                date={date}
                events={events}
                onSelectDate={(d) => onNavigate({ date: d, view: 'day' })}
                onCreate={(d) => onCreateEvent(d)}
                onOpenEvent={onOpenEvent}
                onOpenDayPopover={onOpenDayPopover}
              />
            ))}
          {view === 'week' &&
            (loading ? (
              <WeekSkeleton />
            ) : (
              <WeekView
                date={date}
                events={events}
                onOpenEvent={onOpenEvent}
                onCreateEvent={onCreateEvent}
              />
            ))}
          {view === 'day' &&
            (loading ? (
              <DaySkeleton />
            ) : (
              <DayView
                date={date}
                events={events}
                onOpenEvent={onOpenEvent}
                onCreateEvent={(d) => onCreateEvent(d)}
              />
            ))}
          {view === 'schedule' &&
            (loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B57D0] border-t-transparent" />
              </div>
            ) : (
              <ScheduleView
                date={date}
                events={events}
                onOpenEvent={onOpenEvent}
                onCreateEvent={(d) => onCreateEvent(d)}
              />
            ))}
        </main>
      </div>
    </div>
  );
}
