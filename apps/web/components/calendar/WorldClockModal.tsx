'use client';

import { useEffect, useState } from 'react';
import {
  GlobeIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from 'lucide-react';

const CITIES = [
  { city: 'San Francisco', zone: 'America/Los_Angeles', label: 'PST / PDT' },
  { city: 'New York', zone: 'America/New_York', label: 'EST / EDT' },
  { city: 'London', zone: 'Europe/London', label: 'GMT / BST' },
  { city: 'Bengaluru / IST', zone: 'Asia/Kolkata', label: 'IST (+5:30)' },
  { city: 'Tokyo', zone: 'Asia/Tokyo', label: 'JST (+9:00)' },
  { city: 'Sydney', zone: 'Australia/Sydney', label: 'AEST (+10:00)' },
  { city: 'UTC / Universal', zone: 'UTC', label: 'UTC' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WorldClockModal({ open, onClose }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 px-6 py-4 dark:border-gray-800 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GlobeIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                World Time & Global Team Clocks
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Check international teammate availability across time zones
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

        {/* City Clocks List */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-3">
          {CITIES.map((c) => {
            const timeStr = new Intl.DateTimeFormat('en-US', {
              timeZone: c.zone,
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: true,
            }).format(now);

            const hour24 = Number(
              new Intl.DateTimeFormat('en-US', {
                timeZone: c.zone,
                hour: 'numeric',
                hour12: false,
              }).format(now),
            );

            const isWorkingHours = hour24 >= 9 && hour24 < 18;
            const isDay = hour24 >= 6 && hour24 < 20;

            const dateStr = new Intl.DateTimeFormat('en-US', {
              timeZone: c.zone,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }).format(now);

            return (
              <div
                key={c.zone}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-gray-200 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-xl',
                      isDay
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
                    ].join(' ')}
                  >
                    {isDay ? <SunIcon size={18} /> : <MoonIcon size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {c.city}
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      {c.label} · {dateStr}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-base font-bold text-gray-900 dark:text-white">
                    {timeStr}
                  </span>
                  <div className="mt-0.5">
                    {isWorkingHours ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Working Hours
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        Outside Hours
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/60 px-6 py-3.5 dark:border-gray-800 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
