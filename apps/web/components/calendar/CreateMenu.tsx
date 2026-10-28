'use client';

import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  type LucideIcon,
  PlusIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type MenuItem = {
  kind: CreateKind;
  label: string;
  Icon: LucideIcon;
  disabled?: boolean;
  disabledHint?: string;
};

const ITEMS: MenuItem[] = [
  { kind: 'event', label: 'Event', Icon: CalendarIcon },
  { kind: 'task', label: 'Task', Icon: CheckCircleIcon },
  {
    kind: 'appointment',
    label: 'Appointment schedule',
    Icon: ClockIcon,
    disabled: true,
    disabledHint: 'soon',
  },
];

type Props = {
  onSelect: (kind: CreateKind) => void;
  /** Circular FAB without label (for collapsed sidebar or mobile floating button) */
  collapsed?: boolean;
};

/**
 * Google-Calendar style "Create" button with a dropdown.
 * - Closes on outside click + Escape
 * - Defers document listener attach so the opening click isn't immediately caught
 * - Disabled items remain visible to signal upcoming features
 */
export function CreateMenu({ onSelect, collapsed = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {collapsed ? (
        <button
          type="button"
          aria-label="Create"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition-shadow hover:shadow-lg dark:bg-gray-800"
        >
          <PlusIcon size={22} />
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[var(--gcal-text,#3c4043)] shadow-md transition-shadow hover:shadow-lg dark:bg-gray-800 dark:text-gray-200"
        >
          <PlusIcon size={20} className="text-gray-600 dark:text-gray-400" />
          <span className="flex-1 text-left">Create</span>
          <ChevronDownIcon size={16} className="text-gray-500" />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-[var(--gcal-border,#dadce0)] bg-white py-1 shadow-xl sm:w-56 dark:border-gray-700 dark:bg-gray-800"
          style={{ left: 0 }}
        >
          {ITEMS.map(({ kind, label, Icon, disabled, disabledHint }) => (
            <button
              key={kind}
              role="menuitem"
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setOpen(false);
                onSelect(kind);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--gcal-text,#3c4043)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Icon size={18} className="text-gray-500" />
              <span className="flex-1">{label}</span>
              {disabled && disabledHint && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {disabledHint}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
