'use client';

import {
  CalendarDaysIcon,
  CalendarIcon,
  CheckSquareIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  HelpCircleIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  SparklesIcon,
  SunIcon,
  UserCheckIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/lib/theme/useTheme';
import { AUTH_URL } from '@/lib/api/client';

type Props = {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onOpenEvent: (id: string, rect: DOMRect) => void;
  onChangeView: (v: CalendarView) => void;
  onChangeDate: (d: Date) => void;
  onCreateEvent: (kind?: CreateKind) => void;
  onExportCalendar?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenAnalytics?: () => void;
  onOpenTemplates?: () => void;
  onOpenWorldClock?: () => void;
  onOpenSettings?: () => void;
};

export function CommandPalette({
  open,
  onClose,
  events,
  onOpenEvent,
  onChangeView,
  onChangeDate,
  onCreateEvent,
  onExportCalendar,
  onOpenShortcutsHelp,
  onOpenAnalytics,
  onOpenTemplates,
  onOpenWorldClock,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  // Focus input on open
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Actions list
  const actions = useMemo(() => {
    return [
      {
        id: 'action-today',
        title: 'Jump to Today',
        subtitle: 'Reset view to current date',
        icon: ClockIcon,
        category: 'Navigation',
        shortcut: 'T',
        run: () => {
          onChangeDate(new Date());
          onClose();
        },
      },
      {
        id: 'action-create-event',
        title: 'Create New Event',
        subtitle: 'Schedule a meeting or appointment',
        icon: PlusIcon,
        category: 'Actions',
        shortcut: 'C',
        run: () => {
          onCreateEvent('event');
          onClose();
        },
      },
      {
        id: 'action-create-task',
        title: 'Create New Task',
        subtitle: 'Add a to-do with due date',
        icon: CheckSquareIcon,
        category: 'Actions',
        run: () => {
          onCreateEvent('task');
          onClose();
        },
      },
      {
        id: 'view-day',
        title: 'Switch to Day View',
        subtitle: 'Focus on hour-by-hour single day view',
        icon: CalendarIcon,
        category: 'Views',
        shortcut: 'D',
        run: () => {
          onChangeView('day');
          onClose();
        },
      },
      {
        id: 'view-week',
        title: 'Switch to Week View',
        subtitle: 'Standard 7-day schedule grid',
        icon: CalendarDaysIcon,
        category: 'Views',
        shortcut: 'W',
        run: () => {
          onChangeView('week');
          onClose();
        },
      },
      {
        id: 'view-month',
        title: 'Switch to Month View',
        subtitle: 'Overview of entire month',
        icon: CalendarDaysIcon,
        category: 'Views',
        shortcut: 'M',
        run: () => {
          onChangeView('month');
          onClose();
        },
      },
      {
        id: 'view-schedule',
        title: 'Switch to Schedule (Agenda) View',
        subtitle: 'Chronological list of all upcoming items',
        icon: ClockIcon,
        category: 'Views',
        shortcut: 'A',
        run: () => {
          onChangeView('schedule');
          onClose();
        },
      },
      {
        id: 'view-year',
        title: 'Switch to Year View',
        subtitle: '12-month bird’s-eye perspective',
        icon: CalendarIcon,
        category: 'Views',
        shortcut: 'Y',
        run: () => {
          onChangeView('year');
          onClose();
        },
      },
      {
        id: 'theme-toggle',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle interface theme appearance',
        icon: theme === 'dark' ? SunIcon : MoonIcon,
        category: 'Settings',
        run: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          onClose();
        },
      },
      {
        id: 'action-analytics',
        title: 'Productivity & Schedule Insights',
        subtitle: 'View weekly workload, meeting load, and focus block balance',
        icon: SparklesIcon,
        category: 'Insights',
        shortcut: 'I',
        run: () => {
          onClose();
          onOpenAnalytics?.();
        },
      },
      {
        id: 'action-templates',
        title: 'Quick Event Templates',
        subtitle: '1-click scheduling for 1:1s, focus blocks, sprint syncs',
        icon: ZapIcon,
        category: 'Actions',
        run: () => {
          onClose();
          onOpenTemplates?.();
        },
      },
      {
        id: 'action-world-clock',
        title: 'World Clock & Time Zones',
        subtitle: 'View international teammate availability and current times',
        icon: GlobeIcon,
        category: 'Tools',
        run: () => {
          onClose();
          onOpenWorldClock?.();
        },
      },
      {
        id: 'action-settings',
        title: 'Settings & Preferences',
        subtitle: 'Customize duration, appearance, sound chimes, and reseed demo data',
        icon: SlidersIcon,
        category: 'Settings',
        shortcut: '⌘,',
        run: () => {
          onClose();
          onOpenSettings?.();
        },
      },
      {
        id: 'export-calendar',
        title: 'Export Calendar to iCal (.ics)',
        subtitle: 'Download your calendar feed file',
        icon: DownloadIcon,
        category: 'Data',
        run: () => {
          onExportCalendar?.();
          onClose();
        },
      },
      {
        id: 'shortcuts-help',
        title: 'Keyboard Shortcuts Cheat Sheet',
        subtitle: 'View all quick keys and combinations',
        icon: HelpCircleIcon,
        category: 'Help',
        shortcut: '?',
        run: () => {
          onClose();
          onOpenShortcutsHelp?.();
        },
      },
      // Personas
      {
        id: 'persona-alex',
        title: 'Switch Persona: Alex Morgan',
        subtitle: 'Lead Product Manager account',
        icon: UserCheckIcon,
        category: 'Accounts',
        run: () => {
          window.location.href = `${AUTH_URL}/v1/auth/demo?persona=alex`;
        },
      },
      {
        id: 'persona-sarah',
        title: 'Switch Persona: Sarah Chen',
        subtitle: 'Principal Architect account',
        icon: UserCheckIcon,
        category: 'Accounts',
        run: () => {
          window.location.href = `${AUTH_URL}/v1/auth/demo?persona=sarah`;
        },
      },
      {
        id: 'persona-marcus',
        title: 'Switch Persona: Marcus Vance',
        subtitle: 'Founder & CEO account',
        icon: UserCheckIcon,
        category: 'Accounts',
        run: () => {
          window.location.href = `${AUTH_URL}/v1/auth/demo?persona=marcus`;
        },
      },
    ];
  }, [
    onChangeDate,
    onClose,
    onCreateEvent,
    onChangeView,
    theme,
    setTheme,
    onExportCalendar,
    onOpenShortcutsHelp,
    onOpenAnalytics,
    onOpenTemplates,
    onOpenWorldClock,
    onOpenSettings,
  ]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return actions;
    }

    // Match actions
    const matchedActions = actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );

    // Match events
    const matchedEvents = events
      .filter((ev) => {
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.description?.toLowerCase().includes(q) ||
          ev.location?.toLowerCase().includes(q)
        );
      })
      .slice(0, 8)
      .map((ev) => ({
        id: `event-${ev.id}`,
        title: ev.title,
        subtitle: `${ev.allDay ? 'All day' : new Date(ev.start).toLocaleDateString()} · ${ev.location || 'Calendar event'}`,
        icon: CalendarIcon,
        category: 'Events',
        color: ev.color,
        run: (targetRect?: DOMRect) => {
          onClose();
          const rect = targetRect || (document.body.getBoundingClientRect() as DOMRect);
          onOpenEvent(ev.id, rect);
        },
      }));

    return [...matchedEvents, ...matchedActions];
  }, [query, actions, events, onClose, onOpenEvent]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          selected.run();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filteredItems, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-xs sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-800 dark:bg-gray-900">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <SearchIcon size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search events, or jump to view..."
            className="w-full bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XIcon size={16} />
            </button>
          )}
          <kbd className="hidden rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-400 sm:inline-block dark:border-gray-700 dark:bg-gray-800">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No matching commands or events found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                const color = 'color' in item && item.color ? (item.color as string) : undefined;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => item.run(e.currentTarget.getBoundingClientRect())}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={[
                      'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        style={color ? { backgroundColor: `${color}20`, color } : undefined}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {item.category}
                      </span>
                      {'shortcut' in item && item.shortcut && (
                        <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer tips */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="hidden sm:inline">Tip: Press ? for shortcuts</span>
        </div>
      </div>
    </div>
  );
}
