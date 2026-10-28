'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { EventFullscreenForm } from '@/components/calendar/events/forms/EventFullscreenForm';
import { EventPageShell } from '@/components/calendar/events/EventPageShell';
import type { GuestInput, RecurrenceScope } from '@/lib/api/events';
import {
  apiEventToCalendarEvent,
  deleteEvent,
  getEvent,
  normalizeGuestsToStrings,
  normalizeRuleOnly,
  updateEvent,
} from '@/lib/api/events';
import { ApiError } from '@/lib/api/client';
import { RecurrenceScopeModal } from '@/components/calendar/events/RecurrenceScopeModal';
import { useToast } from '@/components/ui/Toast';

function getInstanceId(event: CalendarEvent): string | null {
  if (event.id.includes('@')) return event.id;
  if (event.recurringEventId && event.originalStartAt) {
    return `${event.recurringEventId}@${event.originalStartAt}`;
  }
  return null;
}

function getInstanceIdFromRoute(masterId: string, occ: string | null): string | null {
  if (!occ) return null;
  const d = new Date(occ);
  if (Number.isNaN(d.getTime())) return null;
  return `${masterId}@${occ}`;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const id = String(params?.id ?? '');
  const occ = searchParams.get('occ');

  const [ev, setEv] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'save'; payload: CalendarEvent } | { type: 'delete'; payload: CalendarEvent } | null
  >(null);

  useEffect(() => {
    if (!id) return;

    const run = async () => {
      setLoading(true);
      const fetchId = occ ? `${id}@${occ}` : id;

      try {
        const data = await getEvent(fetchId);
        setEv(apiEventToCalendarEvent(data));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else console.error('getEvent failed', err);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [id, occ, router]);

  const handleSave = async (updated: CalendarEvent, scope?: RecurrenceScope) => {
    const isInstance = updated.isRecurringInstance && updated.recurringEventId;
    const masterIdFromRoute = id;
    const instanceId =
      getInstanceId(updated) ?? getInstanceIdFromRoute(masterIdFromRoute, occ) ?? updated.id;
    const targetId =
      isInstance && scope && scope !== 'all'
        ? instanceId
        : isInstance
          ? masterIdFromRoute
          : updated.id;

    try {
      await updateEvent(
        targetId,
        {
          title: updated.title,
          startAt: updated.start,
          endAt: updated.end,
          allDay: updated.allDay,
          startDate: updated.allDay ? (updated.startDate ?? undefined) : undefined,
          endDate: updated.allDay ? (updated.endDate ?? undefined) : undefined,
          description: updated.description ?? '',
          location: updated.location ?? '',
          color: updated.color ?? null,
          recurrenceRule: normalizeRuleOnly(updated.recurrence ?? null),
          guests: normalizeGuestsToStrings(updated.guests as unknown as Array<GuestInput>) ?? [],
          notifications: updated.notifications ?? [],
          visibility: updated.visibility ?? 'default',
          busyStatus: updated.busyStatus ?? 'busy',
          // Meeting-related fields - allow edit page to request generation or provide explicit URL
          addMeeting: updated.addMeeting ?? undefined,
          meetingProvider: updated.meetingProvider ?? undefined,
          meetingUrl: updated.meetingUrl ?? undefined,
          meetingData: updated.meetingData ?? undefined,
        },
        scope,
      );
      showToast('Event updated', 'success');
      router.push('/');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace('/login');
      else console.error('updateEvent failed', err);
      showToast('Failed to update event', 'error');
      return false;
    }
  };

  const handleDelete = async (eventToDelete: CalendarEvent, scope?: RecurrenceScope) => {
    const isInstance = eventToDelete.isRecurringInstance && eventToDelete.recurringEventId;
    const masterIdFromRoute = id;
    const instanceId =
      getInstanceId(eventToDelete) ??
      getInstanceIdFromRoute(masterIdFromRoute, occ) ??
      eventToDelete.id;
    const targetId =
      isInstance && scope && scope !== 'all'
        ? instanceId
        : isInstance
          ? masterIdFromRoute
          : eventToDelete.id;

    try {
      await deleteEvent(String(targetId), scope);
      showToast('Event deleted', 'success');
      router.push('/');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace('/login');
      else console.error('deleteEvent failed', err);
      showToast('Failed to delete event', 'error');
      return false;
    }
  };

  if (loading || !ev) {
    return (
      <EventPageShell title="Edit event">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B57D0] border-t-transparent" />
          Loading event…
        </div>
      </EventPageShell>
    );
  }

  return (
    <EventPageShell title="Edit event">
      <EventFullscreenForm
        key={ev.id}
        event={ev}
        initialDate={new Date(ev.start)}
        onClose={() => router.push('/')}
        onSave={(e) => {
          if (e.isRecurringInstance) {
            setPendingAction({ type: 'save', payload: e });
            setScopeOpen(true);
            return;
          }
          void handleSave(e);
        }}
        onDelete={(eventId) => {
          if (!ev) return;
          if (ev.isRecurringInstance) {
            setPendingAction({ type: 'delete', payload: ev });
            setScopeOpen(true);
            return;
          }
          if (confirm('Delete this event?')) {
            void handleDelete({ ...ev, id: eventId });
          }
        }}
      />

      <RecurrenceScopeModal
        key={`${pendingAction?.payload?.id ?? 'none'}-${pendingAction?.type ?? 'none'}-${scopeOpen ? 'open' : 'closed'}`}
        open={scopeOpen}
        title={
          pendingAction?.type === 'delete' ? 'Delete recurring event' : 'Update recurring event'
        }
        defaultScope="this"
        onCancel={() => {
          setScopeOpen(false);
          setPendingAction(null);
        }}
        onConfirm={(scope) => {
          if (!pendingAction) return;
          if (pendingAction.type === 'save') {
            void handleSave(pendingAction.payload, scope);
          } else {
            void handleDelete(pendingAction.payload, scope);
          }
          setScopeOpen(false);
          setPendingAction(null);
        }}
      />
    </EventPageShell>
  );
}
