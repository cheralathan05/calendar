export type NotificationItem = {
  id: string;
  method: string;
  amount: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  anchor?: 'start' | 'end';
};

export type DueReminderEvent = {
  startAt: Date;
  endAt: Date;
  notifications: unknown;
};

const UNIT_MS: Record<NotificationItem['unit'], number> = {
  minutes: 60_000,
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
  weeks: 7 * 24 * 60 * 60_000,
};

function isNotificationItem(value: unknown): value is NotificationItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.method === 'string' &&
    typeof v.amount === 'number' &&
    typeof v.unit === 'string' &&
    v.unit in UNIT_MS
  );
}

/** Pure: given an event and "now", returns the due, method:'email' reminders. */
export function computeDueReminders(
  event: DueReminderEvent,
  now: Date,
): NotificationItem[] {
  if (!Array.isArray(event.notifications)) return [];

  const due: NotificationItem[] = [];
  for (const raw of event.notifications) {
    if (!isNotificationItem(raw) || raw.method !== 'email') continue;

    const anchorTime = raw.anchor === 'end' ? event.endAt : event.startAt;
    const dueAt = new Date(
      anchorTime.getTime() - raw.amount * UNIT_MS[raw.unit],
    );
    if (dueAt.getTime() <= now.getTime()) {
      due.push(raw);
    }
  }
  return due;
}
