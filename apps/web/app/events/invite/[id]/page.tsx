'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { sendInvitations } from '@/lib/api/invitations';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.id ?? '');

  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setMessage(null);
    const list = emails
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await sendInvitations(eventId, { emails: list });
      setMessage('Invitations sent');
      setEmails('');
      setTimeout(() => router.push(`/events/${eventId}`), 800);
    } catch (err) {
      if (err instanceof ApiError) setMessage(`Error: ${err.status}`);
      else setMessage('Error sending invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-2 text-xl font-semibold">Invite people</h1>
      <textarea
        className="w-full rounded border p-2"
        rows={6}
        placeholder="Enter emails, separated by commas or newlines"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSend}
          disabled={loading || !emails.trim()}
          className="rounded bg-[#0B57D0] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send Invitations'}
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
      {message && <div className="mt-3 text-sm">{message}</div>}
    </div>
  );
}
