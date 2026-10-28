// apps/api/test/reminders.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createE2eApp } from './utils/e2e-app';
import { RemindersService } from '../src/reminders/reminders.service';

describe('Reminders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let reminders: RemindersService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.COOKIE_NAME = process.env.COOKIE_NAME ?? 'access_token';

    app = await createE2eApp();
    prisma = new PrismaClient();
    reminders = app.get(RemindersService);
  });

  beforeEach(async () => {
    await prisma.eventReminderDelivery.deleteMany();
    await prisma.event.deleteMany();
    await prisma.calendar.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('sends a due reminder once, and does not resend it on the next tick', async () => {
    const user = await prisma.user.create({
      data: { email: 'owner@example.com', name: 'Owner' },
    });
    const calendar = await prisma.calendar.create({
      data: { ownerId: user.id, name: 'Default' },
    });

    const now = new Date('2026-07-19T12:00:00.000Z');
    const startAt = new Date('2026-07-19T12:30:00.000Z');
    await prisma.event.create({
      data: {
        calendarId: calendar.id,
        title: 'Due reminder test',
        startAt,
        endAt: new Date('2026-07-19T13:00:00.000Z'),
        allDay: false,
        notifications: [
          { id: 'n1', method: 'email', amount: 30, unit: 'minutes' },
        ],
      },
    });

    await reminders.tick(now);
    const afterFirstTick = await prisma.eventReminderDelivery.findMany();
    expect(afterFirstTick).toHaveLength(1);
    expect(afterFirstTick[0]).toMatchObject({ notificationId: 'n1' });

    await reminders.tick(now);
    const afterSecondTick = await prisma.eventReminderDelivery.findMany();
    expect(afterSecondTick).toHaveLength(1); // no duplicate row/send
  });

  it('does not send a reminder that is not due yet', async () => {
    const user = await prisma.user.create({
      data: { email: 'owner2@example.com', name: 'Owner 2' },
    });
    const calendar = await prisma.calendar.create({
      data: { ownerId: user.id, name: 'Default' },
    });

    const now = new Date('2026-07-19T12:00:00.000Z');
    await prisma.event.create({
      data: {
        calendarId: calendar.id,
        title: 'Not due yet',
        startAt: new Date('2026-07-19T12:30:00.000Z'),
        endAt: new Date('2026-07-19T13:00:00.000Z'),
        allDay: false,
        notifications: [
          { id: 'n2', method: 'email', amount: 5, unit: 'minutes' },
        ],
      },
    });

    await reminders.tick(now);
    expect(await prisma.eventReminderDelivery.findMany()).toHaveLength(0);
  });
});
