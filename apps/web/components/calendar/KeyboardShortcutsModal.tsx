'use client';

import { KeyboardIcon, XIcon } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  const categories = [
    {
      title: 'Navigation',
      items: [
        { label: 'Jump to Today', keys: ['T'] },
        { label: 'Previous Period', keys: ['K', 'P', '←'] },
        { label: 'Next Period', keys: ['J', 'N', '→'] },
      ],
    },
    {
      title: 'Views',
      items: [
        { label: 'Day View', keys: ['D', '1'] },
        { label: 'Week View', keys: ['W', '2'] },
        { label: 'Month View', keys: ['M', '3'] },
        { label: 'Year View', keys: ['Y', '4'] },
        { label: 'Schedule (Agenda) View', keys: ['A', 'S', '5'] },
      ],
    },
    {
      title: 'Creation & Actions',
      items: [
        { label: 'Create New Event', keys: ['C'] },
        { label: 'Open Command Palette', keys: ['⌘', 'K'] },
        { label: 'All Settings & Preferences', keys: ['⌘', ','] },
        { label: 'Quick Search', keys: ['/'] },
        { label: 'Keyboard Shortcuts Help', keys: ['?'] },
        { label: 'Close Modal / Dropdown', keys: ['Esc'] },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0B57D0] dark:bg-blue-950 dark:text-blue-400">
              <KeyboardIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Speed through your calendar workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
                {cat.title}
              </h4>
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-850/50">
                {cat.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded-md border border-gray-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-6 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400">
          <span>Press Esc anytime to close</span>
          <span className="font-medium text-[#0B57D0] dark:text-blue-400">
            Calendar Clone Pro
          </span>
        </div>
      </div>
    </div>
  );
}
