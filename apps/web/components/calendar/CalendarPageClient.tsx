'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

import { CalendarShell } from '@/components/calendar/CalendarShell';
import { CreateEventModal } from '@/components/calendar/events/CreateEventModal';
import { DayEventsPopover } from '@/components/calendar/events/DayEventsPopover';
import { EventPopover } from '@/components/calendar/events/EventPopover';
import { CommandPalette } from '@/components/calendar/CommandPalette';
import { TasksSidePanel } from '@/components/calendar/TasksSidePanel';
import { KeyboardShortcutsModal } from '@/components/calendar/KeyboardShortcutsModal';
import { CalendarAnalyticsModal } from '@/components/calendar/CalendarAnalyticsModal';
import { QuickTemplatesModal } from '@/components/calendar/QuickTemplatesModal';
import { WorldClockModal } from '@/components/calendar/WorldClockModal';
import { CalendarSettingsModal } from '@/components/calendar/CalendarSettingsModal';

import { exportEventsToICS, importEventsFromICS } from '@/lib/events/ical';
import { useEventsApi } from '@/lib/events/useEventsApi';
import { useCalendarsApi } from '@/lib/calendars/useCalendarsApi';
import { useCalendarNavigation } from '@/lib/hooks/useCalendarNavigation';
import { usePopoverState } from '@/lib/hooks/usePopoverState';
import { useToast } from '@/components/ui/Toast';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useSlowConnection } from '@/lib/hooks/useSlowConnection';
import { playSuccessChime } from '@/lib/utils/sound';

