import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { computeDueReminders, NotificationItem } from './due-reminders';
import {
  REMINDER_CANDIDATE_SELECT,
  ReminderCandidateEvent,
} from './reminder-select';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(now: Date = new Date()): Promise<void> {
    const candidates = await this.prisma.event.findMany({
      where: { recurrenceRule: null, startAt: { gte: now } },
      select: REMINDER_CANDIDATE_SELECT,
    });

    for (const event of candidates) {
      const due = computeDueReminders(event, now);
      for (const item of due) {
        await this.sendOne(event, item);
      }
    }
  }

  private async sendOne(
    event: ReminderCandidateEvent,
    item: NotificationItem,
  ): Promise<void> {
    // Claim the delivery slot first: the unique constraint on
    // (eventId, notificationId) makes this safe if a tick somehow overlaps
    // with another, and it lets us tell "already sent" apart from "new".
    try {
      await this.prisma.eventReminderDelivery.create({
        data: { eventId: event.id, notificationId: item.id },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return; // already sent (or claimed by a concurrent tick)
      }
      this.logger.error(
        `Failed to claim reminder delivery for event ${event.id}: ${String(err)}`,
      );
      return;
    }

    let sent = false;
    try {
      sent = await this.mailer.sendReminder(
        event,
        event.calendar.owner.email,
        item,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Reminder send threw for event ${event.id}: ${String(err)}`,
      );
    }

    if (!sent) {
      // Release the claim so the next tick retries this reminder.
      await this.prisma.eventReminderDelivery.deleteMany({
        where: { eventId: event.id, notificationId: item.id },
      });
    }
  }
}
