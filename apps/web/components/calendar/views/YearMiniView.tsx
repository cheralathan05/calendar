import { format, isSameMonth } from 'date-fns';
import { generateMonthGrid } from '@/lib/month-grid';
import { shortDaysOfWeek } from '@/constants';
import { useState } from 'react';

export function YearMiniView(props: {
  monthDate: Date;
  onPickMonth?: (date: Date) => void;
  onOpenDayPopover?: (date: Date, rect: DOMRect) => void;
}) {
  const { monthDate, onOpenDayPopover } = props;

  const cells = generateMonthGrid(monthDate);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);

  return (
    <button type="button" className="w-full p-3 text-left">
      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-[var(--gcal-text-muted,#70757a)]">
        {format(monthDate, 'MMMM')}
      </div>
      <div className="mx-auto grid grid-cols-7 gap-y-1 text-center text-[10px] text-gray-600 dark:text-gray-400">
        {shortDaysOfWeek.map((d, i) => (
          <div key={`${d}-${i}`} className="text-center font-semibold">
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const iso = cell.date.toISOString();
          const isSelected = selectedDateIso === iso;
          // Only highlight today/selected when the cell belongs to this month,
          // not for overflow days from adjacent months
          const belongsToMonth = isSameMonth(cell.date, monthDate);
          const isToday = cell.isToday && belongsToMonth;

          const base =
            'mx-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-center text-[var(--gcal-text,#3c4043)]';
          const todayClass = isToday ? 'bg-[#0B57D0] font-bold text-white' : '';
          const selectedClass = isSelected && !isToday ? 'bg-[#c2e7ff] font-semibold' : '';
          const outsideClass = !belongsToMonth ? 'text-gray-300 dark:text-gray-500' : '';
          const hoverClass =
            !isToday && !isSelected ? 'hover:bg-[var(--gcal-bg-hover,#f1f3f4)]' : '';

          const className = [base, todayClass, selectedClass, outsideClass, hoverClass]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={iso}
              className={className}
              onClick={(clickEvt) => {
                clickEvt.stopPropagation();
                const rect = clickEvt.currentTarget.getBoundingClientRect();
                setSelectedDateIso(iso);
                onOpenDayPopover?.(cell.date, rect);
              }}
            >
              {format(cell.date, 'd')}
            </div>
          );
        })}
      </div>
    </button>
  );
}
