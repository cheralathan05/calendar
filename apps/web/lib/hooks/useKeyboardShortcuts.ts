'use client';

import { useEffect } from 'react';

type ShortcutHandlers = {
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChangeView: (v: CalendarView) => void;
  onNewEvent: () => void;
  onToggleCommandPalette?: () => void;
  onToggleShortcutsHelp?: () => void;
};

/**
 * Global keyboard shortcuts matching Google Calendar:
 *   t          → Today
 *   d          → Day view
 *   w          → Week view
 *   m          → Month view
 *   y          → Year view
 *   a / s      → Schedule (Agenda) view
 *   p / k / ←  → Previous period
 *   n / j / →  → Next period
 *   c          → Create new event
 *   ?          → Keyboard shortcuts cheat sheet
 *   Ctrl/Cmd+K → Command Palette
 *   /          → Search events
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const {
    onToday,
    onPrev,
    onNext,
    onChangeView,
    onNewEvent,
    onToggleCommandPalette,
    onToggleShortcutsHelp,
  } = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Allow Cmd/Ctrl + K from anywhere even if inside inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggleCommandPalette?.();
        return;
      }

      // Skip if focus is inside an input / textarea / select / contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle ? for shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleShortcutsHelp?.();
        return;
      }

      // Handle / for search / command palette
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleCommandPalette?.();
        return;
      }

      // Skip other modifier key combos
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 't':
          e.preventDefault();
          onToday();
          break;
        case 'd':
        case '1':
          e.preventDefault();
          onChangeView('day');
          break;
        case 'w':
        case '2':
          e.preventDefault();
          onChangeView('week');
          break;
        case 'm':
        case '3':
          e.preventDefault();
          onChangeView('month');
          break;
        case 'y':
        case '4':
          e.preventDefault();
          onChangeView('year');
          break;
        case 'a':
        case 's':
        case '5':
          e.preventDefault();
          onChangeView('schedule');
          break;
        case 'p':
        case 'k':
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          break;
        case 'n':
        case 'j':
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case 'c':
          e.preventDefault();
          onNewEvent();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    onToday,
    onPrev,
    onNext,
    onChangeView,
    onNewEvent,
    onToggleCommandPalette,
    onToggleShortcutsHelp,
  ]);
}
