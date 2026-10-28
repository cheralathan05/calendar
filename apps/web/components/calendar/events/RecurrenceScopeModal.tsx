'use client';

import { useEffect, useRef, useState } from 'react';
import type { RecurrenceScope } from '@/lib/api/events';

export function RecurrenceScopeModal(props: {
  open: boolean;
  title: string; // e.g. "Delete recurring event"
  defaultScope?: RecurrenceScope;
  onCancel: () => void;
  onConfirm: (scope: RecurrenceScope) => void;
}) {
  const { open, title, defaultScope = 'this', onCancel, onConfirm } = props;
  const [scope, setScope] = useState<RecurrenceScope>(defaultScope);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = dialogRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onCancel();
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div ref={dialogRef} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-2xl font-semibold text-gray-900">{title}</div>

        <div className="mt-6 space-y-4 text-gray-800">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="rec-scope"
              checked={scope === 'this'}
              onChange={() => setScope('this')}
            />
            <span>This event</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="rec-scope"
              checked={scope === 'following'}
              onChange={() => setScope('following')}
            />
            <span>This and following events</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="rec-scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            <span>All events</span>
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => onConfirm(scope)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
