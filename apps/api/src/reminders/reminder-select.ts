import { Prisma } from '@prisma/client';

/** Fields RemindersService needs per candidate event, including the owner's email. */
export const REMINDER_CANDIDATE_SELECT = {
  id: true,
  title: true,
  location: true,
  startAt: true,
  endAt: true,
  notifications: true,
  calendar: { select: { owner: { select: { email: true } } } },
} satisfies Prisma.EventSelect;

export type ReminderCandidateEvent = Prisma.EventGetPayload<{
  select: typeof REMINDER_CANDIDATE_SELECT;
}>;
