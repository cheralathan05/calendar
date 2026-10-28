'use client';

import { useState } from 'react';

type MeResponse =
  | { ok: true; user: { sub: string; email: string; name?: string; googleSub?: string } }
  | { ok?: boolean; user?: unknown };

function isUserWithEmail(user: unknown): user is { email?: string } {
  return !!user && typeof user === 'object' && 'email' in user;
}

const API_URL = '';
const AUTH_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

// temporary widget for testing auth flow
export function AuthWidget() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMe() {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/v1/auth/me`, {
        credentials: 'include',
      });
      const data = await res.json();
      setMe(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load session';
      setError(message);
    }
  }

  async function logout() {
    setError(null);
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setMe(null);
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <a href={`${AUTH_URL}/v1/auth/google/start`}>Sign in with Google</a>

      <button type="button" onClick={loadMe}>
        Who am I?
      </button>

      <button type="button" onClick={logout}>
        Logout
      </button>

      {me?.user && isUserWithEmail(me.user) ? (
        <span style={{ fontSize: 12 }}>{me.user.email ?? 'signed in'}</span>
      ) : null}

      {error ? <span style={{ color: 'crimson', fontSize: 12 }}>{error}</span> : null}
    </div>
  );
}
