/**
 * Vitest setup — extends `expect` with @testing-library/jest-dom matchers,
 * cleans up the DOM after every test, and stubs browser APIs that jsdom
 * doesn't ship (matchMedia is the most common one — needed by useIsMobile,
 * useTheme, etc).
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// matchMedia: jsdom doesn't implement it; useIsMobile / useTheme rely on it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // legacy
    removeListener: vi.fn(), // legacy
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver: not in jsdom; some Radix-style components use it.
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// scrollTo: jsdom logs a "Not implemented" error for window.scrollTo.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
