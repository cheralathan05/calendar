import { addDays, isSameDay, startOfMonth, startOfWeek } from 'date-fns';

export type MonthCell = {
  date: Date;
  isToday: boolean;
};

export function generateMonthGrid(anchorDate: Date, today: Date = new Date()): MonthCell[] {
  const monthStart = startOfMonth(anchorDate);

  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({
      date: d,
      isToday: isSameDay(d, today),
    });
  }
  return cells;
}
