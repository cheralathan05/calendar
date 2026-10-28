import { computeDueReminders } from './due-reminders';

describe('computeDueReminders', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  const startAt = new Date('2026-07-19T12:30:00.000Z'); // 30 min from now
  const endAt = new Date('2026-07-19T13:00:00.000Z'); // 60 min from now

  it('returns [] when notifications is null', () => {
    expect(
      computeDueReminders({ startAt, endAt, notifications: null }, now),
    ).toEqual([]);
  });

  it('returns [] when notifications is not an array', () => {
    expect(
      computeDueReminders(
        { startAt, endAt, notifications: { bogus: true } },
        now,
      ),
    ).toEqual([]);
  });

  it('ignores method !== "email"', () => {
    const notifications = [
      { id: 'n1', method: 'notification', amount: 30, unit: 'minutes' },
    ];
    expect(computeDueReminders({ startAt, endAt, notifications }, now)).toEqual(
      [],
    );
  });

  it('returns an email reminder exactly due now (anchor defaults to start)', () => {
    const notifications = [
      { id: 'n1', method: 'email', amount: 30, unit: 'minutes' },
    ];
    expect(computeDueReminders({ startAt, endAt, notifications }, now)).toEqual(
      notifications,
    );
  });

  it('excludes a reminder that is not due yet', () => {
    const notifications = [
      { id: 'n2', method: 'email', amount: 10, unit: 'minutes' },
    ];
    expect(computeDueReminders({ startAt, endAt, notifications }, now)).toEqual(
      [],
    );
  });

  it('uses endAt when anchor is "end"', () => {
    const notifications = [
      { id: 'n3', method: 'email', amount: 60, unit: 'minutes', anchor: 'end' },
    ];
    expect(computeDueReminders({ startAt, endAt, notifications }, now)).toEqual(
      notifications,
    );
  });

  it('skips malformed items but keeps valid ones in the same array', () => {
    const notifications = [
      { id: 'bad', method: 'email' }, // missing amount/unit
      { id: 'n4', method: 'email', amount: 45, unit: 'minutes' },
    ];
    expect(computeDueReminders({ startAt, endAt, notifications }, now)).toEqual(
      [{ id: 'n4', method: 'email', amount: 45, unit: 'minutes' }],
    );
  });
});
