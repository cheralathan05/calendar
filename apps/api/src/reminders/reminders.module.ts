import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [PrismaModule, MailerModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
