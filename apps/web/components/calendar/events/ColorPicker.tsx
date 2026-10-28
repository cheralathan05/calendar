'use client';

import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { PALETTE as DEFAULT_PALETTE } from '@/constants';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

type Props = {
  value?: string;
  onChange: (hex: string) => void;
  palette?: string[];
  ariaLabel?: string;
};

export default function ColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  ariaLabel = 'Select event color',
}: Props) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties | undefined>(undefined);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  // compute popup position when open
  useEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const W = 90;

    const left = rect.left;
    const top = rect.bottom;

    setPopupStyle({
      position: 'fixed',
      left: Math.round(left),
      top: Math.round(top),
      width: W,
      zIndex: 60,
    });
  }, [open]);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onDown(e: MouseEvent) {
      const panel = panelRef.current;
      const btn = btnRef.current;
      if (!panel || !btn) return;
      if (e.target instanceof Node && !panel.contains(e.target) && !btn.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // keyboard nav for grid (basic)
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button[data-swatch]'));

    function onKey(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const idx = buttons.findIndex((b) => b === active);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        buttons[(idx + 1) % buttons.length]?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        buttons[(idx - 1 + buttons.length) % buttons.length]?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        buttons[(idx + 3) % buttons.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        buttons[(idx - 3 + buttons.length) % buttons.length]?.focus();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = (hex: string) => {
    onChange(hex);
    setOpen(false);
    // return focus to button after selecting
    btnRef.current?.focus();
  };

  const selected = (value ?? '').toLowerCase();

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-md bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        <span
          aria-hidden
          className="inline-block h-5 w-5 shrink-0 rounded-full"
          style={{ backgroundColor: selected }}
        />
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <div ref={panelRef} style={popupStyle} role="menu" aria-label="Color palette">
          <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:shadow-black/20 dark:ring-white/10">
            <div className="grid grid-cols-2 gap-3">
              {palette.map((hex) => {
                const isSelected = selected === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    data-swatch
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    aria-label={`Color ${hex}`}
                    onClick={() => handleSelect(hex)}
                    className={`relative flex h-5 w-5 items-center justify-center rounded-full focus:ring-2 focus:outline-none ${
                      isSelected ? 'ring-2 ring-[#0B57D0] ring-offset-2' : 'ring-0'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
