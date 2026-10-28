'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'calendar-theme';

// ---------------------------------------------------------------------------
// Pure helpers — safe to call on server (guard typeof window)
// ---------------------------------------------------------------------------

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system';
}

function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = mode === 'system' ? getSystemPreference() : mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the app theme (light / dark / system).
 * - SSR-safe: state initialises to 'system' to match the layout.tsx inline script default.
 * - After first paint, syncs to the value stored in localStorage.
 * - Listens to OS preference changes when mode is 'system'.
 */
export function useTheme() {
  // Start with 'system' to match the inline script in layout.tsx (which also
  // defaults to system-based detection). This prevents a hydration mismatch.
  const [theme, setThemeState] = useState<ThemeMode>('system');

  // After first paint: read the real stored value and apply it
  useEffect(() => {
    const stored = readStoredTheme();
    applyTheme(stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external store (localStorage) into React on mount
    if (stored !== 'system') setThemeState(stored);
  }, []);

  // Re-apply when OS preference changes (only relevant when mode is 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (readStoredTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // useCallback: stable reference so consumers don't re-render unnecessarily
  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setThemeState(mode);
    applyTheme(mode);
  }, []);

  return { theme, setTheme };
}
