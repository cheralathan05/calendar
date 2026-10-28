'use client';

import { useCallback } from 'react';

export default function NotificationsEditor(props: {
  value?: NotificationItem[];
  onChange: (next: NotificationItem[]) => void;
}) {
  const { value = [], onChange } = props;

  const addDefault = useCallback(() => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Date.now());
    onChange([
      ...value,
      { id, method: 'notification', amount: 30, unit: 'minutes', anchor: 'start' },
    ]);
  }, [value, onChange]);

  const update = useCallback(
    (id: string, patch: Partial<NotificationItem>) => {
      onChange(value.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    },
    [value, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      onChange(value.filter((n) => n.id !== id));
    },
    [value, onChange],
  );

  return (
    <div>
      {value.map((n) => (
        <div key={n.id} className="mb-2 flex items-center gap-2">
          <select
            value={n.method}
            onChange={(e) => update(n.id, { method: e.target.value as NotificationItem['method'] })}
            className="rounded-md bg-gray-100 p-2 text-sm"
          >
            <option value="notification">Notification</option>
            <option value="email">Email</option>
          </select>

          <input
            type="number"
            min={1}
            value={n.amount}
            onChange={(e) => update(n.id, { amount: Number(e.target.value) })}
            className="w-16 rounded border px-2 py-1 text-sm"
          />

          <select
            value={n.unit}
            onChange={(e) => update(n.id, { unit: e.target.value as NotificationItem['unit'] })}
            className="rounded-md bg-gray-100 p-2 text-sm"
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>

          <select
            value={n.anchor ?? 'start'}
            onChange={(e) => update(n.id, { anchor: e.target.value as NotificationItem['anchor'] })}
            className="rounded-md bg-gray-100 p-2 text-sm"
            title="Anchor"
          >
            <option value="start">before start</option>
            <option value="end">before end</option>
          </select>

          <button
            onClick={() => remove(n.id)}
            className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Remove notification"
          >
            ✕
          </button>

          <div className="text-xs text-gray-500">{n.method === 'email' ? 'email' : 'popup'}</div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDefault}
        className="mt-1 rounded text-sm text-[#0B57D0] hover:underline"
      >
        Add notification
      </button>
    </div>
  );
}
