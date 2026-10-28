import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { generateMonthGrid } from './month-grid';

/**
 * IMPORTANT: we compare dates with `format(..., 'yyyy-MM-dd')` instead of
 * `toISOString().slice(0,10)`. The latter prints UTC and breaks on any
 * machine east of UTC (e.g. Asia/Jakarta UTC+7 sees a one-day shift).
 * date-fns `format` uses local time, matching how the calendar UI shows
 * dates to the user.
 */
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

describe('generateMonthGrid', () => {
  it('returns exactly 42 cells for any month', () => {
    const cells = generateMonthGrid(new Date(2026, 4, 15), new Date(2026, 4, 15));
    expect(cells).toHaveLength(42);
  });

  it('returns 42 cells even for February in a non-leap year (28 days)', () => {
    const cells = generateMonthGrid(new Date(2025, 1, 15), new Date(2025, 1, 15));
    expect(cells).toHaveLength(42);
  });

  // For May 2026: May 1 is a Friday → grid starts Sun Apr 26.
  it('starts on the Sunday before the 1st of the month', () => {
    const cells = generateMonthGrid(new Date(2026, 4, 15), new Date(2026, 4, 15));
    expect(cells[0].date.getDay()).toBe(0); // Sunday
    expect(ymd(cells[0].date)).toBe('2026-04-26');
  });

  it('marks exactly one cell as today when today is in the grid', () => {
    const today = new Date(2026, 4, 15, 12, 0, 0);
    const cells = generateMonthGrid(today, today);
    const todayCells = cells.filter((c) => c.isToday);
    expect(todayCells).toHaveLength(1);
    expect(ymd(todayCells[0].date)).toBe('2026-05-15');
  });

  it('marks zero cells as today when today is outside the grid window', () => {
    const cells = generateMonthGrid(
      new Date(2026, 0, 15), // anchor: January
      new Date(2026, 4, 15), // today: May (out of Jan grid)
    );
    expect(cells.filter((c) => c.isToday)).toHaveLength(0);
  });
});
