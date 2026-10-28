import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiFetch, ApiError } from '@/lib/api/client';
import { useCurrentUser } from './useCurrentUser';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiFetch: vi.fn() };
});

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useCurrentUser', () => {
  it('starts in loading state synchronously before any fetch completes', () => {
    // Never resolves — keeps the hook in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.status).toBe('loading');
  });

  it('transitions to authenticated when /v1/auth/me returns a user', async () => {
    const user = { sub: 'user-1', email: 'test@example.com', name: 'Test User' };
    mockFetch.mockResolvedValue({ ok: true, user });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    if (result.current.status === 'authenticated') {
      expect(result.current.user.email).toBe('test@example.com');
      expect(result.current.user.sub).toBe('user-1');
    }
  });

  it('transitions to unauthenticated when API returns 401', async () => {
    mockFetch.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
  });

  it('falls back to unauthenticated on any non-401 error (network failure, 5xx)', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
  });
});
