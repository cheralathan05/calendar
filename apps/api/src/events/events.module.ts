import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { EventsController, InvitationsController } from './events.controller';
import { EventsService } from './events.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, CalendarsModule, MailerModule],
  controllers: [EventsController, InvitationsController],
  providers: [EventsService],
})
export class EventsModule {}
