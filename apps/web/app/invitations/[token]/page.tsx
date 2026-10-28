'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { rsvpByToken } from '@/lib/api/invitations';

export default function InvitationRsvpPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const token = String(params?.token ?? '');
  const qRsvp = search.get('rsvp') as 'accepted' | 'declined' | 'tentative' | null;

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const doRsvp = useCallback(
    async (choice: 'accepted' | 'declined' | 'tentative') => {
      setStatus('loading');
      setMessage(null);
      try {
        await rsvpByToken(token, choice);
        setStatus('ok');
        setMessage('Thanks — your RSVP has been recorded.');
        setTimeout(() => router.push('/'), 1500);
      } catch (err) {
        console.error('RSVP failed', err);
        setStatus('error');
        setMessage('Unable to record RSVP. The token may be invalid or expired.');
      }
    },
    [token, router],
  );

  useEffect(() => {
    if (qRsvp) {
      // defer to microtask to avoid calling setState synchronously in the effect body
      void Promise.resolve().then(() => doRsvp(qRsvp));
    }
  }, [qRsvp, doRsvp]);

  return (
    <div className="mx-auto max-w-2xl p-4 text-center">
      <h1 className="mb-4 text-xl font-semibold">Event RSVP</h1>
      {status === 'idle' && (
        <div>
          <p className="mb-4">How would you like to respond?</p>
          <div className="flex justify-center gap-3">
            <button className="btn" onClick={() => void doRsvp('accepted')}>
              Accept
            </button>
            <button className="btn" onClick={() => void doRsvp('tentative')}>
              Tentative
            </button>
            <button className="btn btn-ghost" onClick={() => void doRsvp('declined')}>
              Decline
            </button>
          </div>
        </div>
      )}
      {status === 'loading' && <p>Recording your response…</p>}
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
