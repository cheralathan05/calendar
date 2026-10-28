// apps/api/test/events.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createE2eApp } from './utils/e2e-app';
import { makeAuthCookie } from './utils/auth-cookie';

describe('Events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let userId: string;
  let calendarId: string;
  let authCookie: string;

  beforeAll(async () => {
    // Ensure these exist for guard/cookie logic during tests
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.COOKIE_NAME = process.env.COOKIE_NAME ?? 'access_token';

    app = await createE2eApp();
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    // Reset DB state for deterministic tests
    await prisma.event.deleteMany();
    await prisma.calendar.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: 'e2e@example.com',
        name: 'E2E User',
        googleSub: 'e2e-google-sub',
      },
    });

    userId = user.id;

    const calendar = await prisma.calendar.create({
      data: {
        ownerId: userId,
        name: 'Default',
        color: '#0B57D0',
      },
    });

    calendarId = calendar.id;
    authCookie = makeAuthCookie({ userId, email: user.email });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /v1/events returns 401 when not authenticated', async () => {
    await request(app.getHttpServer()).get('/v1/events').expect(401);
  });

  it('POST /v1/events returns 401 when not authenticated', async () => {
    await request(app.getHttpServer())
      .post('/v1/events')
      .send({
        title: 'No auth',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60_000).toISOString(),
        allDay: false,
        calendarId,
      })
      .expect(401);
  });

  it('creates, lists, updates, and deletes an event', async () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');

    // CREATE
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'My Event',
        startAt: '2026-01-15T10:00:00.000Z',
        endAt: '2026-01-15T11:00:00.000Z',
        allDay: false,
        description: 'desc',
        location: 'somewhere',
        calendarId,
      })
      .expect(201);

    const created = createRes.body as { id: string; title: string };
    expect(created.id).toBeTruthy();
    expect(created.title).toBe('My Event');

    // LIST
    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((e: any) => e.id === created.id)).toBe(true);

    // UPDATE (PATCH)
    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/events/${created.id}`)
      .set('Cookie', authCookie)
      .send({ title: 'Updated Title' })
      .expect(200);

    expect(patchRes.body.title).toBe('Updated Title');

    // DELETE
    await request(app.getHttpServer())
      .delete(`/v1/events/${created.id}`)
      .set('Cookie', authCookie)
      .expect(200);

    // LIST again => deleted
    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    expect(listAfter.body.some((e: any) => e.id === created.id)).toBe(false);
  });

  it("returns 403 when modifying another user's event", async () => {
    // Create an event owned by user A (the default setup user)
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'User A Event',
        startAt: '2026-01-10T10:00:00.000Z',
        endAt: '2026-01-10T11:00:00.000Z',
        allDay: false,
        calendarId,
      })
      .expect(201);

    const eventId = createRes.body.id as string;

    // Create user B + calendar B
    const userB = await prisma.user.create({
      data: {
        email: 'e2e-b@example.com',
        name: 'E2E User B',
        googleSub: 'e2e-google-sub-b',
      },
    });

    const calendarB = await prisma.calendar.create({
      data: {
        ownerId: userB.id,
        name: 'B Default',
        color: '#188038',
      },
    });

    const cookieB = makeAuthCookie({ userId: userB.id, email: userB.email });

    // User B tries to update User A's event -> 403
    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Cookie', cookieB)
      .send({ title: 'Hacked' })
      .expect(403);

    // User B tries to delete User A's event -> 403
    await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}`)
      .set('Cookie', cookieB)
      .expect(403);

    // (Optional) sanity: User B can create their own event in their calendar
    await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', cookieB)
      .send({
        title: 'User B Event',
        startAt: '2026-01-12T10:00:00.000Z',
        endAt: '2026-01-12T11:00:00.000Z',
        calendarId: calendarB.id,
      })
      .expect(201);
  });

  it('PATCH /v1/events/:id returns 400 when endAt <= startAt', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Test',
        startAt: '2026-01-15T10:00:00.000Z',
        endAt: '2026-01-15T11:00:00.000Z',
        calendarId,
      })
      .expect(201);

    const eventId = createRes.body.id as string;

    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Cookie', authCookie)
      .send({
        startAt: '2026-01-15T12:00:00.000Z',
        endAt: '2026-01-15T11:00:00.000Z',
      })
      .expect(400);
  });

  it('PATCH /v1/events/:id validates partial updates against existing values', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Test',
        startAt: '2026-01-15T10:00:00.000Z',
        endAt: '2026-01-15T11:00:00.000Z',
        calendarId,
      })
      .expect(201);

    const eventId = createRes.body.id as string;

    // Only endAt provided, but it becomes invalid vs existing startAt
    await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Cookie', authCookie)
      .send({
        endAt: '2026-01-15T09:00:00.000Z',
      })
      .expect(400);
  });

  it('PATCH /v1/events/:id can update timeZone', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'TZ Event',
        startAt: '2026-01-15T10:00:00.000Z',
        endAt: '2026-01-15T11:00:00.000Z',
        calendarId,
        timeZone: 'UTC',
      })
      .expect(201);

    const eventId = createRes.body.id as string;

    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/events/${eventId}`)
      .set('Cookie', authCookie)
      .send({ timeZone: 'America/Los_Angeles' })
      .expect(200);

    expect(patchRes.body.timeZone).toBe('America/Los_Angeles');
  });
  it('expands weekly recurrence in GET /v1/events', async () => {
    const from = new Date('2026-02-01T00:00:00.000Z');
    const to = new Date('2026-03-01T00:00:00.000Z');

    // Create a recurring event (weekly Tuesday)
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', [authCookie])
      .send({
        title: 'Weekly Tuesday',
        startAt: '2026-02-03T10:00:00.000Z', // Tue
        endAt: '2026-02-03T11:00:00.000Z',
        allDay: false,
        calendarId,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
        color: '#D93025',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', [authCookie])
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);

    const instances = listRes.body.filter(
      (e: any) => e.recurringEventId === masterId,
    );
    expect(instances.length).toBeGreaterThanOrEqual(3);

    // instance metadata present
    expect(instances[0].isRecurringInstance).toBe(true);
    expect(instances[0].originalStartAt).toBeTruthy();
    expect(instances[0].id).toContain(`${masterId}@`);
  });

  it('PATCH /v1/events/:id edits the recurring series (all events)', async () => {
    const from = new Date('2026-02-01T00:00:00.000Z');
    const to = new Date('2026-03-01T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', [authCookie])
      .send({
        title: 'Weekly Tuesday',
        startAt: '2026-02-03T10:00:00.000Z',
        endAt: '2026-02-03T11:00:00.000Z',
        calendarId,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    await request(app.getHttpServer())
      .patch(`/v1/events/${masterId}`)
      .set('Cookie', [authCookie])
      .send({ title: 'Updated Series Title' })
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', [authCookie])
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const instances = listRes.body.filter(
      (e: any) => e.recurringEventId === masterId,
    );
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(
      instances.every((e: any) => e.title === 'Updated Series Title'),
    ).toBe(true);
  });
  it('PATCH /v1/events/:id can update a single occurrence with scope=this', async () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const to = new Date('2026-03-14T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Daily Standup',
        startAt: '2026-03-10T10:00:00.000Z',
        endAt: '2026-03-10T11:00:00.000Z',
        allDay: false,
        calendarId,
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const occurrences = (listRes.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );
    expect(occurrences.length).toBeGreaterThanOrEqual(3);

    const target = occurrences[0];

    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/events/${encodeURIComponent(target.id)}?scope=this`)
      .set('Cookie', authCookie)
      .send({ title: 'Standup (this only)' })
      .expect(200);

    expect(patchRes.body.title).toBe('Standup (this only)');

    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const afterOccurrences = (listAfter.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );

    const updated = afterOccurrences.find(
      (e) => e.originalStartAt === target.originalStartAt,
    );
    const unchanged = afterOccurrences.find(
      (e) => e.originalStartAt !== target.originalStartAt,
    );

    expect(updated?.title).toBe('Standup (this only)');
    expect(unchanged?.title).toBe('Daily Standup');
  });

  it('DELETE /v1/events/:id can remove a single occurrence with scope=this', async () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const to = new Date('2026-03-14T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Daily Sync',
        startAt: '2026-03-10T10:00:00.000Z',
        endAt: '2026-03-10T11:00:00.000Z',
        allDay: false,
        calendarId,
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const occurrences = (listRes.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );
    expect(occurrences.length).toBeGreaterThanOrEqual(3);

    const target = occurrences[1];

    await request(app.getHttpServer())
      .delete(`/v1/events/${encodeURIComponent(target.id)}?scope=this`)
      .set('Cookie', authCookie)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const afterOccurrences = (listAfter.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );

    const removed = afterOccurrences.find(
      (e) => e.originalStartAt === target.originalStartAt,
    );
    const remaining = afterOccurrences.find(
      (e) => e.originalStartAt !== target.originalStartAt,
    );

    expect(removed).toBeUndefined();
    expect(remaining?.title).toBe('Daily Sync');
  });
  it('PATCH /v1/events/:id updates this and following occurrences with scope=following', async () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const to = new Date('2026-03-16T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Daily Series',
        startAt: '2026-03-10T10:00:00.000Z',
        endAt: '2026-03-10T11:00:00.000Z',
        allDay: false,
        calendarId,
        recurrenceRule: 'FREQ=DAILY;COUNT=5',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const occurrences = (listRes.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );
    expect(occurrences.length).toBeGreaterThanOrEqual(5);

    const target = occurrences[2];

    await request(app.getHttpServer())
      .patch(`/v1/events/${encodeURIComponent(target.id)}?scope=following`)
      .set('Cookie', authCookie)
      .send({ title: 'Daily Series (updated)' })
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const after = listAfter.body as any[];

    const beforeTarget = after.find(
      (e) =>
        e.recurringEventId === masterId &&
        e.originalStartAt === occurrences[0].originalStartAt,
    );
    const fromTarget = after.find(
      (e) =>
        e.title === 'Daily Series (updated)' &&
        e.originalStartAt === target.originalStartAt,
    );

    expect(beforeTarget?.title).toBe('Daily Series');
    expect(fromTarget?.title).toBe('Daily Series (updated)');
  });
  it('DELETE /v1/events/:id removes this and following occurrences with scope=following', async () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    const to = new Date('2026-03-16T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Series To Truncate',
        startAt: '2026-03-10T10:00:00.000Z',
        endAt: '2026-03-10T11:00:00.000Z',
        allDay: false,
        calendarId,
        recurrenceRule: 'FREQ=DAILY;COUNT=5',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const occurrences = (listRes.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );
    expect(occurrences.length).toBeGreaterThanOrEqual(5);

    const target = occurrences[2];

    await request(app.getHttpServer())
      .delete(`/v1/events/${encodeURIComponent(target.id)}?scope=following`)
      .set('Cookie', authCookie)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const after = listAfter.body as any[];

    const beforeTarget = after.find(
      (e) =>
        e.recurringEventId === masterId &&
        e.originalStartAt === occurrences[0].originalStartAt,
    );
    const removedTarget = after.find(
      (e) =>
        e.recurringEventId === masterId &&
        e.originalStartAt === target.originalStartAt,
    );

    expect(beforeTarget?.title).toBe('Series To Truncate');
    expect(removedTarget).toBeUndefined();
  });
  it('PATCH /v1/events/:id updates following occurrences for all-day series with scope=following', async () => {
    const from = new Date('2026-02-10T00:00:00.000Z');
    const to = new Date('2026-02-16T00:00:00.000Z');

    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'All Day Weekdays',
        startAt: '2026-02-10T00:00:00.000Z',
        endAt: '2026-02-11T00:00:00.000Z',
        allDay: true,
        startDate: '2026-02-10',
        endDate: '2026-02-11',
        calendarId,
        recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;COUNT=5',
        timeZone: 'UTC',
        recurrenceTimeZone: 'UTC',
      })
      .expect(201);

    const masterId = createRes.body.id as string;

    const listRes = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const occurrences = (listRes.body as any[]).filter(
      (e) => e.isRecurringInstance && e.recurringEventId === masterId,
    );

    // Debug: if occurrences are fewer than expected, print body so CI log shows what's returned
    if (occurrences.length < 5) {
      if (process.env.DEBUG_RECURRENCE === '1') {
        console.error('All-day occurrences fewer than expected', {
          occurrencesLength: occurrences.length,
          listBody: listRes.body,
        });
      }
    }

    expect(occurrences.length).toBeGreaterThanOrEqual(5);

    const target = occurrences[2];

    await request(app.getHttpServer())
      .patch(`/v1/events/${encodeURIComponent(target.id)}?scope=following`)
      .set('Cookie', authCookie)
      .send({ title: 'All Day Weekdays (updated)' })
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get('/v1/events')
      .set('Cookie', authCookie)
      .query({ from: from.toISOString(), to: to.toISOString() })
      .expect(200);

    const after = listAfter.body as any[];

    const beforeTarget = after.find(
      (e) =>
        e.recurringEventId === masterId &&
        e.originalStartAt === occurrences[0].originalStartAt,
    );
    const fromTarget = after.find(
      (e) =>
        e.title === 'All Day Weekdays (updated)' &&
        e.originalStartAt === target.originalStartAt,
    );

    expect(beforeTarget?.title).toBe('All Day Weekdays');
    expect(fromTarget?.title).toBe('All Day Weekdays (updated)');
  });

  // New: Invitations flow
  it('POST /v1/events/:id/invitations creates invitations and attendees', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Invite Test',
        startAt: '2026-06-01T10:00:00.000Z',
        endAt: '2026-06-01T11:00:00.000Z',
        calendarId,
      })
      .expect(201);

    const eventId = createRes.body.id as string;

    const emails = ['invitee1@example.com', 'invitee2@example.com'];

    const inviteRes = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/invitations`)
      .set('Cookie', authCookie)
      .send({ emails })
      .expect(201);

    expect(Array.isArray(inviteRes.body)).toBe(true);
    expect(inviteRes.body.length).toBe(emails.length);

    for (const row of inviteRes.body) {
      expect(row.email).toBeDefined();
      expect(row.invitationId).toBeDefined();
    }

    // verify DB rows: attendee + invitation
    const att = await prisma.eventAttendee.findUnique({
      where: { eventId_email: { eventId, email: emails[0] } },
    });
    expect(att).not.toBeNull();
    expect(att?.rsvp).toBe('needsAction');

    const inv = await prisma.invitation.findUnique({
      where: { id: inviteRes.body[0].invitationId },
    });
    expect(inv).not.toBeNull();
    expect(inv?.email).toBe(emails[0]);
  });

  it('POST /v1/invitations/:token/rsvp updates attendee rsvp and invitation status', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/v1/events')
      .set('Cookie', authCookie)
      .send({
        title: 'Invite RSVP Test',
        startAt: '2026-06-02T10:00:00.000Z',
        endAt: '2026-06-02T11:00:00.000Z',
        calendarId,
      })
      .expect(201);

    const eventId = createRes.body.id as string;
    const emails = ['rsvp1@example.com'];

    const inviteRes = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/invitations`)
      .set('Cookie', authCookie)
      .send({ emails })
      .expect(201);

    const invitationId = inviteRes.body[0].invitationId as string;
    const invRow = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    expect(invRow).not.toBeNull();
    const token = invRow!.token;

    // RSVP using token
    await request(app.getHttpServer())
      .post(`/v1/invitations/${encodeURIComponent(token)}/rsvp`)
      .send({ rsvp: 'accepted' })
      .expect(200);

    // verify attendee updated
    const att = await prisma.eventAttendee.findUnique({
      where: { eventId_email: { eventId, email: emails[0] } },
    });
    expect(att).not.toBeNull();
    expect(att?.rsvp).toBe('accepted');

    // verify invitation status
    const invAfter = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    expect(invAfter?.status).toBe('delivered');
  });
});
