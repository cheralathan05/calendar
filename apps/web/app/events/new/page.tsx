import { Suspense } from 'react';
import NewEventClient from './NewEventClient';
import { EventPageShell } from '@/components/calendar/events/EventPageShell';

export default function NewEventPage() {
  return (
    <EventPageShell title="New event">
      <Suspense fallback={null}>
        <NewEventClient />
      </Suspense>
    </EventPageShell>
  );
}
