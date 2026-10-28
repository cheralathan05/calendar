# Calendar Event Reminder Notifications — Design

**Date:** 2026-07-19
**Branch (planned):** `feat/calendar-notifications`
**Goal:** Actually deliver the per-event reminders users already configure in the UI. The `Event.notifications` field and the reminder picker in `EventFullscreenForm.tsx` exist today, but nothing reads that data back out — reminders are silently saved and never delivered.

## Context

`apps/api/prisma/schema.prisma`'s `Event` model has a `notifications: Json?` field, and the web app already lets users attach reminders when creating/editing an event (`apps/web/components/calendar/events/forms/EventFullscreenForm.tsx`). The shape, from `apps/web/types/global.d.ts`:

```ts
type NotificationItem = {
  id: string;
  method: string; // 'notification' | 'email'
  amount: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  anchor?: 'start' | 'end';
};
```

No backend code consumes this field. There is no cron/queue infrastructure in `apps/api` today (no `@nestjs/schedule`, no Redis, no BullMQ). `MailerService` (`apps/api/src/mailer/mailer.service.ts`) already sends transactional email (event invitations) via a Brevo API → SMTP → Postmark fallback chain, and can be reused for reminder email.

## Scope decisions (why v1 is narrower than Google Calendar)

Google Calendar sends reminders to every guest (each with their own reminder prefs) via email and in-app/push, including recurring events. This app's data model doesn't support that yet — `notifications` is a single field on `Event`, not a per-attendee preference, so "send to all guests" today would really mean "force every invited email onto the organizer's reminder schedule," which isn't the same semantic and deserves its own data-model decision later. In-app notification requires real-time delivery infrastructure (WebSocket/SSE/polling) that doesn't exist yet. Recurring events require per-occurrence delivery tracking on top of the existing `recurrenceRule`/`EventRecurrenceException` machinery.

Bundling all of that into one change makes failures hard to localize — if something breaks, it won't be clear whether the bug is in the cron logic, the recurrence expansion, or the per-attendee fan-out. So v1 ships the narrowest complete slice, and the rest is sequenced as follow-on phases (Section B).

## Section A: v1 — Email reminders, non-recurring events, organizer only

### A1. Data model

New table to track delivered reminders (prevents duplicate sends across cron ticks, restarts, or overlapping runs):

```prisma
model EventReminderDelivery {
  id             String   @id @default(cuid())
  eventId        String
  notificationId String   // NotificationItem.id from Event.notifications
  sentAt         DateTime @default(now())
  event          Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, notificationId])
}
```

Add the inverse relation on `Event` (`reminderDeliveries EventReminderDelivery[]`). Migration via `prisma migrate dev`.

### A2. New module: `apps/api/src/reminders/`

- `reminders.module.ts` — imports `ScheduleModule` (registered once via `ScheduleModule.forRoot()` in `AppModule`), provides `RemindersService`.
- `reminders.service.ts` — one `@Cron(CronExpression.EVERY_MINUTE)` method, `tick()`.

### A3. Tick logic

```
1. Query candidate events:
   WHERE recurrenceRule IS NULL
     AND notifications IS NOT NULL
     AND startAt >= now
   (No upper bound on startAt: the reminder-amount input in
   EventFullscreenForm.tsx accepts up to 40320 of whatever unit is
   selected — including "weeks" — so a fixed lookahead window could
   silently miss a legitimately-configured far-future reminder. Event
   volume in this app is small enough that scanning all future events
   is cheap; revisit with a bounded window only if this table grows
   large enough to matter.)

2. For each candidate event, for each item in notifications[] where method === 'email':
     dueAt = (item.anchor === 'end' ? event.endAt : event.startAt) - item.amount (item.unit)
     if dueAt <= now → candidate for sending

3. For each due (event, notificationItem) pair:
     try: INSERT INTO EventReminderDelivery (eventId, notificationId)
       - unique constraint violation → already sent, skip
       - insert succeeds → send email via MailerService.sendReminder(event, ownerEmail, item)
         - send fails → do NOT roll back the delivery-tracking row's absence;
           i.e. only insert the tracking row AFTER a successful send, so a
           failed send is retried on the next tick instead of being
           permanently marked as delivered
```

Recipient is always `event.calendar.owner.email` (the `Calendar.owner` relation) — no attendee fan-out in v1.

Editing an event's time or its `notifications` array requires no reschedule logic: the next tick simply reads current state. Deleting an event removes it from the query and cascades to `EventReminderDelivery` automatically. This is the main complexity win over a pre-scheduled-job approach (e.g. BullMQ) — nothing needs to be actively rescheduled or cancelled.

### A4. Mailer changes

Add `MailerService.sendReminder(event, toEmail, notification)`, reusing the existing Brevo → SMTP → Postmark fallback chain already proven out by `sendInvitation`. Simpler content than the invitation email: event title/time/location, no RSVP links.

### A5. Error handling

- A failed send (mailer returns `false` or throws) is logged and left un-tracked in `EventReminderDelivery`, so it's retried on the next tick — bounded naturally because `dueAt <= now` stays true until the event starts.
- One event/notification failing to send must not abort the batch — wrap each send in its own try/catch inside the tick loop.

### A6. Testing

- Unit test the pure "compute due reminders" function (`event + now → due NotificationItem[]`) — no DB or cron involved, covers `anchor: 'start'` vs `'end'`, unit conversion, and boundary (`dueAt === now`).
- Integration test `RemindersService.tick()` against a test DB: seed an event with a due reminder, run tick, assert one email sent and one `EventReminderDelivery` row created; run tick again, assert no second email (dedup works).

## Section B: Deferred phases (not in v1, sequenced for later)

Each of these is its own future brainstorm/spec — do not start until Section A is merged and verified sending real reminder emails in production.

1. **Phase 2 — Recurring events.** Expand `recurrenceRule` (respecting `EventRecurrenceException`) to compute per-occurrence `dueAt`, and key `EventReminderDelivery` on `(eventId, notificationId, occurrenceStartAt)` instead of just `(eventId, notificationId)`.
2. **Phase 3 — Guests/attendees.** Requires a data-model decision first: do attendees get the organizer's reminder schedule broadcast to them, or does each `EventAttendee` need its own reminder preference? Resolve that question before implementing.
3. **Phase 4 — In-app (`method: 'notification'`) delivery.** Needs a real-time delivery mechanism (WebSocket, SSE, or short-interval polling) that doesn't exist in the app today — a meaningfully larger infrastructure addition than email.

Recommended sequencing: A (this spec) → verify in production → B1 → B2 → B3.
