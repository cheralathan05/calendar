import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('RemindersService', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  const dueEvent = {
    id: 'evt_1',
    title: 'Team sync',
    location: null,
    startAt: new Date('2026-07-19T12:30:00.000Z'),
    endAt: new Date('2026-07-19T13:00:00.000Z'),
    notifications: [{ id: 'n1', method: 'email', amount: 30, unit: 'minutes' }],
    calendar: { owner: { email: 'owner@example.com' } },
  };

  let service: RemindersService;
  let prisma: {
    event: { findMany: jest.Mock };
    eventReminderDelivery: { create: jest.Mock; deleteMany: jest.Mock };
  };
  let mailer: { sendReminder: jest.Mock };

  beforeEach(async () => {
    prisma = {
      event: { findMany: jest.fn().mockResolvedValue([dueEvent]) },
      eventReminderDelivery: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    };
    mailer = { sendReminder: jest.fn().mockResolvedValue(true) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile();

    service = moduleRef.get(RemindersService);
  });

  it('sends the due reminder and records delivery', async () => {
    await service.tick(now);
    expect(mailer.sendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt_1' }),
      'owner@example.com',
      dueEvent.notifications[0],
    );
    expect(prisma.eventReminderDelivery.create).toHaveBeenCalledWith({
      data: { eventId: 'evt_1', notificationId: 'n1' },
    });
  });

  it('skips sending when the delivery is already claimed (duplicate tick)', async () => {
    prisma.eventReminderDelivery.create.mockRejectedValueOnce(
      uniqueConstraintError(),
    );
    await service.tick(now);
    expect(mailer.sendReminder).not.toHaveBeenCalled();
  });

  it('releases the claim when sending fails, so it can retry later', async () => {
    mailer.sendReminder.mockResolvedValueOnce(false);
    await service.tick(now);
    expect(prisma.eventReminderDelivery.deleteMany).toHaveBeenCalledWith({
      where: { eventId: 'evt_1', notificationId: 'n1' },
    });
  });
});