export default function CalendarPageClient() {
  const router = useRouter();
  const { showToast } = useToast();

  // ── URL-driven navigation (view + date + API range) ────────────────────────
  const { view, date, range, navigate } = useCalendarNavigation();

  // ── Calendars data + visibility ────────────────────────────────────────────
  const {
    calendars,
    visibleCalendarIds,
    toggleCalendar,
    createCalendar,
    updateCalendar,
    deleteCalendar,
  } = useCalendarsApi();

  // ── Events data + CRUD ─────────────────────────────────────────────────────
  const {
    events,
    addEvent,
    importEvents,
    updateEvent,
    removeEvent,
    unauthorized,
    loading,
    mutating,
  } = useEventsApi(range);

  // True after 6 s of initial loading — signals a likely Render cold-start.
  const isApiSlow = useSlowConnection(loading);

  // ── Filter events by visible calendars ─────────────────────────────────────
  const visibleEvents = useMemo(() => {
    if (visibleCalendarIds.size === 0) return events;
    return events.filter((ev) => !ev.calendarId || visibleCalendarIds.has(ev.calendarId));
  }, [events, visibleCalendarIds]);

  // ── Popover state ──────────────────────────────────────────────────────────
  const {
    eventPopoverOpen,
    eventPopoverRect,
    activeEvent,
    openEventPopover,
    closeEventPopover,
    eventPopoverKey,
    dayPopoverOpen,
    dayPopoverDate,
    dayPopoverRect,
    dayPopoverEvents,
    openDayPopover,
    closeDayPopover,
  } = usePopoverState(visibleEvents);

  // ── Create modal state ─────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createKind, setCreateKind] = useState<CreateKind>('event');

  // ── Modals & Drawers ───────────────────────────────────────────────────────
  const [tasksOpen, setTasksOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [worldClockOpen, setWorldClockOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pendingTasksCount = useMemo(() => {
    return visibleEvents.filter(
      (ev) => ev.isTask || ev.title.includes('[Task]') || ev.description?.includes('#task'),
    ).length;
  }, [visibleEvents]);

  const openCreateForDate = (d: Date, kind: CreateKind = 'event') => {
    setCreateDate(d);
    setCreateKind(kind);
    setCreateOpen(true);
  };

  // ── Global shortcut Cmd+, for settings ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useKeyboardShortcuts({
    onToday: () => navigate({ date: new Date() }),
    onPrev: () => {
      if (view === 'year') navigate({ date: addYears(date, -1) });
      else if (view === 'month') navigate({ date: addMonths(date, -1) });
      else if (view === 'week') navigate({ date: addWeeks(date, -1) });
      else if (view === 'schedule') navigate({ date: addDays(date, -14) });
      else navigate({ date: addDays(date, -1) });
    },
    onNext: () => {
      if (view === 'year') navigate({ date: addYears(date, 1) });
      else if (view === 'month') navigate({ date: addMonths(date, 1) });
      else if (view === 'week') navigate({ date: addWeeks(date, 1) });
      else if (view === 'schedule') navigate({ date: addDays(date, 14) });
      else navigate({ date: addDays(date, 1) });
    },
    onChangeView: (v) => navigate({ view: v }),
    onNewEvent: () => openCreateForDate(date, 'event'),
    onToggleCommandPalette: () => setCommandPaletteOpen((prev) => !prev),
    onToggleShortcutsHelp: () => setShortcutsModalOpen((prev) => !prev),
  });

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (unauthorized) router.replace('/login');
  }, [unauthorized, router]);

  // ── Export / Import ────────────────────────────────────────────────────────
  const handleExportCalendar = () => {
    const ics = exportEventsToICS(visibleEvents);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported calendar to ics file', 'success');
  };

  const handleImportCalendar = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importEventsFromICS(text);
      if (imported.length === 0) {
        showToast('No events found in file', 'info');
        return;
      }
      const failed = await importEvents(imported);
      if (failed > 0) showToast(`${failed} of ${imported.length} event(s) failed to import`, 'error');
      else {
        showToast(`Imported ${imported.length} event(s)`, 'success');
        playSuccessChime();
      }
    } catch (err) {
      console.error('[handleImportCalendar]', err);
      showToast('Failed to import calendar file', 'error');
    }
  };

  // ── CRUD wrappers with toast feedback & chime ────────────────────────────
  const handleAddEvent = async (ev: CalendarEvent) => {
    try {
      await addEvent(ev);
      playSuccessChime();
      showToast('Event created successfully', 'success');
      return true;
    } catch {
      showToast('Failed to create event', 'error');
      return false;
    }
  };

  const handleCreateTask = async (title: string, dueDate: Date) => {
    return handleAddEvent({
      id: crypto.randomUUID(),
      title,
      start: dueDate.toISOString(),
      end: addDays(dueDate, 1).toISOString(),
      allDay: true,
      isTask: true,
      color: '#F59E0B',
    });
  };

  const handleUpdateEvent = async (...args: Parameters<typeof updateEvent>) => {
    try {
      await updateEvent(...args);
      playSuccessChime();
      showToast('Event updated', 'success');
    } catch {
      showToast('Failed to update event', 'error');
    }
  };

  const handleRemoveEvent = async (...args: Parameters<typeof removeEvent>) => {
    try {
      await removeEvent(...args);
      showToast('Event deleted', 'success');
    } catch {
      showToast('Failed to delete event', 'error');
    }
  };

  const handleScheduleFocusBlock = async (title: string, start: Date, end: Date) => {
    await handleAddEvent({
      id: crypto.randomUUID(),
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
      color: '#3F51B5',
      busyStatus: 'busy',
    });
  };

  const handleScheduleTemplate = async (preset: {
    title: string;
    description: string;
    start: Date;
    end: Date;
    color: string;
    meetingUrl?: string;
  }): Promise<boolean> => {
    return handleAddEvent({
      id: crypto.randomUUID(),
      title: preset.title,
      description: preset.description,
      start: preset.start.toISOString(),
      end: preset.end.toISOString(),
      allDay: false,
      color: preset.color,
      meetingUrl: preset.meetingUrl,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Progress bar during in-flight operations */}
      {mutating && (
        <div className="fixed top-0 left-0 z-[100] h-0.5 w-full animate-pulse bg-[#0B57D0]" />
      )}

      {/* Warm-up banner */}
      {isApiSlow && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 backdrop-blur-md px-4 py-3 text-sm text-blue-800 shadow-xl dark:border-blue-900 dark:bg-blue-950/90 dark:text-blue-200"
        >
          <svg
            className="h-4 w-4 animate-spin shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
          </svg>
          <span>Connecting to calendar backend server...</span>
        </div>
      )}

      <CalendarShell
        view={view}
        date={date}
        events={visibleEvents}
        loading={loading}
        calendars={calendars}
        visibleCalendarIds={visibleCalendarIds}
        onToggleCalendar={toggleCalendar}
        onCreateCalendar={createCalendar}
        onUpdateCalendar={updateCalendar}
        onDeleteCalendar={deleteCalendar}
        onChangeView={(v) => navigate({ view: v })}
        onChangeDate={(d) => navigate({ date: d })}
        onNavigate={navigate}
        onCreateEvent={openCreateForDate}
        onOpenEvent={openEventPopover}
        onOpenDayPopover={openDayPopover}
        onExportCalendar={handleExportCalendar}
        onImportCalendar={handleImportCalendar}
        onToggleTasks={() => setTasksOpen((v) => !v)}
        tasksOpen={tasksOpen}
        pendingTasksCount={pendingTasksCount}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenShortcutsHelp={() => setShortcutsModalOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenWorldClock={() => setWorldClockOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <CreateEventModal
        open={createOpen}
        initialDate={createDate ?? date}
        initialKind={createKind}
        calendars={calendars}
        onClose={() => setCreateOpen(false)}
        onCreate={handleAddEvent}
      />

      <EventPopover
        key={eventPopoverKey}
        open={eventPopoverOpen}
        anchorRect={eventPopoverRect}
        event={activeEvent}
        onClose={closeEventPopover}
        onUpdate={handleUpdateEvent}
        onDelete={handleRemoveEvent}
      />

      <DayEventsPopover
        events={dayPopoverEvents}
        anchorRect={dayPopoverRect}
        date={dayPopoverDate}
        open={dayPopoverOpen}
        onClose={closeDayPopover}
        disableOutsideClose={eventPopoverOpen}
        onPickEvent={(eventId, rect) => openEventPopover(eventId, rect)}
      />

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        events={visibleEvents}
        onOpenEvent={openEventPopover}
        onChangeView={(v) => navigate({ view: v })}
        onChangeDate={(d) => navigate({ date: d })}
        onCreateEvent={(kind) => openCreateForDate(date, kind)}
        onExportCalendar={handleExportCalendar}
        onOpenShortcutsHelp={() => setShortcutsModalOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenWorldClock={() => setWorldClockOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Tasks & Scratchpad Side Panel */}
      <TasksSidePanel
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        events={visibleEvents}
        onCreateTask={handleCreateTask}
        onOpenEvent={openEventPopover}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Calendar & Productivity Insights Modal */}
      <CalendarAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        events={visibleEvents}
        currentDate={date}
        onScheduleFocusBlock={handleScheduleFocusBlock}
      />

      {/* 1-Click Event Templates Modal */}
      <QuickTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        selectedDate={date}
        onScheduleTemplate={handleScheduleTemplate}
      />

      {/* World Clock & Timezone Modal */}
      <WorldClockModal
        open={worldClockOpen}
        onClose={() => setWorldClockOpen(false)}
      />

      {/* Comprehensive All Settings & Preferences Modal */}
      <CalendarSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExportCalendar={handleExportCalendar}
        onImportCalendar={handleImportCalendar}
        onReseedCompleted={() => {
          showToast('Calendar reseeded with fresh suite!', 'success');
        }}
      />
    </>
  );
}
