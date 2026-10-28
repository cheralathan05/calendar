'use client';

import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { shortDaysOfWeek } from '@/constants';
import { generateMonthGrid } from '@/lib/month-grid';

type Props = {
  /** The date that is currently selected/highlighted. */
  selected: Date;
  /** Called when the user clicks a day. Caller is responsible for any further side-effect (close, navigate, etc.). */
  onSelect: (d: Date) => void;
  /**
   * Visual density:
   * - 'sidebar' = compact (h-6 cells, smaller fonts) — fits inside a narrow column.
   * - 'popover' = relaxed (h-8 cells)              — for header date picker.
   */
  density?: 'sidebar' | 'popover';
};

/**
 * Headless month grid + month navigation.
 * Owns only the cursor (which month is shown) — selection state lives in the parent.
 *
 * Reused by:
 *   - <Sidebar /> (density='sidebar')
 *   - <DatePickerPopover /> (density='popover')
 */
export function DatePickerCore({ selected, onSelect, density = 'popover' }: Props) {
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(selected));
  const [prevSelected, setPrevSelected] = useState<Date>(selected);

  // If the parent jumps the selection far away (e.g. "Today" while sidebar showing a different month),
  // follow it. We only update when the month actually changed to avoid wasted renders.
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (!isSameMonth(cursor, selected)) setCursor(startOfMonth(selected));
  }

  const cells = useMemo(() => generateMonthGrid(cursor), [cursor]);

  const isSidebar = density === 'sidebar';
  const cellSize = isSidebar
    ? 'h-5 w-5 text-[10px] sm:h-6 sm:w-6 sm:text-[11px]'
    : 'h-8 w-8 text-[13px]';
  const headerLabel = isSidebar ? 'text-xs font-semibold' : 'text-sm font-medium';
  const labelFmt = isSidebar ? 'MMM yyyy' : 'MMMM yyyy';
  const navSize = isSidebar ? 12 : 16;

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className={`${headerLabel} text-[var(--gcal-text,#3c4043)]`}>
          {format(cursor, labelFmt)}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded-full p-0.5 hover:bg-[var(--gcal-bg-hover,#f1f3f4)]"
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeftIcon size={navSize} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="rounded-full p-0.5 hover:bg-[var(--gcal-bg-hover,#f1f3f4)]"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRightIcon size={navSize} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {shortDaysOfWeek.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="py-0.5 text-[10px] font-semibold text-[var(--gcal-text-muted,#70757a)]"
          >
            {d}
          </div>
        ))}

        {cells.map((cell) => {
          const inMonth = isSameMonth(cell.date, cursor);
          const isToday = cell.isToday && inMonth;
          const isSelected = isSameDay(cell.date, selected) && inMonth;

          let cls = `mx-auto flex ${cellSize} cursor-pointer items-center justify-center rounded-full transition-colors`;

          if (isToday) {
            cls += ' bg-[#1a73e8] font-bold text-white hover:bg-[#1a73e8]';
          } else if (isSelected) {
            cls += ' bg-[#C2E7FF] font-semibold text-gray-900';
          } else if (!inMonth) {
            cls += ' text-gray-300 hover:bg-gray-50';
          } else {
            cls +=
              ' text-[var(--gcal-text,#3c4043)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-300 dark:hover:bg-gray-700';
          }

          return (
            <div key={cell.date.toISOString()} className="flex justify-center py-0.5">
              <button
                type="button"
                className={cls}
                onClick={() => onSelect(cell.date)}
                aria-label={format(cell.date, 'MMMM d, yyyy')}
                aria-pressed={isSelected}
              >
                {format(cell.date, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
