'use client';

import { useState } from 'react';
import {
  BellIcon,
  CheckIcon,
  DatabaseIcon,
  DownloadIcon,
  LaptopIcon,
  LogOutIcon,
  MoonIcon,
  PaletteIcon,
  RefreshCwIcon,
  SettingsIcon,
  SlidersIcon,
  SunIcon,
  UploadIcon,
  UserIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from 'lucide-react';
import { type ThemeMode, useTheme } from '@/lib/theme/useTheme';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { apiFetch } from '@/lib/api/client';
import { playSuccessChime } from '@/lib/utils/sound';

type Props = {
  open: boolean;
  onClose: () => void;
  onExportCalendar?: () => void;
  onImportCalendar?: (file: File) => void;
  onReseedCompleted?: () => void;
};

export function CalendarSettingsModal({
  open,
  onClose,
  onExportCalendar,
  onImportCalendar,
  onReseedCompleted,
}: Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'data' | 'account'>('general');
  const { theme, setTheme } = useTheme();
  const authState = useCurrentUser();
  const [reseeding, setReseeding] = useState(false);
  const [reseedSuccess, setReseedSuccess] = useState(false);

  // General settings stored in localStorage
  const [defaultDuration, setDefaultDuration] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('cal_default_duration') || '30';
    return '30';
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('cal_sound_enabled') !== 'false';
    return true;
  });

  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('cal_week_monday') === 'true';
    return false;
  });

  if (!open) return null;

  const handleDurationChange = (val: string) => {
    setDefaultDuration(val);
    if (typeof window !== 'undefined') localStorage.setItem('cal_default_duration', val);
  };

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    if (typeof window !== 'undefined') localStorage.setItem('cal_sound_enabled', String(val));
    if (val) playSuccessChime();
  };

  const handleWeekStartToggle = (val: boolean) => {
    setWeekStartsOnMonday(val);
    if (typeof window !== 'undefined') localStorage.setItem('cal_week_monday', String(val));
  };

  const handleReseed = async () => {
    setReseeding(true);
    setReseedSuccess(false);
    try {
      await apiFetch('/v1/auth/reseed', { method: 'POST' });
      setReseedSuccess(true);
      playSuccessChime();
      if (onReseedCompleted) onReseedCompleted();
      setTimeout(() => {
        setReseedSuccess(false);
        window.location.reload();
      }, 1200);
    } catch {
      alert('Could not reseed calendar. Please check backend connection.');
    } finally {
      setReseeding(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/v1/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const user = authState.status === 'authenticated' ? authState.user : null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Left Tab Sidebar */}
        <div className="flex w-56 flex-col border-r border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/60">
          <div className="mb-4 flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <SettingsIcon size={16} />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">Settings</span>
          </div>

          <nav className="flex-1 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                activeTab === 'general'
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/50',
              ].join(' ')}
            >
              <SlidersIcon size={15} />
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                activeTab === 'appearance'
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/50',
              ].join(' ')}
            >
              <PaletteIcon size={15} />
              Appearance & Theme
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                activeTab === 'notifications'
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/50',
              ].join(' ')}
            >
              <BellIcon size={15} />
              Alerts & Audio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                activeTab === 'data'
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/50',
              ].join(' ')}
            >
              <DatabaseIcon size={15} />
              Data & Reseed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                activeTab === 'account'
                  ? 'bg-white text-blue-600 shadow-2xs dark:bg-gray-800 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/50',
              ].join(' ')}
            >
              <UserIcon size={15} />
              User Profile
            </button>
          </nav>

          <div className="border-t border-gray-200/60 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOutIcon size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white capitalize">
              {activeTab} Settings
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Default Event Duration
                  </label>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Automatically assigned when creating a new scheduled block
                  </p>
                  <div className="flex gap-2">
                    {['15', '30', '45', '60'].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleDurationChange(mins)}
                        className={[
                          'rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                          defaultDuration === mins
                            ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300',
                        ].join(' ')}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Week Starts on Monday
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Default is Sunday. Toggle to align calendar grids to European/ISO format.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weekStartsOnMonday}
                      onChange={(e) => handleWeekStartToggle(e.target.checked)}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-3">
                    Color Theme & Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: 'light' as ThemeMode, label: 'Clean Light', icon: <SunIcon size={16} /> },
                      { val: 'dark' as ThemeMode, label: 'Sleek Dark', icon: <MoonIcon size={16} /> },
                      { val: 'system' as ThemeMode, label: 'System Auto', icon: <LaptopIcon size={16} /> },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setTheme(opt.val)}
                        className={[
                          'flex flex-col items-center gap-2 rounded-2xl border p-4 text-xs font-semibold transition',
                          theme === opt.val
                            ? 'border-blue-600 bg-blue-50/60 text-blue-600 ring-2 ring-blue-500/20 dark:bg-blue-950 dark:text-blue-300'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300',
                        ].join(' ')}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                        {theme === opt.val && <CheckIcon size={12} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        {soundEnabled ? <Volume2Icon size={18} /> : <VolumeXIcon size={18} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Interactive Audio Chimes
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Plays subtle, pleasing synthesized tones on task completion and event save
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSoundToggle(!soundEnabled)}
                      className={[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        soundEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          soundEnabled ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Reseed Full Demo Suite
                      </h4>
                      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                        Populate your calendar with realistic roadmap syncs, 1:1 reviews, team standups, and recurring focus blocks across the current month.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={reseeding}
                      onClick={handleReseed}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCwIcon size={13} className={reseeding ? 'animate-spin' : ''} />
                      {reseeding ? 'Reseeding…' : 'Reseed Now'}
                    </button>
                  </div>
                  {reseedSuccess && (
                    <p className="mt-2 text-xs font-semibold text-emerald-600">
                      ✓ Reseed complete! Refreshing calendar…
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onExportCalendar}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 p-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <DownloadIcon size={18} className="text-gray-500" />
                    <span>Export Calendar (.ics)</span>
                  </button>

                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 p-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                    <UploadIcon size={18} className="text-gray-500" />
                    <span>Import Calendar (.ics)</span>
                    <input
                      type="file"
                      accept=".ics,text/calendar"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportCalendar) {
                          onImportCalendar(file);
                          onClose();
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-base shadow-xs">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {user?.name || 'Logged In User'}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email || 'user@calendar-clone.local'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                    System Architecture
                  </h4>
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <p>• Monolithic Full-Stack Calendar Engine</p>
                    <p>• NestJS Backend API on port 3005 with Prisma ORM</p>
                    <p>• PostgreSQL Relational Database (Local / Render)</p>
                    <p>• Next.js App Router Frontend with Tailwind CSS</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                      await apiFetch('/v1/auth/logout', { method: 'POST' });
                    } catch {
                      // ignore
                    }
                    window.location.href = '/login';
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-98 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                >
                  <LogOutIcon size={14} />
                  <span>Sign out of account</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom footer */}
          <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/60 px-6 py-3 dark:border-gray-800 dark:bg-gray-800/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
