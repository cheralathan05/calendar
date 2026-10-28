'use client';

import { CheckIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ApiCalendar } from '@/lib/calendars/useCalendarsApi';
import { CALENDAR_COLORS, getCalendarColor } from '@/lib/calendars/useCalendarsApi';
import { DatePickerCore } from '@/components/calendar/DatePickerCore';
import { CreateMenu } from '@/components/calendar/CreateMenu';

// ---------------------------------------------------------------------------
// CalendarContextMenu — "…" menu per calendar
// ---------------------------------------------------------------------------
function CalendarContextMenu(props: {
  calendar: ApiCalendar;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { calendar, onRename, onDelete } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Options for ${calendar.name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--gcal-bg-hover,#f1f3f4)] focus-visible:opacity-100 dark:hover:bg-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontalIcon size={14} />
      </button>

      {open && (
        <div className="absolute top-6 right-0 z-50 w-[calc(100vw-2rem)] max-w-xs rounded-xl border border-gray-200 bg-white py-1 shadow-xl sm:w-40 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            <PencilIcon size={14} />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2Icon size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RenameCalendarModal
// ---------------------------------------------------------------------------
function RenameCalendarModal(props: {
  calendar: ApiCalendar;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const { calendar, onSave, onClose } = props;
  const [name, setName] = useState(calendar.name);
  const [color, setColor] = useState(calendar.color ?? '#039BE5');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-800">
        <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
          Edit calendar
        </h2>
        <input
          autoFocus
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B57D0] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Calendar name"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {CALENDAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              className="h-6 w-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            className="rounded-full bg-[#0B57D0] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#044dc2] disabled:opacity-50"
            onClick={() => onSave(name.trim(), color)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewCalendarModal
// ---------------------------------------------------------------------------
function NewCalendarModal(props: {
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const { onSave, onClose } = props;
  const [name, setName] = useState('');
  const [color, setColor] = useState('#039BE5');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-800">
        <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
          New calendar
        </h2>
        <input
          autoFocus
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B57D0] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onSave(name.trim(), color);
          }}
          placeholder="Calendar name"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {CALENDAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              className="h-6 w-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            className="rounded-full bg-[#0B57D0] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#044dc2] disabled:opacity-50"
            onClick={() => onSave(name.trim(), color)}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
export function Sidebar(props: {
  currentDate: Date;
  selectedDate: Date;
  calendars: ApiCalendar[];
  visibleCalendarIds: Set<string>;
  onToggleCalendar: (id: string) => void;
  onCreateCalendar: (name: string, color?: string) => Promise<void>;
  onUpdateCalendar: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  onDeleteCalendar: (id: string) => Promise<void>;
  onPickDate: (d: Date) => void;
  onCreate?: (kind: CreateKind) => void;
}) {
  const {
    selectedDate,
    calendars,
    visibleCalendarIds,
    onToggleCalendar,
    onCreateCalendar,
    onUpdateCalendar,
    onDeleteCalendar,
    onPickDate,
    onCreate,
  } = props;

  const [newCalOpen, setNewCalOpen] = useState(false);
  const [renamingCal, setRenamingCal] = useState<ApiCalendar | null>(null);

  const handleDelete = async (cal: ApiCalendar) => {
    if (confirm(`Delete calendar "${cal.name}" and all its events? This cannot be undone.`)) {
      await onDeleteCalendar(cal.id);
    }
  };

  return (
    <>
      <aside className="flex h-full w-full flex-col gap-3 overflow-y-auto bg-[#F8FAFD] py-2 sm:gap-4 dark:bg-gray-900">
        {/* Create button */}
        <div className="px-2 sm:px-3">
          <CreateMenu onSelect={(kind) => onCreate?.(kind)} />
        </div>

        {/* Mini calendar */}
        <div className="px-1 py-1 sm:px-2 sm:py-2">
          <DatePickerCore selected={selectedDate} onSelect={onPickDate} density="sidebar" />
        </div>

        {/* My Calendars */}
        <div className="px-2 sm:px-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-[var(--gcal-text-muted,#70757a)] uppercase dark:text-gray-400">
              My Calendars
            </p>
            <button
              type="button"
              aria-label="Add calendar"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--gcal-text-muted,#70757a)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-400 dark:hover:bg-gray-700"
              onClick={() => setNewCalOpen(true)}
            >
              <PlusIcon size={14} />
            </button>
          </div>

          {calendars.length === 0 && (
            <p className="text-xs text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400">
              No calendars yet
            </p>
          )}

          <ul className="space-y-0.5">
            {calendars.map((cal, idx) => {
              const color = getCalendarColor(cal, idx);
              const isVisible = visibleCalendarIds.has(cal.id);

              return (
                <li key={cal.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={() => onToggleCalendar(cal.id)}
                    aria-pressed={isVisible}
                    aria-label={`${isVisible ? 'Hide' : 'Show'} ${cal.name}`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                      style={{
                        backgroundColor: isVisible ? color : 'transparent',
                        border: `2px solid ${color}`,
                      }}
                    >
                      {isVisible && <CheckIcon size={10} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{cal.name}</span>
                  </button>

                  <CalendarContextMenu
                    calendar={cal}
                    onRename={() => setRenamingCal(cal)}
                    onDelete={() => void handleDelete(cal)}
                  />
                </li>
              );
            })}
          </ul>

          {/* Add new calendar row */}
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setNewCalOpen(true)}
          >
            <PlusIcon size={14} />
            <span>Add calendar</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      {newCalOpen && (
        <NewCalendarModal
          onClose={() => setNewCalOpen(false)}
          onSave={async (name, color) => {
            await onCreateCalendar(name, color);
            setNewCalOpen(false);
          }}
        />
      )}

      {renamingCal && (
        <RenameCalendarModal
          calendar={renamingCal}
          onClose={() => setRenamingCal(null)}
          onSave={async (name, color) => {
            await onUpdateCalendar(renamingCal.id, { name, color });
            setRenamingCal(null);
          }}
        />
      )}
    </>
  );
}
