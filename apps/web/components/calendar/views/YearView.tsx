import { addMonths, startOfYear } from 'date-fns';
import { useMemo } from 'react';

import { YearMiniView } from '@/components/calendar/views/YearMiniView';

export function YearView(props: {
  date: Date;
  events: CalendarEvent[];
  onPickMonth?: (date: Date) => void;
  onOpenDayPopover: (d: Date, rect: DOMRect) => void;
}) {
  const { date, onPickMonth, onOpenDayPopover } = props;

  const months = useMemo(() => {
    const yearStart = startOfYear(date);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [date]);

  return (
    <div className="rounded-2xl border border-[var(--gcal-border,#dadce0)] bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-900">
      {/*
        Responsive grid:
        - mobile        : 1 col
        - tablet (sm)   : 2 cols
        - laptop (md)   : 3 cols
        - desktop (lg)  : 4 cols
        - wide   (xl)   : 4 cols (cap — wider screens get more breathing room)
      */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <YearMiniView
            key={month.toISOString()}
            monthDate={month}
            onPickMonth={onPickMonth}
            onOpenDayPopover={onOpenDayPopover}
          />
        ))}
      </div>
    </div>
  );
}
