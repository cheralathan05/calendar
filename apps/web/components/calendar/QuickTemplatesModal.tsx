'use client';

import { useState } from 'react';
import {
  CheckIcon,
  CoffeeIcon,
  DumbbellIcon,
  FlameIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { addMinutes, format } from 'date-fns';

export type TemplatePreset = {
  id: string;
  title: string;
  durationMinutes: number;
  description: string;
  color: string;
  badge: string;
  hasMeetingUrl?: boolean;
  isTask?: boolean;
  icon: React.ReactNode;
};

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'one-on-one',
    title: '1:1 Sync & Catchup',
    durationMinutes: 30,
    description: 'Weekly one-on-one catchup and alignment meeting.',
    color: '#039BE5', // Peacock
    badge: 'Meeting',
    hasMeetingUrl: true,
    icon: <UsersIcon size={18} className="text-blue-500" />,
  },
  {
    id: 'deep-work',
    title: 'Deep Work & Focus Block',
    durationMinutes: 60,
    description: 'Protected uninterrupted focus time for high-leverage development and strategy.',
    color: '#3F51B5', // Indigo
    badge: 'Focus',
    icon: <ZapIcon size={18} className="text-indigo-500" />,
  },
  {
    id: 'sprint-standup',
    title: 'Team Sprint Standup',
    durationMinutes: 15,
    description: 'Quick 15-minute team checkin: what did you do, what are you doing, blockers.',
    color: '#0B8043', // Basil
    badge: 'Team',
    hasMeetingUrl: true,
    icon: <SparklesIcon size={18} className="text-emerald-500" />,
  },
  {
    id: 'coffee-chat',
    title: 'Coffee Break & Casual Chat',
    durationMinutes: 15,
    description: 'Informal check-in or quick recharge coffee break.',
    color: '#F4511E', // Tangerine
    badge: 'Social',
    icon: <CoffeeIcon size={18} className="text-amber-500" />,
  },
  {
    id: 'workout',
    title: 'Workout & Fitness Session',
    durationMinutes: 45,
    description: 'Gym, running, or stretching to keep energetic and clear-minded.',
    color: '#E67C73', // Flamingo
    badge: 'Health',
    icon: <DumbbellIcon size={18} className="text-rose-500" />,
  },
  {
    id: 'review-retro',
    title: 'Product Review & Architecture Retro',
    durationMinutes: 45,
    description: 'Deep dive into feature releases, performance benchmarks, and roadmaps.',
    color: '#8E24AA', // Grape
    badge: 'Strategy',
    hasMeetingUrl: true,
    icon: <FlameIcon size={18} className="text-purple-500" />,
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  onScheduleTemplate: (preset: {
    title: string;
    description: string;
    start: Date;
    end: Date;
    color: string;
    meetingUrl?: string;
  }) => Promise<boolean> | void;
};

export function QuickTemplatesModal({
  open,
  onClose,
  selectedDate,
  onScheduleTemplate,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset>(TEMPLATES[0]);
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleApply = async () => {
    setSaving(true);
    try {
      const [hours, mins] = startTimeStr.split(':').map(Number);
      const start = new Date(selectedDate);
      start.setHours(hours, mins, 0, 0);

      const end = addMinutes(start, selectedTemplate.durationMinutes);

      const meetingUrl = selectedTemplate.hasMeetingUrl
        ? `https://meet.jit.si/cal-${Math.random().toString(36).substring(2, 9)}`
        : undefined;

      await onScheduleTemplate({
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        start,
        end,
        color: selectedTemplate.color,
        meetingUrl,
      });

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 px-6 py-4 dark:border-gray-800 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ZapIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Quick Event Templates
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                1-Click scheduling for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
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

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate.id === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={[
                    'flex flex-col text-left rounded-2xl border p-4 transition-all duration-150',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/30'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-gray-700',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-gray-100 p-2 dark:bg-gray-800">
                        {tmpl.icon}
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {tmpl.durationMinutes}m · {tmpl.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-gray-900 dark:text-white">
                    {tmpl.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-2">
              Select Start Time for Event:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Duration: <strong className="text-gray-800 dark:text-gray-200">{selectedTemplate.durationMinutes} minutes</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleApply}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-98 disabled:opacity-50"
          >
            <SparklesIcon size={14} />
            {saving ? 'Scheduling…' : `Schedule "${selectedTemplate.title}"`}
          </button>
        </div>
      </div>
    </div>
  );
}
