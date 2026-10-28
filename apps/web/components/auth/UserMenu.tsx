'use client';

import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { API_URL, AUTH_URL } from '@/lib/api/client';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function UserMenu() {
  const state = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (state.status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />;
  }

  if (state.status === 'unauthenticated') {
    return (
      <div className="flex items-center gap-2">
        <a
          href={`${AUTH_URL}/v1/auth/google/start`}
          className="rounded-full border border-[#0B57D0] px-3 py-1.5 text-xs font-medium text-[#0B57D0] hover:bg-blue-50 sm:text-sm"
        >
          Sign in
        </a>
        <a
          href={`${AUTH_URL}/v1/auth/demo`}
          className="rounded-full bg-[#0B57D0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#044dc2] sm:text-sm"
        >
          Demo
        </a>
      </div>
    );
  }

  const { user } = state;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email[0]?.toUpperCase() ?? '?');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B57D0] text-xs font-semibold text-white hover:opacity-90 focus:outline-none sm:h-8 sm:w-8 sm:text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        title={user.name ?? user.email}
      >
        {user.picture ? (
          <Image
            src={user.picture}
            alt={user.name ?? user.email}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-10 right-0 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-gray-200 bg-white py-2 shadow-2xl sm:w-72 dark:border-gray-700 dark:bg-gray-800">
          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B57D0] to-blue-500 text-sm font-bold text-white shadow-xs">
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name ?? user.email}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div className="min-w-0">
              {user.name && (
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {user.name}
                </p>
              )}
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

          {/* Quick Persona Switcher */}
          <div className="px-3 py-1.5">
            <p className="px-2 text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-gray-500">
              Switch Account Persona
            </p>
            <div className="mt-1 space-y-0.5">
              {[
                { key: 'alex', label: 'Alex Morgan', role: 'Product Lead' },
                { key: 'sarah', label: 'Sarah Chen', role: 'Staff Engineer' },
                { key: 'marcus', label: 'Marcus Vance', role: 'Founder & CEO' },
                { key: 'demo', label: 'Demo User', role: 'General' },
              ].map((p) => {
                const isCurrent = user.email?.includes(p.key) || (p.key === 'demo' && user.email?.includes('demo@'));
                return (
                  <a
                    key={p.key}
                    href={`${AUTH_URL}/v1/auth/demo?persona=${p.key}`}
                    className={[
                      'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition',
                      isCurrent
                        ? 'bg-blue-50 font-semibold text-[#0B57D0] dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-750',
                    ].join(' ')}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] text-gray-400">{p.role}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

          {/* Reseed Demo Data */}
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition dark:text-blue-400 dark:hover:bg-blue-950/40"
            onClick={async () => {
              try {
                await fetch(`${API_URL}/v1/auth/reseed`, {
                  method: 'POST',
                  credentials: 'include',
                });
                window.location.reload();
              } catch (e) {
                console.error(e);
              }
            }}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Re-seed events for current week</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                await fetch(`${API_URL}/v1/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });
              } catch {
                // ignore
              }
              window.location.href = '/login';
            }}
          >
            <LogOutIcon size={14} className="text-red-500" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
