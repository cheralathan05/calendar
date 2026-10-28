import { apiFetch } from './client';

export function sendInvitations(eventId: string, payload: { emails: string[] }) {
  return apiFetch(`/v1/events/${encodeURIComponent(eventId)}/invitations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function rsvpByToken(token: string, rsvp: 'accepted' | 'declined' | 'tentative') {
  return apiFetch(`/v1/invitations/${encodeURIComponent(token)}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ rsvp }),
  });
}
