import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from './useIsMobile';

/**
 * Builds a controllable matchMedia mock — tests can flip `matches`
 * and dispatch a synthetic 'change' event to verify the hook reacts.
 */
function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mq = {
    matches: initialMatches,
    media: '(max-width: 639px)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    }),
    dispatchEvent: vi.fn(),
  };

  const triggerChange = (newMatches: boolean) => {
    mq.matches = newMatches;
    listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
  };

  window.matchMedia = vi.fn().mockReturnValue(mq) as unknown as typeof window.matchMedia;
  return { triggerChange, mq };
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false initially when viewport is wider than breakpoint', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true initially when viewport is narrower than breakpoint', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('reacts to viewport changes via media query listener', () => {
    const { triggerChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      triggerChange(true);
    });

    expect(result.current).toBe(true);
  });

  it('respects custom breakpoint argument', () => {
    const matchMediaSpy = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    window.matchMedia = matchMediaSpy as unknown as typeof window.matchMedia;

    renderHook(() => useIsMobile(768));
    expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 767px)');
  });
});
