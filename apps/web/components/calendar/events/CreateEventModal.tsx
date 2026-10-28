'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { EventForm } from '@/components/calendar/events/forms/EventForm';
import { TaskForm } from '@/components/calendar/events/forms/TaskForm';
import { AppointmentForm } from '@/components/calendar/events/forms/AppointmentForm';
import { modeOptions } from '@/constants';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import type { ApiCalendar } from '@/lib/calendars/useCalendarsApi';

type Kind = 'event' | 'task' | 'appointment';

type Props = {
  open: boolean;
  initialDate: Date;
  initialKind?: Kind;
  calendars?: ApiCalendar[];
  onClose: () => void;
  onCreate: (event: CalendarEvent) => Promise<boolean> | void | boolean;
};

export function CreateEventModal({
  open,
  initialDate,
  initialKind = 'event',
  calendars,
  onClose,
  onCreate,
}: Props) {
  const [mode, setMode] = useState<Kind>(initialKind);
  const [prevOpen, setPrevOpen] = useState(open);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset tab when reopened (compute during render — no effect needed)
  if (open && !prevOpen) {
    setPrevOpen(true);
    setMode(initialKind);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Focus trap + scroll lock + Esc to close + return focus
  useModalA11y({ open, onClose, containerRef });

  if (!open) return null;

  // Helper to call onCreate and close modal only on success
  const createAndMaybeClose = async (ev: CalendarEvent) => {
    try {
      const res = await onCreate(ev as CalendarEvent);
      // If parent returns a boolean, close only on truthy success
      if (res === undefined || res === null) {
        // Parent didn't return a status — assume it handled closing/toast itself
        return;
      }
      if (typeof res === 'boolean') {
        if (res) onClose();
      }
    } catch {
      // swallow — parent will show toast
      return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex w-full items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
      onClick={(e) => {
        // Click backdrop closes; clicks inside the panel must not bubble here
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-md rounded-lg bg-[var(--gcal-bg-app,#F0F4F9)] shadow-lg dark:bg-gray-800"
      >
        <h2 id="create-event-modal-title" className="sr-only">
          Create {mode}
        </h2>

        {/* Header — tab switcher */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MenuIcon
              size={16}
              className="text-[var(--gcal-text-muted,#70757a)] dark:text-gray-400"
              aria-hidden="true"
            />
            <div
              role="tablist"
              aria-label="Create kind"
              className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700"
            >
              {modeOptions.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    className={[
                      'min-h-[36px] rounded-md px-3 py-1 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white text-[var(--gcal-text,#3c4043)] shadow-sm dark:bg-gray-800 dark:text-gray-100'
                        : 'text-[var(--gcal-text-muted,#70757a)] hover:text-[var(--gcal-text,#3c4043)] dark:text-gray-300 dark:hover:text-gray-100',
                    ].join(' ')}
                    onClick={() => setMode(option.value as Kind)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--gcal-text-muted,#70757a)] hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body — re-mount on (mode, date) so child form state resets cleanly */}
        {mode === 'event' && (
          <EventForm
            key={`event-${initialDate.toISOString()}`}
            initialDate={initialDate}
            calendars={calendars}
            onClose={onClose}
            onCreate={(ev) => {
              void createAndMaybeClose(ev);
            }}
          />
        )}
        {mode === 'task' && (
          <TaskForm
            key={`task-${initialDate.toISOString()}`}
            initialDate={initialDate}
            onClose={onClose}
            onCreate={(ev) => {
              void createAndMaybeClose(ev);
            }}
          />
        )}
        {mode === 'appointment' && (
          <AppointmentForm
            key={`appointment-${initialDate.toISOString()}`}
            initialDate={initialDate}
            onClose={onClose}
            onCreate={(ev) => {
              void createAndMaybeClose(ev);
            }}
          />
        )}
      </div>
    </div>
  );
}
