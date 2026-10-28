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

export function AppointmentForm({ initialDate, onClose, onCreate }: Props) {
  const initialStart = useMemo(() => new Date(initialDate), [initialDate]);
  const initialEnd = useMemo(() => addMinutes(new Date(initialDate), 60), [initialDate]);
  const defaultStart = useMemo(() => startOfDayLocal(initialStart), [initialStart]);
  const defaultEnd = useMemo(() => addDays(startOfDayLocal(initialEnd), 1), [initialEnd]);

  const [title, setTitle] = useState('');
  const [start, setStart] = useState(toLocalDateTimeInputValue(defaultStart));
  const [end, setEnd] = useState(toLocalDateTimeInputValue(defaultEnd));
  const [allDay, setAllDay] = useState(true);
  const [showTime, setShowTime] = useState(false);

  function submit() {
    let startDate: Date;
    let endDate: Date;
    if (allDay) {
      const s = startOfDayLocal(new Date(start));
      startDate = s;
      endDate = addDays(s, 1); // exclusive end at next midnight
    } else {
      startDate = new Date(start);
      endDate = new Date(end);
    }

    onCreate({
      id: crypto.randomUUID(),
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay,
      isAppointment: true,
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
          placeholder="Add schedule"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <div>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            className="w-full rounded border px-3 py-2 text-sm"
            value={allDay ? start.slice(0, 10) : start}
            onChange={(e) => {
              const v = e.target.value;
              setStart(allDay ? `${v}T00:00` : v);
            }}
          />
        </div>

        <div>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            className="w-full rounded border px-3 py-2 text-sm"
            value={allDay ? end.slice(0, 10) : end}
            onChange={(e) => {
              const v = e.target.value;
              setEnd(allDay ? `${v}T00:00` : v);
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
                setStart((prev) => prev.replace('T00:00', 'T09:00'));
                setEnd((prev) => prev.replace('T00:00', 'T10:00'));
              }}
            >
              Add time
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-[var(--color-gray-700)]"
              onClick={() => {
                // revert to all-day
                const s = startOfDayLocal(new Date(start));
                const e = addDays(startOfDayLocal(new Date(end)), 1);
                setStart(toLocalDateTimeInputValue(s));
                setEnd(toLocalDateTimeInputValue(e));
                setAllDay(true);
                setShowTime(false);
              }}
            >
              Remove time
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border bg-white p-2 text-sm dark:bg-[var(--color-gray-700)]">
        <p className="p-2">
          Create a booking page you can share with others so they can book time with you themselves
        </p>
        <a
          href="https://support.google.com/calendar/answer/10729749?visit_id=639030207850184184-1249932339&p=appointment_schedule&rd=1"
          className="w-fit rounded-full p-2 font-semibold text-blue-700 hover:bg-blue-100"
        >
          Learn More
        </a>
      </div>
      <div className="flex items-center justify-end gap-2 px-4 py-3 font-semibold">
        <button
          type="button"
          className="rounded-3xl px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
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
