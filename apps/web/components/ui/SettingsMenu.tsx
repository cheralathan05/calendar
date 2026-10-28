'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckIcon,
  DownloadIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UploadIcon,
} from 'lucide-react';
import { type ThemeMode, useTheme } from '@/lib/theme/useTheme';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <SunIcon size={15} /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon size={15} /> },
  { value: 'system', label: 'System', icon: <MonitorIcon size={15} /> },
];

export function SettingsMenu(props: {
  onExportCalendar?: () => void;
  onImportCalendar?: (file: File) => void;
  onOpenSettings?: () => void;
}) {
  const { onExportCalendar, onImportCalendar, onOpenSettings } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon size={18} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* File input rendered unconditionally so it stays in DOM when user picks a file. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onImportCalendar) onImportCalendar(file);
          e.target.value = '';
        }}
      />

      {open && (
        <div className="absolute top-10 right-0 z-50 w-60 rounded-2xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {/* Full Settings Dialog Button */}
          {onOpenSettings && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700/60"
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
            >
              <div className="flex items-center gap-2.5">
                <SettingsIcon size={15} className="text-blue-600 dark:text-blue-400" />
                <span>All Settings</span>
              </div>
              <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-mono text-gray-400 dark:bg-gray-700">
                ⌘,
              </kbd>
            </button>
          )}

          <div className="my-1.5 border-t border-gray-100 dark:border-gray-700" />

          {/* Appearance section */}
          <div className="px-3 pt-1 pb-1">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Appearance
            </p>
            <div className="flex gap-1">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={[
                    'relative flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-colors',
                    theme === opt.value
                      ? 'border-[#0B57D0] bg-blue-50 text-[#0B57D0] dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700',
                  ].join(' ')}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  {theme === opt.value && (
                    <CheckIcon size={10} className="absolute right-1 bottom-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="my-2 border-t border-gray-100 dark:border-gray-700" />

          {/* Export */}
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => {
              setOpen(false);
              onExportCalendar?.();
            }}
          >
            <DownloadIcon size={15} className="text-gray-400" />
            Export calendar (.ics)
          </button>

          {/* Import */}
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <UploadIcon size={15} className="text-gray-400" />
            Import calendar (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
