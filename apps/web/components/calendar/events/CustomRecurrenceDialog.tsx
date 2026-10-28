'use client';

import { useState } from 'react';
import { RRule } from 'rrule';
import { XIcon } from 'lucide-react';

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type EndsOn = 'never' | 'on' | 'after';

const WEEKDAYS = [
  { label: 'S', value: RRule.SU, name: 'Sunday' },
  { label: 'M', value: RRule.MO, name: 'Monday' },
  { label: 'T', value: RRule.TU, name: 'Tuesday' },
  { label: 'W', value: RRule.WE, name: 'Wednesday' },
  { label: 'T', value: RRule.TH, name: 'Thursday' },
  { label: 'F', value: RRule.FR, name: 'Friday' },
  { label: 'S', value: RRule.SA, name: 'Saturday' },
];

export function CustomRecurrenceDialog(props: {
  startDate?: Date;
  initialRule?: string | null;
  onSave: (rrule: string) => void;
  onClose: () => void;
}) {
  const { startDate, onSave, onClose } = props;

  const [freq, setFreq] = useState<Freq>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    // default to same day as startDate
    if (startDate) return [startDate.getDay()];
    return [1]; // Monday
  });
  const [endsOn, setEndsOn] = useState<EndsOn>('never');
  const [endDate, setEndDate] = useState('');
  const [count, setCount] = useState(10);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex],
    );
  };

  const freqLabel = {
    DAILY: interval === 1 ? 'day' : 'days',
    WEEKLY: interval === 1 ? 'week' : 'weeks',
    MONTHLY: interval === 1 ? 'month' : 'months',
    YEARLY: interval === 1 ? 'year' : 'years',
  }[freq];

  const buildSummary = () => {
    const parts: string[] = [];
    parts.push(interval === 1 ? `Every ${freqLabel}` : `Every ${interval} ${freqLabel}`);
    if (freq === 'WEEKLY' && selectedDays.length > 0) {
      const names = selectedDays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAYS[d]?.name.slice(0, 3))
        .join(', ');
      parts.push(`on ${names}`);
    }
    if (endsOn === 'on' && endDate) parts.push(`until ${endDate}`);
    if (endsOn === 'after') parts.push(`${count} times`);
    return parts.join(', ');
  };

  const handleSave = () => {
    const rruleFreq = {
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
    }[freq];

    const opts: ConstructorParameters<typeof RRule>[0] = {
      freq: rruleFreq,
      interval: interval > 1 ? interval : undefined,
    };

    if (freq === 'WEEKLY' && selectedDays.length > 0) {
      opts.byweekday = selectedDays.map((d) => WEEKDAYS[d]!.value);
    }

    if (endsOn === 'on' && endDate) {
      opts.until = new Date(`${endDate}T23:59:59`);
    } else if (endsOn === 'after') {
      opts.count = count;
    }

    const rule = new RRule(opts);
    // Return rule-only string (no DTSTART)
    const str = rule.toString();
    const ruleOnly = str.includes('RRULE:') ? (str.split('RRULE:')[1] ?? str) : str;
    onSave(ruleOnly);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Custom recurrence
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Repeat every N */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">Repeat every</span>
          <input
            type="number"
            min={1}
            max={99}
            value={interval}
            onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#0B57D0] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value as Freq)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[#0B57D0] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="DAILY">day(s)</option>
            <option value="WEEKLY">week(s)</option>
            <option value="MONTHLY">month(s)</option>
            <option value="YEARLY">year(s)</option>
          </select>
        </div>

        {/* Day-of-week selector (weekly only) */}
        {freq === 'WEEKLY' && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Repeat on</p>
            <div className="flex gap-1">
              {WEEKDAYS.map((day, idx) => (
                <button
                  key={day.name}
                  type="button"
                  aria-label={day.name}
                  aria-pressed={selectedDays.includes(idx)}
                  onClick={() => toggleDay(idx)}
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    selectedDays.includes(idx)
                      ? 'bg-[#0B57D0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                  ].join(' ')}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ends */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Ends</p>
          <div className="space-y-2">
            {/* Never */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="ends"
                value="never"
                checked={endsOn === 'never'}
                onChange={() => setEndsOn('never')}
                className="accent-[#0B57D0]"
              />
              Never
            </label>

            {/* On date */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="ends"
                value="on"
                checked={endsOn === 'on'}
                onChange={() => setEndsOn('on')}
                className="accent-[#0B57D0]"
              />
              On
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={endsOn !== 'on'}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            {/* After N occurrences */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="ends"
                value="after"
                checked={endsOn === 'after'}
                onChange={() => setEndsOn('after')}
                className="accent-[#0B57D0]"
              />
              After
              <input
                type="number"
                min={1}
                max={999}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                disabled={endsOn !== 'after'}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <span>occurrence(s)</span>
            </label>
          </div>
        </div>

        {/* Summary */}
        <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#0B57D0] dark:bg-blue-900/20 dark:text-blue-300">
          {buildSummary()}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-[#0B57D0] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#044dc2]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
