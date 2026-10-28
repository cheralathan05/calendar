'use client';

import { useState } from 'react';
import { RRule, type Weekday } from 'rrule';
import { format, isValid } from 'date-fns';
import { CustomRecurrenceDialog } from './CustomRecurrenceDialog';

type RecurrenceValue = { rrule?: string | null };

export default function RecurrencePicker(props: {
  value?: RecurrenceValue;
  onChange: (v: RecurrenceValue) => void;
  startDate?: Date;
}) {
  const { value, onChange, startDate } = props;

  // helper: map JS getDay() (0 = Sun) to RRule weekdays safely
  const jsDayToRRule = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

  const [preset, setPreset] = useState<string>(() => {
    if (!value?.rrule || !startDate) return 'none';
    try {
      const opts = RRule.parseString(value.rrule);

      const isDaily = opts.freq === RRule.DAILY && !opts.byweekday && !opts.bymonthday;

      const weekdayList = (opts.byweekday ?? []) as Weekday[];

      const isWeeklySameDay =
        opts.freq === RRule.WEEKLY &&
        weekdayList.length === 1 &&
        jsDayToRRule[startDate.getDay()]?.weekday === weekdayList[0]?.weekday;

      const isWeekday =
        opts.freq === RRule.WEEKLY &&
        weekdayList.length === 5 &&
        [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR].every((w) =>
          weekdayList.some((bw) => bw.weekday === w.weekday),
        );

      const isMonthlySameDay =
        opts.freq === RRule.MONTHLY &&
        Array.isArray(opts.bymonthday) &&
        opts.bymonthday.length === 1 &&
        opts.bymonthday[0] === startDate.getDate();

      const isYearly = opts.freq === RRule.YEARLY;

      if (isDaily) return 'daily';
      if (isWeeklySameDay) return 'weekly';
      if (isWeekday) return 'weekday';
      if (isMonthlySameDay) return 'monthly';
      if (isYearly) return 'yearly';
      return 'custom';
    } catch {
      return 'custom';
    }
  });

  function localStartDate(sd?: Date) {
    if (!sd) return undefined;
    return new Date(
      sd.getFullYear(),
      sd.getMonth(),
      sd.getDate(),
      sd.getHours(),
      sd.getMinutes(),
      sd.getSeconds(),
      sd.getMilliseconds(),
    );
  }

  function setNone() {
    setPreset('none');
    onChange({ rrule: null });
  }

  function setDaily() {
    if (!startDate) return;
    const dt = localStartDate(startDate);
    const r = new RRule({
      freq: RRule.DAILY,
      dtstart: dt,
    }).toString();
    setPreset('daily');
    onChange({ rrule: r });
  }

  function setWeekly() {
    if (!startDate) return;
    const jsWeekday = startDate.getDay(); // 0..6 (Sunday..Saturday)
    const weekday = jsDayToRRule[jsWeekday];
    // Build a pure RRULE string without DTSTART; DTSTART will be managed separately
    const r = new RRule({
      freq: RRule.WEEKLY,
      byweekday: [weekday],
    }).toString();
    setPreset('weekly');
    onChange({ rrule: r });
  }

  function setEveryWeekday() {
    if (!startDate) return;
    const byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
    const dt = localStartDate(startDate);
    const r = new RRule({
      freq: RRule.WEEKLY,
      dtstart: dt,
      byweekday,
    }).toString();
    setPreset('weekday');
    onChange({ rrule: r });
  }

  function setMonthly() {
    if (!startDate) return;
    const dt = localStartDate(startDate);
    const r = new RRule({
      freq: RRule.MONTHLY,
      dtstart: dt,
      bymonthday: startDate.getDate(),
    }).toString();
    setPreset('monthly');
    onChange({ rrule: r });
  }

  function setYearly() {
    if (!startDate) return;
    const dt = localStartDate(startDate);
    const r = new RRule({
      freq: RRule.YEARLY,
      dtstart: dt,
    }).toString();
    setPreset('yearly');
    onChange({ rrule: r });
  }

  function recurringOptions() {
    if (!startDate || !isValid(startDate)) {
      return [
        ['none', 'Does not repeat'],
        ['daily', 'Daily'],
        ['weekly', 'Weekly'],
        ['monthly', 'Monthly'],
        ['yearly', 'Annually'],
      ] as [string, string][];
    }
    const dayOfWeek = format(startDate, 'EEEE');
    const dayOfMonth = startDate.getDate();
    return [
      ['none', 'Does not repeat'],
      ['daily', 'Daily'],
      ['weekly', `Weekly on ${dayOfWeek}`],
      ['weekday', 'Every weekday (Mon–Fri)'],
      ['monthly', 'Monthly'],
      ['yearly', `Annually on ${format(startDate, 'MMMM')} ${dayOfMonth} `],
      ['custom', 'Custom...'],
    ] as [string, string][];
  }

  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="rounded bg-gray-200 p-1.5 text-sm text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          value={preset}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'none') setNone();
            else if (v === 'daily') setDaily();
            else if (v === 'weekly') setWeekly();
            else if (v === 'weekday') setEveryWeekday();
            else if (v === 'monthly') setMonthly();
            else if (v === 'yearly') setYearly();
            else if (v === 'custom') {
              setPreset('custom');
              setCustomOpen(true);
            }
          }}
        >
          {recurringOptions().map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {preset === 'custom' && !customOpen && (
          <button
            type="button"
            className="text-xs text-[#0B57D0] underline hover:no-underline"
            onClick={() => setCustomOpen(true)}
          >
            Edit rule
          </button>
        )}
      </div>

      {customOpen && (
        <CustomRecurrenceDialog
          startDate={startDate}
          initialRule={value?.rrule}
          onClose={() => setCustomOpen(false)}
          onSave={(rrule) => {
            setPreset('custom');
            onChange({ rrule });
            setCustomOpen(false);
          }}
        />
      )}
    </div>
  );
}
