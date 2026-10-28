'use client';

import { addDays, format, startOfWeek } from 'date-fns';
import { ViewSwitcher } from './ViewSwitcher';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
  ZapIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UserMenu } from '@/components/auth/UserMenu';
import { SettingsMenu } from '@/components/ui/SettingsMenu';
import { apiFetch } from '@/lib/api/client';
import { type ApiEvent, apiEventToCalendarEvent } from '@/lib/api/events';
import { DatePickerPopover } from '@/components/calendar/DatePickerPopover';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SearchBar(props: { onOpenEvent: (id: string, rect: DOMRect) => void }) {
  const { onOpenEvent } = props;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching is a legitimate external-system sync; loading flag must reflect the in-flight request
    setLoading(true);
    const qs = new URLSearchParams({ q: debouncedQuery });
    apiFetch<ApiEvent[]>(`/v1/events/search?${qs.toString()}`)
      .then((data) => {
        setResults(data.map((d) => apiEventToCalendarEvent(d)));
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
        <SearchIcon size={15} className="shrink-0 text-gray-500" />
        <input
          type="search"
          aria-label="Search events"
          placeholder="Search events"
          value={query}
          className="w-48 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none dark:text-gray-200"
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!v.trim()) {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
          />
        )}
      </div>

      {open && (
        <div className="absolute top-10 left-0 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white py-2 shadow-xl sm:w-80 dark:border-gray-700 dark:bg-gray-800">
          {loading && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
          )}
          {!loading &&
            results.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-[var(--gcal-text-muted,#70757a)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={(e) => {
                  onOpenEvent(ev.id, e.currentTarget.getBoundingClientRect());
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--gcal-text-muted,#70757a)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-300 dark:hover:bg-gray-700">
                    {ev.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(ev.start), 'MMM d, yyyy · HH:mm')}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function CalendarHeader(props: {
  view: CalendarView;
  date: Date;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChangeView: (v: CalendarView) => void;
  onChangeDate?: (d: Date) => void;
  onCreate: (kind?: CreateKind) => void;
  onExportCalendar?: () => void;
  onImportCalendar?: (file: File) => void;
  onToggleSidebar?: () => void;
  onOpenEvent?: (id: string, rect: DOMRect) => void;
  sidebarOpen?: boolean;
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
    onToday,
    onPrev,
    onNext,
    onChangeView,
    onChangeDate,
    onExportCalendar,
    onImportCalendar,
    onToggleSidebar,
    onOpenEvent,
    sidebarOpen = true,
    onToggleTasks,
    tasksOpen = false,
    pendingTasksCount = 0,
    onOpenCommandPalette,
    onOpenShortcutsHelp,
    onOpenAnalytics,
    onOpenTemplates,
    onOpenWorldClock,
    onOpenSettings,
  } = props;
  const titleIsPicker = !sidebarOpen;
  const title = (() => {
    if (view === 'year') return format(date, 'yyyy');
    if (view === 'month') return format(date, 'MMMM yyyy');
    if (view === 'day') return format(date, 'MMMM d, yyyy');
    if (view === 'schedule') return `Schedule · ${format(date, 'MMM yyyy')}`;

    // Week view — show "May 2026" if all days are in the same month;
    // otherwise "Apr – May 2026" (Google parity for spanning weeks).
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    if (sameMonth) return format(date, 'MMMM yyyy');
    return `${format(weekStart, 'MMM')} – ${format(weekEnd, 'MMM yyyy')}`;
  })();

  // --- date picker popover state ---
  const titleBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);

  const openPicker = () => {
    if (titleBtnRef.current) {
      setPickerRect(titleBtnRef.current.getBoundingClientRect());
      setPickerOpen(true);
    }
  };

  // Live clock display for world clock button
  const [liveClockStr, setLiveClockStr] = useState<string>('');
  useEffect(() => {
    const update = () => {
      setLiveClockStr(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(
          new Date(),
        ),
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // Keep the popover anchored when the window resizes
  useEffect(() => {
    if (!pickerOpen) return;
    const onResize = () => {
      if (titleBtnRef.current) setPickerRect(titleBtnRef.current.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pickerOpen]);

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-gray-200/80 bg-white/80 px-3 py-2 text-xs backdrop-blur-md sm:px-5 sm:py-3 md:text-base dark:border-gray-800 dark:bg-gray-900/80">
        {/* Left: Hamburger + logo + Today + prev/next + title */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 sm:h-9 sm:w-9 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Main menu"
          >
            <MenuIcon size={19} />
          </button>

          {/* App logo */}
          <div className="mr-1 hidden h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B57D0] to-[#039BE5] shadow-xs sm:flex">
            <span className="font-bold text-white text-sm">{format(new Date(), 'd')}</span>
          </div>

          <span className="hidden font-bold tracking-tight text-gray-900 sm:inline text-lg dark:text-white">
            Calendar
          </span>

          <button
            type="button"
            className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-98 sm:px-3.5 sm:py-1.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={onToday}
          >
            Today
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded-full p-1 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={onPrev}
              aria-label="Previous"
              title="Previous period (P / K)"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              className="rounded-full p-1 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={onNext}
              aria-label="Next"
              title="Next period (N / J)"
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>

          {titleIsPicker ? (
            <button
              ref={titleBtnRef}
              type="button"
              onClick={openPicker}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              className="group flex items-center gap-1.5 rounded-full px-2 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="truncate text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                {title}
              </span>
              <ChevronDownIcon
                size={16}
                className="text-gray-500 transition-transform group-aria-expanded:rotate-180"
              />
            </button>
          ) : (
            <span className="truncate px-2 py-1 text-base font-bold text-gray-900 sm:text-lg dark:text-white">
              {title}
            </span>
          )}
        </div>

        {/* Right: Actions + World Clock + Templates + Insights + ViewSwitcher + Tasks Panel + Help + Settings + UserMenu */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* World Clock Pill */}
          {onOpenWorldClock && liveClockStr && (
            <button
              type="button"
              onClick={onOpenWorldClock}
              className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="World Clock & Global Time Zones"
            >
              <GlobeIcon size={13} className="text-gray-500" />
              <span className="font-mono text-[11px]">{liveClockStr}</span>
            </button>
          )}

          {/* Quick Event Templates Button */}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="hidden md:flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100/70 active:scale-98 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
              title="Quick Event Templates (1-Click Presets)"
            >
              <ZapIcon size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Templates</span>
            </button>
          )}

          {/* Productivity & Schedule Insights Button */}
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/60 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100/70 active:scale-98 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
              title="Calendar & Productivity Insights"
            >
              <SparklesIcon size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Insights</span>
            </button>
          )}

          {/* Quick Command Palette Button */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden lg:flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs text-gray-500 transition hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Command Palette (Cmd+K)"
            >
              <SearchIcon size={14} />
              <span>Commands</span>
              <kbd className="rounded bg-gray-200/60 px-1 py-0.5 font-mono text-[10px] dark:bg-gray-700">
                ⌘K
              </kbd>
            </button>
          )}

          {onOpenEvent && <SearchBar onOpenEvent={onOpenEvent} />}

          <ViewSwitcher view={view} onChange={onChangeView} />

          {/* Tasks & Quick Notes Side Panel Toggle */}
          {onToggleTasks && (
            <button
              type="button"
              onClick={onToggleTasks}
              className={[
                'relative flex h-8 w-8 items-center justify-center rounded-full border transition sm:h-9 sm:w-9',
                tasksOpen
                  ? 'border-blue-500 bg-blue-50 text-[#0B57D0] dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              ].join(' ')}
              title="Tasks & Notes (Side panel)"
              aria-label="Tasks and Notes side panel"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                <path d="M7 7h.01" />
              </svg>
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0B57D0] px-1 text-[9px] font-bold text-white shadow-xs">
                  {pendingTasksCount > 9 ? '9+' : pendingTasksCount}
                </span>
              )}
            </button>
          )}

          {/* Keyboard Shortcuts Help Button */}
          {onOpenShortcutsHelp && (
            <button
              type="button"
              onClick={onOpenShortcutsHelp}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 sm:h-9 sm:w-9 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <span className="font-bold text-xs">?</span>
            </button>
          )}

          <SettingsMenu
            onExportCalendar={onExportCalendar}
            onImportCalendar={onImportCalendar}
            onOpenSettings={onOpenSettings}
          />

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <UserMenu />
        </div>
      </header>

      {titleIsPicker && (
        <DatePickerPopover
          open={pickerOpen}
          anchorRect={pickerRect}
          selected={date}
          onSelect={(d) => onChangeDate?.(d)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
