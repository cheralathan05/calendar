'use client';

import { addDays, addMinutes } from 'date-fns';
import { useMemo, useState } from 'react';
import { toLocalDateTimeInputValue } from '@/lib/date';

function startOfDayLocal(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

type Props = {
  initialDate: Date;
  onClose: () => void;
  onCreate: (event: CalendarEvent) => void;
};

export function TaskForm({ initialDate, onClose, onCreate }: Props) {
  const initialStart = useMemo(() => new Date(initialDate), [initialDate]);
  const initialEnd = useMemo(() => addMinutes(new Date(initialDate), 60), [initialDate]);
  const defaultStart = useMemo(() => startOfDayLocal(initialStart), [initialStart]);
  const defaultEnd = useMemo(() => addDays(startOfDayLocal(initialEnd), 1), [initialEnd]);

  const [title, setTitle] = useState('');
  const [dueStart, setDueStart] = useState(toLocalDateTimeInputValue(defaultStart));
  const [dueEnd, setDueEnd] = useState(toLocalDateTimeInputValue(defaultEnd));
  const [allDay, setAllDay] = useState(true);
  const [showTime, setShowTime] = useState(false);

  function submit() {
    let startDate: Date;
    let endDate: Date;
    if (allDay) {
      startDate = startOfDayLocal(new Date(dueStart));
      endDate = addDays(startOfDayLocal(new Date(dueEnd)), 1);
    } else {
      startDate = new Date(dueStart);
      endDate = new Date(dueEnd);
    }

    onCreate({
      id: crypto.randomUUID(),
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay,
      isTask: true,
      color: '#0B57D0',
    });
    onClose();
  }

  return (
    <div className="space-y-3 px-4 py-4 dark:text-[var(--gcal-text),e8eaed]">
      <div>
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <div>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            className="w-full rounded border px-3 py-2 text-sm"
            value={allDay ? dueStart.slice(0, 10) : dueStart}
            onChange={(e) => {
              const v = e.target.value;
              setDueStart(allDay ? `${v}T00:00` : v);
            }}
          />
        </div>

        <div>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            className="w-full rounded border px-3 py-2 text-sm"
            value={allDay ? dueEnd.slice(0, 10) : dueEnd}
            onChange={(e) => {
              const v = e.target.value;
              setDueEnd(allDay ? `${v}T00:00` : v);
            }}
          />
        </div>

        <div className="col-span-2 flex justify-end">
          {!showTime ? (
            <button
              type="button"
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-[var(--color-gray-700)]"
              onClick={() => {
                setShowTime(true);
                setAllDay(false);
                setDueStart((prev) => prev.replace('T00:00', 'T09:00'));
                setDueEnd((prev) => prev.replace('T00:00', 'T10:00'));
              }}
            >
              Add time
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-100"
              onClick={() => {
                // revert to all-day
                const s = startOfDayLocal(new Date(dueStart));
                const e = addDays(startOfDayLocal(new Date(dueEnd)), 1);
                setDueStart(toLocalDateTimeInputValue(s));
                setDueEnd(toLocalDateTimeInputValue(e));
                setAllDay(true);
                setShowTime(false);
              }}
            >
              Remove time
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 font-semibold">
        <button
          type="button"
          className="rounded-3xl px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 dark:hover:bg-[var(--color-gray-700)]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-3xl bg-[#0B57D0] px-4 py-2 text-sm text-white hover:bg-[#044dc2]"
          onClick={submit}
        >
          Add
        </button>
      </div>
    </div>
  );
}
