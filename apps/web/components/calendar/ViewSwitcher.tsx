'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { viewOptions } from '@/constants';

type Props = {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
};

const KEY_TO_VIEW: Record<string, CalendarView> = {
  d: 'day',
  w: 'week',
  m: 'month',
  y: 'year',
  a: 'schedule',
  s: 'schedule',
};

/**
 * Google-Calendar style view picker as a dropdown.
 * Shows the currently selected view as the button label.
 *
 * Keyboard shortcuts (when menu is OPEN):
 *   d → Day, w → Week, m → Month, y → Year, a/s → Schedule
 *
 * Closes on outside click + Escape, deferred listener attach so the
 * opening click doesn't immediately close the menu.
 */
export function ViewSwitcher({ view, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeLabel = viewOptions.find((o) => o.value === view)?.label ?? 'Week';

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      const v = KEY_TO_VIEW[e.key.toLowerCase()];
      if (v) {
        onChange(v);
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onChange]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`View: ${activeLabel}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--gcal-border,#dadce0)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gcal-text,#3c4043)] shadow-xs transition-colors hover:bg-[var(--gcal-bg-hover,#f1f3f4)] sm:text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span>{activeLabel}</span>
        <ChevronDownIcon size={15} className="text-gray-500 dark:text-gray-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white py-1.5 shadow-2xl backdrop-blur-md dark:border-gray-700 dark:bg-gray-800"
        >
          {viewOptions.map((option) => {
            const active = view === option.value;
            const shortcutKey = option.value === 'schedule' ? 'A' : option.value.charAt(0).toUpperCase();
            return (
              <button
                key={option.value}
                role="menuitemradio"
                aria-checked={active}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(option.value as CalendarView);
                }}
                className={[
                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-blue-50 font-semibold text-[#0B57D0] dark:bg-blue-950/60 dark:text-blue-400'
                    : 'text-[var(--gcal-text,#3c4043)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-200 dark:hover:bg-gray-700/60',
                ].join(' ')}
              >
                <span>{option.label}</span>
                <kbd className="rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  {shortcutKey}
                </kbd>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
