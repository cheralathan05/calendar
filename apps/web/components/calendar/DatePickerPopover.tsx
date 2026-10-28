'use client';

import { useEffect, useRef } from 'react';
import { DatePickerCore } from './DatePickerCore';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  selected: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
};

const POPOVER_WIDTH = 280;

/**
 * Floating date picker anchored to a DOMRect (typically the header title button).
 * Closes on outside click or Escape.
 */
export function DatePickerPopover({ open, anchorRect, selected, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Defer attach so the click that *opened* the popover doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    document.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  // Position 8px below the anchor, clamped inside the viewport (8px gutter on either side).
  const top = anchorRect.bottom + 8;
  const left = Math.min(
    Math.max(8, anchorRect.left),
    typeof window !== 'undefined' ? window.innerWidth - POPOVER_WIDTH - 8 : anchorRect.left,
  );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick a date"
      className="fixed z-50 rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white p-3 shadow-xl dark:bg-gray-800"
      style={{ top, left, width: POPOVER_WIDTH }}
    >
      <DatePickerCore
        selected={selected}
        onSelect={(d) => {
          onSelect(d);
          onClose();
        }}
        density="popover"
      />
    </div>
  );
}
