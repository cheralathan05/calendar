import { describe, expect, it } from 'vitest';

import { layoutOverlappingEvents } from './overlap-layout';

/**
 * Helper to build a CalendarEvent shape. We only set what the layout
 * algorithm consumes (start, end, id, allDay) — other fields stay default.
 */
function makeEvent(id: string, startISO: string, endISO: string): CalendarEvent {
  return {
    id,
    title: id,
    start: startISO,
    end: endISO,
    allDay: false,
    color: '#039BE5',
  };
}

const DAY = new Date('2026-05-15T00:00:00');

describe('layoutOverlappingEvents', () => {
  it('returns empty array when no events', () => {
    expect(layoutOverlappingEvents([], DAY)).toEqual([]);
  });

  it('assigns col=0/colCount=1 to a single non-overlapping event', () => {
    const events = [makeEvent('a', '2026-05-15T09:00:00', '2026-05-15T10:00:00')];
    const result = layoutOverlappingEvents(events, DAY);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ col: 0, colCount: 1 });
  });

  it('places two non-overlapping events in the same column', () => {
    const events = [
      makeEvent('a', '2026-05-15T09:00:00', '2026-05-15T10:00:00'),
      makeEvent('b', '2026-05-15T11:00:00', '2026-05-15T12:00:00'),
    ];
    const result = layoutOverlappingEvents(events, DAY);
    // Both share the same column since they don't overlap
    expect(result.every((r) => r.col === 0)).toBe(true);
  });

  // Two events at the same time → must be in different columns, both
  // colCount=2 so they each render at 50% width
  it('splits two fully-overlapping events into 2 columns', () => {
    const events = [
      makeEvent('a', '2026-05-15T09:00:00', '2026-05-15T10:00:00'),
      makeEvent('b', '2026-05-15T09:00:00', '2026-05-15T10:00:00'),
    ];
    const result = layoutOverlappingEvents(events, DAY);
    const cols = result.map((r) => r.col).sort();
    expect(cols).toEqual([0, 1]);
    expect(result.every((r) => r.colCount === 2)).toBe(true);
  });

  it('splits three fully-overlapping events into 3 columns', () => {
    const events = [
      makeEvent('a', '2026-05-15T09:00:00', '2026-05-15T11:00:00'),
      makeEvent('b', '2026-05-15T09:30:00', '2026-05-15T10:30:00'),
      makeEvent('c', '2026-05-15T10:00:00', '2026-05-15T11:30:00'),
    ];
    const result = layoutOverlappingEvents(events, DAY);
    expect(result.every((r) => r.colCount === 3)).toBe(true);
    expect(result.map((r) => r.col).sort()).toEqual([0, 1, 2]);
  });

  // Filtering: events outside the day should be dropped after clamping
  it('filters out events that fall entirely outside the day', () => {
    const events = [makeEvent('a', '2026-05-14T10:00:00', '2026-05-14T11:00:00')];
    const result = layoutOverlappingEvents(events, DAY);
    expect(result).toHaveLength(0);
  });

  // Deterministic ordering — ties broken by id so render is stable
  it('breaks ties on equal start by event id (stable order)', () => {
    const events = [
      makeEvent('z', '2026-05-15T09:00:00', '2026-05-15T10:00:00'),
      makeEvent('a', '2026-05-15T09:00:00', '2026-05-15T10:00:00'),
    ];
    const result = layoutOverlappingEvents(events, DAY);
    // 'a' < 'z' lexically — 'a' gets col 0
    const a = result.find((r) => r.event.id === 'a');
    const z = result.find((r) => r.event.id === 'z');
    expect(a?.col).toBe(0);
    expect(z?.col).toBe(1);
  });
});
