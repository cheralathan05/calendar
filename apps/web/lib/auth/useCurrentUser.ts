'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CurrentUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'unauthenticated' };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches the current user from /v1/auth/me.
 * Returns a discriminated union so consumers can branch on status.
 */
export function useCurrentUser(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ ok: boolean; user: CurrentUser }>('/v1/auth/me')
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'authenticated', user: data.user });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 401 = not logged in — expected, not an error
        if (err instanceof ApiError && err.status === 401) {
          setState({ status: 'unauthenticated' });
        } else {
          // Network error, 5xx, etc. — treat as unauthenticated to avoid hanging
          setState({ status: 'unauthenticated' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
