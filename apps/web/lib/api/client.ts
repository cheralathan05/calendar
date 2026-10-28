// Empty string → relative URLs → Next.js rewrites proxy /v1/* to the API server,
// keeping cookies first-party on the frontend domain.
export const API_URL = '';

// Direct URL to the API, used only for auth navigation links (demo, Google sign-in).
// These must bypass the Next.js proxy so that OAuth state cookies are scoped to
// the API domain (Render), not the frontend domain (Vercel).
export const AUTH_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// ApiError — thrown by apiFetch on non-2xx responses.
// Carry the HTTP status so callers can branch on 401 vs 4xx vs 5xx.
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// apiFetch — thin fetch wrapper.
// • Always sends credentials (HttpOnly cookie)
// • Throws ApiError on non-2xx — callers use try/catch, not `.ok` checks
// • Returns undefined for 204 No Content responses
// ---------------------------------------------------------------------------
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore JSON parse failure — use statusText
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
