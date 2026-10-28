'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { differenceInMinutes, format, isSameWeek } from 'date-fns';

type Props = {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  currentDate: Date;
  onScheduleFocusBlock: (title: string, start: Date, end: Date) => void;
};

export function CalendarAnalyticsModal({
  open,
  onClose,
  events,
  currentDate,
  onScheduleFocusBlock,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'recommendations'>('overview');

  // Filter events for the current week
  const weekEvents = useMemo(() => {
    return events.filter((ev) => {
      try {
        const d = new Date(ev.start);
        return isSameWeek(d, currentDate, { weekStartsOn: 1 });
      } catch {
        return false;
      }
    });
  }, [events, currentDate]);

  // Compute metrics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let meetingMinutes = 0;
    let focusMinutes = 0;
    let personalMinutes = 0;
    const dayMinutesMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    const colorMinutesMap: Record<string, { label: string; minutes: number; color: string }> = {};

    weekEvents.forEach((ev) => {
      try {
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        let mins = differenceInMinutes(end, start);
        if (mins <= 0) mins = 30; // fallback minimum
        if (ev.allDay) mins = 8 * 60; // 8 hours for all-day

        totalMinutes += mins;

        const dayOfWeek = start.getDay();
        dayMinutesMap[dayOfWeek] = (dayMinutesMap[dayOfWeek] || 0) + mins;

        // Categorize
        const lowerTitle = ev.title.toLowerCase();
        const isFocus =
          lowerTitle.includes('focus') ||
          lowerTitle.includes('deep work') ||
          lowerTitle.includes('coding') ||
          lowerTitle.includes('study');
        const isPersonal =
          lowerTitle.includes('gym') ||
          lowerTitle.includes('lunch') ||
          lowerTitle.includes('coffee') ||
          lowerTitle.includes('doctor') ||
          lowerTitle.includes('workout');

        if (isFocus) {
          focusMinutes += mins;
        } else if (isPersonal) {
          personalMinutes += mins;
        } else {
          meetingMinutes += mins;
        }

        const color = ev.color || '#039BE5';
        if (!colorMinutesMap[color]) {
          colorMinutesMap[color] = { label: ev.title, minutes: 0, color };
        }
        colorMinutesMap[color].minutes += mins;
      } catch {
        // ignore invalid dates
      }
    });

    const totalHours = (totalMinutes / 60).toFixed(1);
    const meetingHours = (meetingMinutes / 60).toFixed(1);
    const focusHours = (focusMinutes / 60).toFixed(1);

    const meetingPercent = totalMinutes > 0 ? Math.round((meetingMinutes / totalMinutes) * 100) : 0;
    const focusPercent = totalMinutes > 0 ? Math.round((focusMinutes / totalMinutes) * 100) : 0;

    // Busiest day
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let maxDay = 1;
    let maxDayMins = 0;
    Object.entries(dayMinutesMap).forEach(([d, m]) => {
      if (m > maxDayMins) {
        maxDayMins = m;
        maxDay = Number(d);
      }
    });

    // Health Score
    let healthScore = 90;
    let healthLabel = 'Optimal Balance 🌟';
    if (meetingPercent > 65) {
      healthScore = 65;
      healthLabel = 'Meeting Heavy ⚠️';
    } else if (focusPercent >= 40) {
      healthScore = 95;
      healthLabel = 'Deep Focus Champion 🎯';
    }

    return {
      totalHours,
      meetingHours,
      focusHours,
      personalHours: (personalMinutes / 60).toFixed(1),
      meetingPercent,
      focusPercent,
      busiestDay: dayNames[maxDay],
      busiestDayHours: (maxDayMins / 60).toFixed(1),
      dayMinutesMap,
      healthScore,
      healthLabel,
      colorBreakdown: Object.values(colorMinutesMap).sort((a, b) => b.minutes - a.minutes).slice(0, 5),
    };
  }, [weekEvents]);

  if (!open) return null;

  const handleQuickFocusSchedule = () => {
    // Schedule a 60 min focus block tomorrow at 9:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(10, 0, 0, 0);

    onScheduleFocusBlock('🎯 Deep Focus Block', tomorrow, end);
    onClose();
  };

  const daysList = [
    { key: 1, name: 'Mon' },
    { key: 2, name: 'Tue' },
    { key: 3, name: 'Wed' },
    { key: 4, name: 'Thu' },
    { key: 5, name: 'Fri' },
    { key: 6, name: 'Sat' },
    { key: 0, name: 'Sun' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 px-6 py-4 dark:border-gray-800 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <SparklesIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Calendar & Productivity Insights
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Weekly workload analytics for {format(currentDate, 'MMMM yyyy')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 px-6 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={[
              'border-b-2 px-4 py-3 text-xs font-semibold transition',
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            Overview & Workload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={[
              'border-b-2 px-4 py-3 text-xs font-semibold transition',
              activeTab === 'breakdown'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            Category Distribution
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={[
              'border-b-2 px-4 py-3 text-xs font-semibold transition',
              activeTab === 'recommendations'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            Smart Optimization
          </button>
        </div>

        {/* Body content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <ClockIcon size={15} />
                    <span className="text-xs font-medium">Total Scheduled</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalHours} <span className="text-xs font-normal text-gray-400">hrs</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">This week</p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <UsersIcon size={15} />
                    <span className="text-xs font-medium">Meetings</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.meetingHours} <span className="text-xs font-normal text-blue-400">hrs</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-blue-500 dark:text-blue-400">
                    {stats.meetingPercent}% of scheduled time
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <ZapIcon size={15} />
                    <span className="text-xs font-medium">Deep Focus</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.focusHours} <span className="text-xs font-normal text-indigo-400">hrs</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-indigo-500 dark:text-indigo-400">
                    {stats.focusPercent}% focus blocks
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <FlameIcon size={15} />
                    <span className="text-xs font-medium">Busiest Day</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.busiestDay}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                    {stats.busiestDayHours} hrs scheduled
                  </p>
                </div>
              </div>

              {/* Weekly Daily Distribution Chart */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-800/40">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Daily Schedule Load (Hours)
                  </h3>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {stats.healthLabel}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {daysList.map((day) => {
                    const mins = stats.dayMinutesMap[day.key] || 0;
                    const hours = (mins / 60).toFixed(1);
                    const heightPercent = Math.min(100, Math.round((mins / (8 * 60)) * 100));

                    return (
                      <div key={day.key} className="flex flex-col items-center">
                        <div className="flex h-28 w-full flex-col justify-end rounded-xl bg-gray-100 p-1 dark:bg-gray-700/50">
                          <div
                            className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-indigo-500 transition-all duration-500"
                            style={{ height: `${Math.max(8, heightPercent)}%` }}
                            title={`${hours} hours`}
                          />
                        </div>
                        <span className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {day.name}
                        </span>
                        <span className="text-[10px] text-gray-400">{hours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Events by Category & Calendar Color
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shows where your time is distributed across projects and engagements.
              </p>

              <div className="space-y-3">
                {stats.colorBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    No events scheduled this week.
                  </p>
                ) : (
                  stats.colorBreakdown.map((item, idx) => {
                    const hours = (item.minutes / 60).toFixed(1);
                    const percent = Math.round((item.minutes / (parseFloat(stats.totalHours) * 60 || 1)) * 100);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 dark:border-gray-800 dark:bg-gray-800/30"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full shadow-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden w-24 rounded-full bg-gray-200 sm:block dark:bg-gray-700">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: item.color }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {hours} hrs ({percent}%)
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-600 p-2 text-white shadow-xs">
                    <TrendingUpIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      Smart Schedule Recommendation
                    </h4>
                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                      {stats.meetingPercent > 50
                        ? 'Your calendar is heavily loaded with meetings. Protecting focus blocks in morning hours significantly improves output and avoids context switching.'
                        : 'Your schedule maintains a healthy focus-to-meeting balance. Consider locking in recurring deep work routines to safeguard this productivity.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleQuickFocusSchedule}
                      className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-98"
                    >
                      <SparklesIcon size={14} />
                      Auto-Schedule 1-Hour Focus Block (Tomorrow 9 AM)
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Productivity Habits & Tips
                </h4>
                <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon size={14} className="text-emerald-500" />
                    Aim for at least 10–12 hours of uninterrupted focus time per work week.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon size={14} className="text-emerald-500" />
                    Keep meetings to 25 or 50 minutes to allow natural breaks and buffer time.
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2Icon size={14} className="text-emerald-500" />
                    Group similar meetings together on Tuesdays and Thursdays.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-3.5 dark:border-gray-800 dark:bg-gray-800/60">
          <span className="text-[11px] text-gray-400">
            Based on {weekEvents.length} events this week
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
