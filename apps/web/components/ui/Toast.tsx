'use client';

import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────
/** Maximum number of toasts shown at once — older ones dropped silently. */
const MAX_TOASTS = 3;
const TOAST_DURATION_MS = 4000;

// ─── Context ──────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── ToastItem ────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const remainingRef = useRef(TOAST_DURATION_MS);
  const startedAtRef = useRef<number>(0);

  // Pause-on-hover: don't dismiss while user is reading the toast.
  // This is the standard pattern (Sonner, react-hot-toast).
  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => onRemove(toast.id), remainingRef.current);
  }, [toast.id, onRemove]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!pausedRef.current) {
      remainingRef.current -= Date.now() - startedAtRef.current;
      pausedRef.current = true;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    if (pausedRef.current) {
      pausedRef.current = false;
      startTimer();
    }
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const icons = {
    success: <CheckCircleIcon size={18} className="shrink-0 text-green-500" aria-hidden="true" />,
    error: <AlertCircleIcon size={18} className="shrink-0 text-red-500" aria-hidden="true" />,
    info: <InfoIcon size={18} className="shrink-0 text-blue-500" aria-hidden="true" />,
  };

  const borders = {
    success: 'border-l-4 border-green-500',
    error: 'border-l-4 border-red-500',
    info: 'border-l-4 border-blue-500',
  };

  // Error gets role=alert (assertive); success/info use status (polite).
  const role = toast.type === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      className={[
        'flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-4 duration-200',
        'dark:bg-gray-800',
        borders[toast.type],
      ].join(' ')}
    >
      {icons[toast.type]}
      <span className="flex-1 text-sm text-[var(--gcal-text,#3c4043)] dark:text-gray-100">
        {toast.message}
      </span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onRemove(toast.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--gcal-text-muted,#70757a)] hover:bg-[var(--gcal-bg-hover,#f1f3f4)] dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <XIcon size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => {
      // Bounded queue: drop oldest if over MAX_TOASTS.
      // Keeps screen tidy and avoids screen-reader spam.
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/*
        Position: bottom-right on desktop, bottom-center on mobile.
        Bottom-right is the Material/macOS norm; centering on mobile keeps
        toasts out of the thumb zone and survives notches/safe areas.
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[9999] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-80 sm:translate-x-0"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
