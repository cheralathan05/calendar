import { useEffect, useRef } from 'react';

/**
 * Selector for elements that can receive keyboard focus.
 * Mirrors what Radix/Headless UI use — covers links, buttons, form controls,
 * and anything with an explicit tabindex >= 0.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
  );
}

type Options = {
  open: boolean;
  onClose?: () => void;
  /** Container ref to trap focus inside. Required. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Disable scroll on <body> while open. Default: true. */
  lockScroll?: boolean;
  /** Element to return focus to on close. Defaults to whatever was focused
   *  when the modal opened. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Modal a11y essentials in one hook:
 *   1. Focus trap — Tab/Shift+Tab cycle inside containerRef.
 *   2. Initial focus — first focusable element gets focus on open.
 *   3. Escape closes (calls onClose if provided).
 *   4. Body scroll lock while open.
 *   5. Return focus to opener on close.
 *
 * Why a custom hook instead of react-focus-lock?
 *   - One file, no extra dependency in bundle.
 *   - Easier to audit for big-tech review (every line is in your repo).
 *   - WAI-ARIA Authoring Practices "Dialog" pattern compliant.
 */
export function useModalA11y({
  open,
  onClose,
  containerRef,
  lockScroll = true,
  returnFocusRef,
}: Options) {
  // Capture the element that had focus when the modal opened, so we can
  // restore focus on close (a11y requirement: focus must not be lost).
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember opener
    openerRef.current = returnFocusRef?.current ?? (document.activeElement as HTMLElement | null);

    // Move focus into the modal — defer one tick so the modal is in the DOM.
    const focusTimer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = getFocusable(container);
      const target = focusables[0] ?? container;
      target.focus();
    }, 0);

    // Body scroll lock — measure scrollbar so layout doesn't jump
    let originalOverflow = '';
    let originalPaddingRight = '';
    if (lockScroll) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // Trap: cycle Tab focus inside the container
      const container = containerRef.current;
      if (!container) return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
      // Return focus to opener
      const opener = openerRef.current;
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [open, onClose, containerRef, lockScroll, returnFocusRef]);
}
