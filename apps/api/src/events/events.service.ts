import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDays, addMilliseconds } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';

import { CalendarsService } from '../calendars/calendars.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  stripUntil,
  withoutCount,
  withUntil,
  withUntilFloating,
} from './rrule-until';

import {
  EVENT_SELECT,
  EventInstance,
  EXCEPTION_SELECT,
  ExceptionRow,
} from './event-select';
import {
  dateOnlyFromInstantInTz,
  ensureEndAfterStartDateExclusive,
  naiveFromDateColumn,
  parseDateOnly,
} from './recurrence/date-utils';
import { normalizeRuleOnly } from './recurrence/rule';
import { parseInstanceId } from './recurrence/instance-id';
import { applyExceptionToInstance } from './recurrence/exceptions';
import { expandRecurringMaster, masterToInstance } from './recurrence/expand';
import type { RecurrenceScope } from './recurrence/scope';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendars: CalendarsService,
    private readonly mailer: MailerService,
  ) {}

  // Helper: compute a lighter/transparent color from a hex input.
  // Returns an rgba() string when hex is provided, otherwise undefined.
  private computeLighterColor(hex?: string | null, alpha = 0.6) {
    if (!hex) return undefined;
    // accept #RRGGBB or RRGGBB
    const m = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(m)) return undefined;
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────

  async listForUser(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<EventInstance[]> {
    const events = await this.prisma.event.findMany({
      where: {
        calendar: { ownerId: userId },
        OR: [
          { recurrenceRule: { not: null } },
          { AND: [{ endAt: { gt: from } }, { startAt: { lt: to } }] },
        ],
      },
      orderBy: { startAt: 'asc' },
      select: EVENT_SELECT,
    });

    const recurringIds = events
      .filter((ev) => !!ev.recurrenceRule)
      .map((ev) => ev.id);

    const exceptions: ExceptionRow[] = recurringIds.length
      ? await this.prisma.eventRecurrenceException.findMany({
          where: {
            eventId: { in: recurringIds },
            originalStartAt: { gte: from, lt: to },
          },
          select: EXCEPTION_SELECT,
        })
      : [];

    const exceptionMap = new Map<string, ExceptionRow>();
    for (const ex of exceptions) {
      exceptionMap.set(`${ex.eventId}|${ex.originalStartAt.toISOString()}`, ex);
    }

    const out: EventInstance[] = [];
    for (const ev of events) {
      if (!ev.recurrenceRule) {
        out.push(masterToInstance(ev));
      } else {
        out.push(...expandRecurringMaster(ev, from, to, exceptionMap));
      }
    }

    out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return out;
  }

  async searchForUser(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<EventInstance[]> {
    if (!query.trim()) return [];
    const events = await this.prisma.event.findMany({
      where: {
        calendar: { ownerId: userId },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { startAt: 'desc' },
      take: limit,
      select: EVENT_SELECT,
    });
    return events.map(masterToInstance);
  }

  async getForUser(userId: string, eventId: string): Promise<EventInstance> {
    const inst = parseInstanceId(eventId);

    // Case 1: master id
    if (!inst) {
      const ev = await this.prisma.event.findFirst({
        where: { id: eventId, calendar: { ownerId: userId } },
        select: EVENT_SELECT,
      });
      if (!ev) throw new NotFoundException('Event not found');
      return masterToInstance(ev);
    }

    // Case 2: instance id
    const master = await this.prisma.event.findFirst({
      where: { id: inst.masterId, calendar: { ownerId: userId } },
      select: EVENT_SELECT,
    });
    if (!master || !master.recurrenceRule)
      throw new NotFoundException('Event not found');

    const tz = master.recurrenceTimeZone ?? master.timeZone ?? 'UTC';
    const durationMs = master.endAt.getTime() - master.startAt.getTime();
    const occStartUtc = inst.originalStartAt;
    const occEndUtc = new Date(occStartUtc.getTime() + durationMs);

    const occStartDateCol = master.allDay
      ? dateOnlyFromInstantInTz(occStartUtc, tz)
      : null;
    const occEndDateCol = master.allDay
      ? addDays(
          occStartDateCol!,
          Math.max(1, Math.round(durationMs / 86_400_000)),
        )
      : null;

    const base: EventInstance = {
      ...master,
      id: eventId,
      startAt: occStartUtc,
      endAt: occEndUtc,
      startDate: occStartDateCol,
      endDate: occEndDateCol,
      recurringEventId: master.id,
      originalStartAt: occStartUtc.toISOString(),
      isRecurringInstance: true,
    };

    const ex = await this.prisma.eventRecurrenceException.findUnique({
      where: {
        eventId_originalStartAt: {
          eventId: master.id,
          originalStartAt: inst.originalStartAt,
        },
      },
      select: EXCEPTION_SELECT,
    });
    if (!ex) return base;

    const applied = applyExceptionToInstance(base, ex, tz);
    if (!applied) throw new NotFoundException('Event not found');
    return applied;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────

  async createForUser(userId: string, dto: CreateEventDto) {
    const allDay = dto.allDay ?? false;
    const startAtInput = new Date(dto.startAt);
    const endAtInput = new Date(dto.endAt);

    if (
      Number.isNaN(startAtInput.getTime()) ||
      Number.isNaN(endAtInput.getTime())
    ) {
      throw new BadRequestException('Invalid startAt/endAt');
    }
    if (endAtInput <= startAtInput) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const calendarId =
      dto.calendarId ?? (await this.calendars.ensureDefaultCalendar(userId)).id;

    const cal = await this.prisma.calendar.findFirst({
      where: { id: calendarId, ownerId: userId },
      select: { id: true },
    });
    if (!cal) throw new BadRequestException('Invalid calendarId');

    const recurrenceRule = normalizeRuleOnly(dto.recurrenceRule);
    const recurrenceTimeZone =
      dto.recurrenceTimeZone ?? dto.timeZone ?? undefined;
    const tz = recurrenceTimeZone ?? dto.timeZone ?? 'UTC';

    let startDateCol: Date | null = null;
    let endDateCol: Date | null = null;

    if (allDay) {
      if (dto.startDate) startDateCol = parseDateOnly(dto.startDate);
      if (dto.endDate) endDateCol = parseDateOnly(dto.endDate);
      if (!startDateCol)
        startDateCol = dateOnlyFromInstantInTz(startAtInput, tz);
      endDateCol = ensureEndAfterStartDateExclusive(
        startDateCol,
        endDateCol ?? dateOnlyFromInstantInTz(endAtInput, tz),
      );
    }

    const normalizedStartAt = allDay
      ? fromZonedTime(naiveFromDateColumn(startDateCol!), tz)
      : startAtInput;
    const normalizedEndAt = allDay
      ? fromZonedTime(naiveFromDateColumn(endDateCol!), tz)
      : endAtInput;

    const created = await this.prisma.event.create({
      data: {
        calendarId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        allDay,
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
        startDate: allDay ? startDateCol! : null,
        endDate: allDay ? endDateCol! : null,
        timeZone: dto.timeZone,
        color: dto.color,
        recurrenceRule,
        recurrenceTimeZone,
        guests: (dto.guests ?? undefined) as Prisma.InputJsonValue | undefined,
        notifications: (dto.notifications ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        visibility: dto.visibility,
        busyStatus: dto.busyStatus,
      },
      select: EVENT_SELECT,
    });

    // If client requested a meeting (or supplied meetingProvider 'jitsi'), generate a Jitsi URL and persist it.
    try {
      await this._maybeGenerateAndPersistMeeting(userId, created.id, dto);
    } catch (meetErr) {
      // Non-fatal; log and continue returning created event. Frontend can refresh to see meeting.
      console.error('Failed to generate meeting for event', meetErr);
    }

    // If the creator supplied a list of guests at event creation, ensure
    // attendees + invitations are created. Do not fail the event creation
    // if invitation sending fails (non-fatal). This re-uses createInvitations
    // which will upsert attendees and attempt to send email.
    if (Array.isArray(dto.guests) && dto.guests.length > 0) {
      try {
        // dto.guests is string[] of emails
        // Attach invitations on behalf of the current user (owner)
        await this.createInvitations(userId, created.id, dto.guests);
      } catch (inviteErr) {
        // Non-fatal; surface to logs for debugging

        console.error(
          'createForUser: failed to create/send invitations',
          inviteErr,
        );
      }
    }

    // Re-fetch the event with meeting fields included and return
    const refreshed = await this.prisma.event.findUnique({
      where: { id: created.id },
      select: EVENT_SELECT,
    });
    return refreshed;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE / DELETE  (logic unchanged — just trimmed and shares helpers)
  // ─────────────────────────────────────────────────────────────────────

  async updateForUser(
    userId: string,
    eventId: string,
    dto: UpdateEventDto,
    scope: RecurrenceScope = 'all',
  ) {
    const inst = parseInstanceId(eventId);
    const masterId = inst?.masterId ?? eventId;

    const existing = await this.prisma.event.findFirst({
      // Fetch by id first, then check ownership so we can return 403 when the
      // event exists but belongs to another user (tests expect Forbidden).
      // Using findUnique keeps the query simple and avoids leaking existence.
      where: { id: masterId },
      select: { ...EVENT_SELECT, calendar: { select: { ownerId: true } } },
    });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.calendar?.ownerId !== userId)
      throw new ForbiddenException('Forbidden');

    if ((scope === 'this' || scope === 'following') && !inst) {
      throw new BadRequestException('scope requires instance id');
    }
    if (
      (scope === 'this' || scope === 'following') &&
      !existing.recurrenceRule
    ) {
      throw new BadRequestException('scope requires recurring event');
    }

    if (scope === 'this')
      return this.updateThisOccurrence(existing, inst!, dto, eventId, userId);
    if (scope === 'following')
      return this.updateFollowing(existing, inst!, dto);
    return this.updateAll(existing, inst, dto);
  }

  // ── private helpers extracted from your existing branches ─────────────

  private async updateThisOccurrence(
    existing: Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>,
    inst: { masterId: string; originalStartAt: Date },
    dto: UpdateEventDto,
    eventId: string,
    userId: string,
  ) {
    const tz = existing.recurrenceTimeZone ?? existing.timeZone ?? 'UTC';
    const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
    const occStartUtc = inst.originalStartAt;
    const occEndUtc = new Date(occStartUtc.getTime() + durationMs);

    const baseStartDate = existing.allDay
      ? dateOnlyFromInstantInTz(occStartUtc, tz)
      : null;
    const baseDurationDays = existing.allDay
      ? Math.max(
          1,
          Math.round(
            ((
              existing.endDate ?? dateOnlyFromInstantInTz(existing.endAt, tz)
            ).getTime() -
              (
                existing.startDate ??
                dateOnlyFromInstantInTz(existing.startAt, tz)
              ).getTime()) /
              86_400_000,
          ),
        )
      : 0;
    const baseEndDate = existing.allDay
      ? addDays(baseStartDate!, baseDurationDays)
      : null;

    const nextAllDay = dto.allDay ?? existing.allDay;
    const parsedStartAt =
      dto.startAt !== undefined ? new Date(dto.startAt) : undefined;
    const parsedEndAt =
      dto.endAt !== undefined ? new Date(dto.endAt) : undefined;
    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime()))
      throw new BadRequestException('Invalid startAt');
    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime()))
      throw new BadRequestException('Invalid endAt');

    const nextStartAtInput = parsedStartAt ?? occStartUtc;
    const nextEndAtInput = parsedEndAt ?? occEndUtc;
    if (nextEndAtInput <= nextStartAtInput)
      throw new BadRequestException('endAt must be after startAt');

    const nextTimeZone = dto.timeZone ?? existing.timeZone ?? undefined;
    const nextRecurrenceTimeZone =
      dto.recurrenceTimeZone !== undefined
        ? dto.recurrenceTimeZone
        : dto.timeZone !== undefined
          ? dto.timeZone
          : (existing.recurrenceTimeZone ?? undefined);
    const tzForNormalize = nextRecurrenceTimeZone ?? nextTimeZone ?? 'UTC';

    let nextStartDateCol = baseStartDate;
    let nextEndDateCol = baseEndDate;

    if (nextAllDay) {
      if (dto.startDate !== undefined)
        nextStartDateCol = dto.startDate ? parseDateOnly(dto.startDate) : null;
      if (dto.endDate !== undefined)
        nextEndDateCol = dto.endDate ? parseDateOnly(dto.endDate) : null;
      if (!nextStartDateCol)
        nextStartDateCol = dateOnlyFromInstantInTz(
          nextStartAtInput,
          tzForNormalize,
        );
      nextEndDateCol = ensureEndAfterStartDateExclusive(
        nextStartDateCol,
        nextEndDateCol ??
          dateOnlyFromInstantInTz(nextEndAtInput, tzForNormalize),
      );
    } else {
      nextStartDateCol = null;
      nextEndDateCol = null;
    }

    const normalizedStartAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextStartDateCol!), tzForNormalize)
      : nextStartAtInput;
    const normalizedEndAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextEndDateCol!), tzForNormalize)
      : nextEndAtInput;

    const hasTimeChange =
      dto.startAt !== undefined ||
      dto.endAt !== undefined ||
      dto.allDay !== undefined ||
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.timeZone !== undefined ||
      dto.recurrenceTimeZone !== undefined;

    const exceptionData: Record<string, unknown> = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.color !== undefined ? { color: dto.color } : {}),
      ...(dto.guests !== undefined ? { guests: dto.guests } : {}),
      ...(dto.notifications !== undefined
        ? { notifications: dto.notifications }
        : {}),
      ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      ...(dto.busyStatus !== undefined ? { busyStatus: dto.busyStatus } : {}),
      ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
      ...(dto.allDay !== undefined ? { allDay: nextAllDay } : {}),
    };
    if (hasTimeChange) {
      Object.assign(exceptionData, {
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
        ...(nextAllDay
          ? { startDate: nextStartDateCol, endDate: nextEndDateCol }
          : {}),
      });
    }

    // Meeting support for single-occurrence exceptions: if client requested
    // a meeting for this occurrence (or supplied meeting fields) persist them
    // in the exception row so the occurrence materializes with meeting info.
    const wantsMeetingForException =
      !!dto.addMeeting || dto.meetingProvider === 'jitsi' || !!dto.meetingUrl;
    if (wantsMeetingForException) {
      if (dto.meetingUrl) {
        Object.assign(exceptionData, {
          meetingProvider: dto.meetingProvider ?? 'jitsi',
          meetingUrl: dto.meetingUrl,
          meetingData: dto.meetingData as Prisma.InputJsonValue | undefined,
        });
      } else {
        // Generate a Jitsi room for the exception occurrence
        const room = `event-${randomUUID()}`;
        const url = `https://meet.jit.si/${room}`;
        Object.assign(exceptionData, {
          meetingProvider: 'jitsi',
          meetingUrl: url,
          meetingData: { room } as Prisma.InputJsonValue,
        });
      }
    }

    await this.prisma.eventRecurrenceException.upsert({
      where: {
        eventId_originalStartAt: {
          eventId: inst.masterId,
          originalStartAt: inst.originalStartAt,
        },
      },
      create: {
        event: { connect: { id: inst.masterId } },
        originalStartAt: inst.originalStartAt,
        cancelled: false,
        ...exceptionData,
      },
      update: { cancelled: false, ...exceptionData },
    });

    return this.getForUser(userId, eventId);
  }

  private async updateFollowing(
    existing: Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }> & {
      calendar?: { ownerId?: string | null } | null;
    },
    inst: { masterId: string; originalStartAt: Date },
    dto: UpdateEventDto,
  ) {
    const tz = existing.recurrenceTimeZone ?? existing.timeZone ?? 'UTC';
    const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
    const occStartUtc = inst.originalStartAt;
    const occEndUtc = new Date(occStartUtc.getTime() + durationMs);
    const occStartLocal = toZonedTime(occStartUtc, tz);
    const occStartLocalMidnight = new Date(
      occStartLocal.getFullYear(),
      occStartLocal.getMonth(),
      occStartLocal.getDate(),
      0,
      0,
      0,
      0,
    );

    const baseStartDate = existing.allDay
      ? dateOnlyFromInstantInTz(occStartUtc, tz)
      : null;
    const baseDurationDays = existing.allDay
      ? Math.max(
          1,
          Math.round(
            ((
              existing.endDate ?? dateOnlyFromInstantInTz(existing.endAt, tz)
            ).getTime() -
              (
                existing.startDate ??
                dateOnlyFromInstantInTz(existing.startAt, tz)
              ).getTime()) /
              86_400_000,
          ),
        )
      : 0;
    const baseEndDate = existing.allDay
      ? addDays(baseStartDate!, baseDurationDays)
      : null;

    const nextAllDay = dto.allDay ?? existing.allDay;
    const parsedStartAt =
      dto.startAt !== undefined ? new Date(dto.startAt) : undefined;
    const parsedEndAt =
      dto.endAt !== undefined ? new Date(dto.endAt) : undefined;
    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime()))
      throw new BadRequestException('Invalid startAt');
    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime()))
      throw new BadRequestException('Invalid endAt');

    const nextStartAtInput = parsedStartAt ?? occStartUtc;
    const nextEndAtInput = parsedEndAt ?? occEndUtc;
    if (nextEndAtInput <= nextStartAtInput)
      throw new BadRequestException('endAt must be after startAt');

    const nextRecurrenceRule =
      dto.recurrenceRule !== undefined && dto.recurrenceRule !== null
        ? normalizeRuleOnly(dto.recurrenceRule ?? '')
        : stripUntil(existing.recurrenceRule ?? '');

    const nextTimeZone = dto.timeZone ?? existing.timeZone ?? undefined;
    const nextRecurrenceTimeZone =
      dto.recurrenceTimeZone !== undefined
        ? dto.recurrenceTimeZone
        : dto.timeZone !== undefined
          ? dto.timeZone
          : (existing.recurrenceTimeZone ?? undefined);
    const tzForNormalize = nextRecurrenceTimeZone ?? nextTimeZone ?? 'UTC';

    let nextStartDateCol = baseStartDate;
    let nextEndDateCol = baseEndDate;
    if (nextAllDay) {
      if (dto.startDate !== undefined)
        nextStartDateCol = dto.startDate ? parseDateOnly(dto.startDate) : null;
      if (dto.endDate !== undefined)
        nextEndDateCol = dto.endDate ? parseDateOnly(dto.endDate) : null;
      if (!nextStartDateCol)
        nextStartDateCol = dateOnlyFromInstantInTz(
          nextStartAtInput,
          tzForNormalize,
        );
      nextEndDateCol = ensureEndAfterStartDateExclusive(
        nextStartDateCol,
        nextEndDateCol ??
          dateOnlyFromInstantInTz(nextEndAtInput, tzForNormalize),
      );
    } else {
      nextStartDateCol = null;
      nextEndDateCol = null;
    }

    if (nextAllDay && (!nextStartDateCol || !nextEndDateCol)) {
      throw new BadRequestException(
        'startDate and endDate are required for all-day events',
      );
    }
    const normalizedStartAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextStartDateCol!), tzForNormalize)
      : nextStartAtInput;
    const normalizedEndAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextEndDateCol!), tzForNormalize)
      : nextEndAtInput;
    if (!existing.recurrenceRule) {
      throw new BadRequestException('recurrenceRule is required');
    }

    // Prepare truncated rule for the master (remove COUNT first so UNTIL truncates).
    const baseRule = withoutCount(existing.recurrenceRule);
    const truncatedRule = existing.allDay
      ? withUntilFloating(baseRule, addMilliseconds(occStartLocalMidnight, -1))
      : withUntil(baseRule, addMilliseconds(occStartUtc, -1));

    await this.prisma.event.update({
      where: { id: existing.id },
      data: { recurrenceRule: truncatedRule },
    });

    const created = await this.prisma.event.create({
      data: {
        calendarId: existing.calendarId,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        location: dto.location ?? existing.location,
        allDay: nextAllDay,
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
        startDate: nextAllDay ? nextStartDateCol! : null,
        endDate: nextAllDay ? nextEndDateCol! : null,
        timeZone: nextTimeZone,
        color: dto.color ?? existing.color,
        recurrenceRule: nextRecurrenceRule,
        recurrenceTimeZone: nextRecurrenceTimeZone,
        guests: (dto.guests ??
          existing.guests ??
          undefined) as Prisma.InputJsonValue,
        notifications: (dto.notifications ??
          existing.notifications ??
          undefined) as Prisma.InputJsonValue,
        visibility: dto.visibility ?? existing.visibility ?? undefined,
        busyStatus: dto.busyStatus ?? existing.busyStatus ?? undefined,
      },
      select: EVENT_SELECT,
    });

    // Possibly generate meeting for the newly created following instance
    try {
      // existing.calendar may be undefined in some code paths; re-fetch ownerId to be safe
      const calRow = await this.prisma.calendar.findUnique({
        where: { id: existing.calendarId },
        select: { ownerId: true },
      });
      const ownerId = calRow?.ownerId ?? '';
      await this._maybeGenerateAndPersistMeeting(ownerId, created.id, dto);
    } catch (err: unknown) {
      console.error('Failed to generate meeting for following instance', err);
    }

    // Re-fetch to include any meeting fields that may have been persisted
    const refreshed = await this.prisma.event.findUnique({
      where: { id: created.id },
      select: EVENT_SELECT,
    });
    return refreshed ?? created;
  }

  private updateAll(
    existing: Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>,
    inst: { masterId: string; originalStartAt: Date } | null,
    dto: UpdateEventDto,
  ) {
    const nextAllDay = dto.allDay ?? existing.allDay;
    const parsedStartAt =
      dto.startAt !== undefined ? new Date(dto.startAt) : undefined;
    const parsedEndAt =
      dto.endAt !== undefined ? new Date(dto.endAt) : undefined;
    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime()))
      throw new BadRequestException('Invalid startAt');
    if (parsedEndAt && Number.isNaN(parsedEndAt.getTime()))
      throw new BadRequestException('Invalid endAt');

    const nextRecurrenceRule =
      dto.recurrenceRule !== undefined && dto.recurrenceRule !== null
        ? normalizeRuleOnly(dto.recurrenceRule ?? '')
        : undefined;

    const nextTimeZone = dto.timeZone ?? existing.timeZone ?? undefined;
    const nextRecurrenceTimeZone =
      dto.recurrenceTimeZone !== undefined
        ? dto.recurrenceTimeZone
        : dto.timeZone !== undefined
          ? dto.timeZone
          : (existing.recurrenceTimeZone ?? undefined);
    const tz = nextRecurrenceTimeZone ?? nextTimeZone ?? 'UTC';

    const isInstanceScopeAll = !!inst;

    const setUtcTime = (base: Date, src: Date) =>
      new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth(),
          base.getUTCDate(),
          src.getUTCHours(),
          src.getUTCMinutes(),
          src.getUTCSeconds(),
          src.getUTCMilliseconds(),
        ),
      );

    const nextStartAtInput = isInstanceScopeAll
      ? parsedStartAt
        ? setUtcTime(existing.startAt, parsedStartAt)
        : existing.startAt
      : (parsedStartAt ?? existing.startAt);
    const nextEndAtInput = isInstanceScopeAll
      ? parsedEndAt
        ? setUtcTime(existing.endAt, parsedEndAt)
        : existing.endAt
      : (parsedEndAt ?? existing.endAt);

    // Validate that end is after start for the all-scope update path.
    if (nextEndAtInput <= nextStartAtInput)
      throw new BadRequestException('endAt must be after startAt');

    let nextStartDateCol = existing.startDate;
    let nextEndDateCol = existing.endDate;
    if (nextAllDay) {
      const effectiveStartDate = isInstanceScopeAll ? undefined : dto.startDate;
      const effectiveEndDate = isInstanceScopeAll ? undefined : dto.endDate;
      if (effectiveStartDate !== undefined)
        nextStartDateCol = effectiveStartDate
          ? parseDateOnly(effectiveStartDate)
          : null;
      if (effectiveEndDate !== undefined)
        nextEndDateCol = effectiveEndDate
          ? parseDateOnly(effectiveEndDate)
          : null;
      if (!nextStartDateCol)
        nextStartDateCol = dateOnlyFromInstantInTz(nextStartAtInput, tz);
      nextEndDateCol = ensureEndAfterStartDateExclusive(
        nextStartDateCol,
        nextEndDateCol ?? dateOnlyFromInstantInTz(nextEndAtInput, tz),
      );
    } else {
      nextStartDateCol = null;
      nextEndDateCol = null;
    }

    if (nextAllDay && (!nextStartDateCol || !nextEndDateCol)) {
      throw new BadRequestException(
        'startDate and endDate are required for all-day events',
      );
    }
    const normalizedStartAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextStartDateCol!), tz)
      : nextStartAtInput;
    const normalizedEndAt = nextAllDay
      ? fromZonedTime(naiveFromDateColumn(nextEndDateCol!), tz)
      : nextEndAtInput;

    const updatePromise = this.prisma.event.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.guests !== undefined
          ? { guests: dto.guests as Prisma.InputJsonValue }
          : {}),
        ...(dto.notifications !== undefined
          ? { notifications: dto.notifications as Prisma.InputJsonValue }
          : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.busyStatus !== undefined ? { busyStatus: dto.busyStatus } : {}),
        ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
        ...(dto.recurrenceTimeZone !== undefined
          ? { recurrenceTimeZone: dto.recurrenceTimeZone }
          : dto.timeZone !== undefined
            ? { recurrenceTimeZone: dto.timeZone }
            : {}),
        ...(nextRecurrenceRule !== undefined
          ? { recurrenceRule: nextRecurrenceRule }
          : {}),
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
        startDate: nextStartDateCol,
        endDate: nextEndDateCol,
      },
      select: EVENT_SELECT,
    });

    // After update completes, possibly generate meeting if requested. We return the updated event promise but also chain meeting generation side-effect.
    return (async () => {
      const updated = await updatePromise;
      try {
        // existing.calendar.ownerId isn't available here; re-fetch owner for permission checks
        const cal = await this.prisma.calendar.findUnique({
          where: { id: existing.calendarId },
          select: { ownerId: true },
        });
        await this._maybeGenerateAndPersistMeeting(
          cal?.ownerId ?? '',
          updated.id,
          dto,
        );
      } catch (err) {
        console.error('Failed to generate meeting for updated event', err);
      }

      // Re-fetch updated event so any meeting fields are included in the response
      const refreshed = await this.prisma.event.findUnique({
        where: { id: updated.id },
        select: EVENT_SELECT,
      });
      return refreshed ?? updated;
    })();
  }

  // Helper: generate a Jitsi meeting URL and persist to the event if requested by DTO
  private async _maybeGenerateAndPersistMeeting(
    userId: string,
    eventId: string,
    dto: CreateEventDto | UpdateEventDto,
  ) {
    // Determine whether the client requested meeting creation or supplied a provider
    const wantsMeeting =
      !!dto.addMeeting || dto.meetingProvider === 'jitsi' || !!dto.meetingUrl;
    if (!wantsMeeting) return;

    // Fetch event with minimal fields to check existing meetingUrl and calendar owner
    const ev = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        meetingUrl: true,
        calendar: { select: { ownerId: true } },
      },
    });
    if (!ev) throw new NotFoundException('Event not found');

    // Enforce that only owner or attendees can create/regenerate meetings for private events
    // (Callers of this helper should have already enforced owner for create; here we defensively check)
    const calOwnerId = ev.calendar?.ownerId ?? null;
    if (calOwnerId && userId !== calOwnerId) {
      // Check if user is an attendee with permission to modify
      const attendee = await this.prisma.eventAttendee.findUnique({
        where: { eventId_email: { eventId, email: userId } },
        select: { id: true },
      });
      if (!attendee) throw new ForbiddenException('Forbidden');
    }

    // Idempotent: if meetingUrl already exists and DTO didn't explicitly provide a meetingUrl or request regeneration, do nothing
    const explicitUrlProvided = !!dto.meetingUrl;
    const requestedRegenerate = dto.regenerateMeeting === true;
    if (ev.meetingUrl && !explicitUrlProvided && !requestedRegenerate) return;

    // If client provided a meetingUrl, persist it directly
    if (explicitUrlProvided) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          meetingProvider: dto.meetingProvider ?? 'jitsi',
          meetingUrl: dto.meetingUrl,
          meetingData: dto.meetingData as Prisma.InputJsonValue | undefined,
        },
      });
      return;
    }

    // Generate a Jitsi room and URL: use event-{uuid}
    const room = `event-${randomUUID()}`;
    const url = `https://meet.jit.si/${room}`;

    const meetingData = { room };

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        meetingProvider: 'jitsi',
        meetingUrl: url,
        meetingData: meetingData as Prisma.InputJsonValue,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────

  async deleteForUser(
    userId: string,
    eventId: string,
    scope: RecurrenceScope = 'all',
  ) {
    const inst = parseInstanceId(eventId);
    const masterId = inst?.masterId ?? eventId;

    const existing = await this.prisma.event.findFirst({
      // Fetch by id and include calendar owner so we can enforce 403 when
      // an event exists but belongs to another user.
      where: { id: masterId },
      select: {
        id: true,
        recurrenceRule: true,
        timeZone: true,
        recurrenceTimeZone: true,
        allDay: true,
        calendar: { select: { ownerId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.calendar?.ownerId !== userId)
      throw new ForbiddenException('Forbidden');

    if ((scope === 'this' || scope === 'following') && !inst)
      throw new BadRequestException('scope requires instance id');
    if ((scope === 'this' || scope === 'following') && !existing.recurrenceRule)
      throw new BadRequestException('scope requires recurring event');

    if (scope === 'this') {
      await this.prisma.eventRecurrenceException.upsert({
        where: {
          eventId_originalStartAt: {
            eventId: masterId,
            originalStartAt: inst!.originalStartAt,
          },
        },
        create: {
          event: { connect: { id: masterId } },
          originalStartAt: inst!.originalStartAt,
          cancelled: true,
        },
        update: { cancelled: true },
      });
      return { ok: true };
    }

    if (scope === 'following') {
      const tz = existing.recurrenceTimeZone ?? existing.timeZone ?? 'UTC';
      // Re-fetch the full master row (we need fields used by expansion).
      const masterFull = await this.prisma.event.findUnique({
        where: { id: masterId },
        select: EVENT_SELECT,
      });
      if (!masterFull) throw new NotFoundException('Event not found');

      // Build exception map from any existing exceptions for this master.
      const exRows = await this.prisma.eventRecurrenceException.findMany({
        where: { eventId: masterId },
        select: EXCEPTION_SELECT,
      });
      const exceptionMap = new Map<string, (typeof exRows)[0]>();
      for (const ex of exRows) {
        exceptionMap.set(
          `${ex.eventId}|${ex.originalStartAt.toISOString()}`,
          ex,
        );
      }

      // Ensure the exact target instance is canceled (defensive — handle off-by-1s/parsing issues).
      await this.prisma.eventRecurrenceException.upsert({
        where: {
          eventId_originalStartAt: {
            eventId: masterId,
            originalStartAt: inst!.originalStartAt,
          },
        },
        create: {
          event: { connect: { id: masterId } },
          originalStartAt: inst!.originalStartAt,
          cancelled: true,
        },
        update: { cancelled: true },
      });

      if (!existing.recurrenceRule) {
        throw new BadRequestException('recurrenceRule is required');
      }
      const occStartLocal = toZonedTime(inst!.originalStartAt, tz);
      const occStartLocalMidnight = new Date(
        occStartLocal.getFullYear(),
        occStartLocal.getMonth(),
        occStartLocal.getDate(),
        0,
        0,
        0,
        0,
      );
      const baseRule = withoutCount(existing.recurrenceRule);
      const truncatedRule = existing.allDay
        ? withUntilFloating(
            baseRule,
            addMilliseconds(occStartLocalMidnight, -1),
          )
        : withUntil(baseRule, addMilliseconds(inst!.originalStartAt, -1));
      await this.prisma.event.update({
        where: { id: masterId },
        data: { recurrenceRule: truncatedRule },
      });
      return { ok: true };
    }

    await this.prisma.event.delete({ where: { id: masterId } });
    return { ok: true };
  }

  // Kept for callers that import this from the old module path.
  // (You can delete once nothing imports it.)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _unused_keepForReExports(_: ExceptionRow) {}

  // Re-export for backward compat if anything imports it from this file:
  static normalizeRuleOnly = normalizeRuleOnly;

  // INVITATIONS: create invitations and send emails (stubbed)
  async createInvitations(
    userId: string,
    eventId: string,
    emails: Array<string | { email: string; permissions?: unknown }>,
    expiresDays = 7,
  ) {
    // Ensure event exists and user is owner
    const ev = await this.prisma.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        calendar: {
          select: {
            ownerId: true,
            owner: { select: { email: true, name: true } },
          },
        },
        title: true,
        description: true,
        location: true,
        startAt: true,
        endAt: true,
        allDay: true,
        startDate: true,
        endDate: true,
        timeZone: true,
        color: true,
        visibility: true,
        busyStatus: true,
        // include meeting fields so invitation copies can carry the join link
        meetingProvider: true,
        meetingUrl: true,
        meetingData: true,
      },
    });
    if (!ev) throw new NotFoundException('Event not found');
    if (ev.calendar?.ownerId !== userId)
      throw new ForbiddenException('Forbidden');

    type GuestInput =
      | string
      | { email: string; permissions?: Prisma.InputJsonValue };
    const results: { email: string; invitationId?: string; error?: string }[] =
      [];
    for (const raw of emails as GuestInput[]) {
      // allow either string email or { email, permissions }
      const email = typeof raw === 'string' ? raw : raw.email;
      const permissions = typeof raw === 'string' ? undefined : raw.permissions;
      try {
        const token = randomBytes(24).toString('hex');
        const expiresAt = new Date(
          Date.now() + expiresDays * 24 * 60 * 60 * 1000,
        );
        const created = await this.prisma.invitation.create({
          data: {
            event: { connect: { id: eventId } },
            email,
            token,
            expiresAt,
          },
        });
        // ensure attendee row exists (persist permissions if provided)
        const createData: Prisma.EventAttendeeCreateInput = {
          event: { connect: { id: eventId } },
          email,
          rsvp: 'needsAction',
          permissions: permissions,
        } as Prisma.EventAttendeeCreateInput;
        const updateData: Prisma.EventAttendeeUpdateInput = {
          rsvp: 'needsAction',
          permissions: permissions,
        } as Prisma.EventAttendeeUpdateInput;
        await this.prisma.eventAttendee.upsert({
          where: { eventId_email: { eventId, email } },
          create: createData,
          update: updateData,
        });

        // Build a meeting-request ICS so mail clients recognize this as an invite
        const uid = `${ev.id}-${token}`;
        const dtStamp =
          new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        const dtStart =
          ev.startAt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        const dtEnd =
          ev.endAt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        // Organizer: prefer calendar owner email, fall back to MAIL_FROM env
        let organizerEmail =
          ev.calendar?.owner?.email ?? process.env.MAIL_FROM ?? undefined;
        const organizerCN = ev.calendar?.owner?.name ?? undefined;
        if (organizerEmail && organizerEmail.includes('<')) {
          const m = organizerEmail.match(/<([^>]+)>/);
          if (m) organizerEmail = m[1];
        }
        const organizerLine = organizerEmail
          ? organizerCN
            ? `ORGANIZER;CN=${organizerCN}:mailto:${organizerEmail}`
            : `ORGANIZER:mailto:${organizerEmail}`
          : null;
        const attendeeLine = `ATTENDEE;RSVP=TRUE:mailto:${email}`;

        const icsLines = [
          'BEGIN:VCALENDAR',
          'METHOD:REQUEST',
          'VERSION:2.0',
          'PRODID:-//calendar-clone//EN',
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtStamp}`,
          `SUMMARY:${(ev.title ?? 'Event').replace(/\r?\n/g, ' ')}`,
          ev.description
            ? `DESCRIPTION:${String(ev.description).replace(/\r?\n/g, '\\n')}`
            : null,
          ev.location ? `LOCATION:${String(ev.location)}` : null,
          organizerLine,
          attendeeLine,
          'SEQUENCE:0',
          'STATUS:CONFIRMED',
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          'END:VEVENT',
          'END:VCALENDAR',
        ]
          .filter(Boolean)
          .join('\r\n');

        // send invitation email (mailer returns boolean success)
        const sent = await this.mailer.sendInvitation(
          {
            id: ev.id,
            title: ev.title,
            startAt: ev.startAt,
            endAt: ev.endAt,
            location: ev.location,
            description: ev.description,
          },
          email,
          token,
          icsLines,
        );

        // record send result on invitation row so callers/CI can inspect
        try {
          if (sent) {
            await this.prisma.invitation.update({
              where: { id: created.id },
              data: { sentAt: new Date(), status: 'sent' },
            });
          } else {
            await this.prisma.invitation.update({
              where: { id: created.id },
              data: { status: 'bounced' },
            });
          }
        } catch (updateErr) {
          // Non-fatal: we tried to persist delivery status but don't fail the whole flow

          console.error('Failed to update invitation send status', updateErr);
        }

        // Also create a copy of the event in the recipient's default calendar
        // (if they're a registered user). Attach invitation metadata in the
        // event.guests field so the frontend can detect recipient copies and
        // apply special visuals (lighter background / stripes / strikethrough).
        try {
          const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true },
          });
          if (user) {
            const cal = await this.calendars.ensureDefaultCalendar(user.id);
            // avoid creating obvious duplicates: same title + same startAt
            const exists = await this.prisma.event.findFirst({
              where: {
                calendarId: cal.id,
                title: ev.title,
                startAt: ev.startAt,
              },
              select: { id: true },
            });
            if (!exists) {
              // compute lighter color background for UI (frontend expects a
              // lighter background color). Store it in guests.invitationMeta so
              // the web client can detect recipient copies.
              const lighter = this.computeLighterColor(ev.color ?? undefined);
              // We'll store an object in guests to indicate invitation metadata
              type InvitationMeta = {
                invitedEmail?: string;
                permissions?: Prisma.InputJsonValue | undefined;
                lighterColor?: string | null;
                rsvp?: string | undefined;
              };
              const invitationMeta: InvitationMeta = {
                invitedEmail: email,
                permissions,
                lighterColor: lighter,
              };
              const createdCopy = await this.prisma.event.create({
                data: {
                  calendarId: cal.id,
                  title: ev.title,
                  description: ev.description,
                  location: ev.location,
                  allDay: ev.allDay,
                  startAt: ev.startAt,
                  endAt: ev.endAt,
                  startDate: ev.startDate ?? null,
                  endDate: ev.endDate ?? null,
                  timeZone: ev.timeZone ?? undefined,
                  // keep original color for border/stripe, store lighter in guests metadata for UI
                  color: ev.color ?? undefined,
                  visibility: ev.visibility ?? undefined,
                  busyStatus: ev.busyStatus ?? undefined,
                  // copy meeting fields so recipient copies also expose the join link
                  meetingProvider: ev.meetingProvider ?? undefined,
                  meetingUrl: ev.meetingUrl ?? undefined,
                  meetingData: ev.meetingData ?? undefined,
                  // store invitation metadata so UI can show lighter bg/stripe
                  guests: invitationMeta as Prisma.InputJsonValue,
                },
                select: { id: true },
              });

              // create attendee for the new event and mark needsAction
              await this.prisma.eventAttendee.create({
                data: {
                  event: { connect: { id: createdCopy.id } },
                  email,
                  rsvp: 'needsAction',
                },
              });
            }
          }
        } catch (copyErr) {
          console.error(
            'Failed to create recipient calendar copy for invitation',
            copyErr,
          );
        }
        // Record successful result for this email
        results.push({ email, invitationId: created.id });
      } catch (err: unknown) {
        const msg =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : JSON.stringify(err);
        results.push({ email, error: msg });
      }
    }
    return results;
  }

  // Return ICS content for an invitation token
  async getIcsForToken(token: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        email: true,
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startAt: true,
            endAt: true,
          },
        },
      },
    });
    if (!inv || !inv.event) throw new NotFoundException('Invitation not found');

    const ev = inv.event;
    const uid = `${ev.id}-${inv.token}`;
    const dtStamp =
      new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const dtStart =
      ev.startAt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const dtEnd =
      ev.endAt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

    // Organizer: prefer MAIL_FROM or fall back to calendar owner (if available via join)
    const rawMailFrom = process.env.MAIL_FROM ?? undefined;
    let organizerEmail: string | undefined = undefined;
    let organizerCN: string | undefined = undefined;
    if (rawMailFrom) {
      const m = rawMailFrom.match(/<([^>]+)>/);
      if (m) organizerEmail = m[1];
      else if (rawMailFrom.includes('@')) organizerEmail = rawMailFrom;
      const nameMatch = rawMailFrom.match(/^(.*?)\s*</);
      if (nameMatch && nameMatch[1].trim()) organizerCN = nameMatch[1].trim();
    }

    const organizerLine = organizerEmail
      ? organizerCN
        ? `ORGANIZER;CN=${organizerCN}:mailto:${organizerEmail}`
        : `ORGANIZER:mailto:${organizerEmail}`
      : null;

    const attendeeLine = `ATTENDEE;RSVP=TRUE:mailto:${inv.email}`;

    const icsLines = [
      'BEGIN:VCALENDAR',
      'METHOD:REQUEST',
      'VERSION:2.0',
      'PRODID:-//calendar-clone//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${(ev.title ?? 'Event').replace(/\r?\n/g, ' ')}`,
      ev.description
        ? `DESCRIPTION:${String(ev.description).replace(/\r?\n/g, '\\n')}`
        : null,
      ev.location ? `LOCATION:${String(ev.location)}` : null,
      organizerLine,
      attendeeLine,
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
    return icsLines;
  }

  async rsvpByToken(
    token: string,
    rsvp: 'accepted' | 'declined' | 'tentative',
  ) {
    const inv = await this.prisma.invitation.findUnique({
      where: { token },
      select: { id: true, eventId: true, email: true, expiresAt: true },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation expired');
    }

    // update attendee
    const updateResult = await this.prisma.eventAttendee.updateMany({
      where: { eventId: inv.eventId, email: inv.email },
      data: { rsvp },
    });
    // Also update any attendee rows in recipient copies (events in the
    // recipient's own calendar) so their local copy reflects the RSVP.
    try {
      const masterEv = await this.prisma.event.findUnique({
        where: { id: inv.eventId },
        select: {
          title: true,
          startAt: true,
          endAt: true,
          id: true,
          color: true,
        },
      });
      if (masterEv) {
        // find candidate copies in recipient calendars (match by owner email + same title + startAt)
        const copies = await this.prisma.event.findMany({
          where: {
            title: masterEv.title,
            startAt: masterEv.startAt,
            calendar: { owner: { email: inv.email } },
          },
          select: { id: true, guests: true },
        });

        // Update attendee rows for those copies (if any) so the recipient's
        // local copy has its attendee row updated to the chosen RSVP.
        try {
          const copyIds = copies.map((c) => c.id).filter(Boolean);
          if (copyIds.length > 0) {
            await this.prisma.eventAttendee.updateMany({
              where: { eventId: { in: copyIds }, email: inv.email },
              data: { rsvp },
            });
          }
        } catch (innerUpdate) {
          console.error(
            'Failed to update attendee rows on recipient copies',
            innerUpdate,
          );
        }

        for (const c of copies) {
          try {
            const existingRaw = c.guests as unknown;
            const lighter = this.computeLighterColor(
              masterEv.color ?? undefined,
            );
            const base: Record<string, unknown> =
              existingRaw && typeof existingRaw === 'object'
                ? { ...(existingRaw as Record<string, unknown>) }
                : {};
            if (!('lighterColor' in base) && lighter)
              base['lighterColor'] = lighter;
            base['rsvp'] = rsvp;
            base['invitedEmail'] =
              (base['invitedEmail'] as string | undefined) ?? inv.email;
            const nextMeta: Record<string, unknown> = base;
            await this.prisma.event.update({
              where: { id: c.id },
              data: { guests: nextMeta as Prisma.InputJsonValue },
            });
          } catch (inner) {
            console.error(
              'Failed to write RSVP into recipient copy guests JSON',
              inner,
            );
          }
        }
      }
    } catch (e) {
      console.error(
        'Failed to update recipient copies guests JSON for RSVP',
        e,
      );
    }

    // If attendee accepted and the recipient is a registered user, create an
    // event copy in their default calendar so it appears in their calendar UI.
    if (rsvp === 'accepted') {
      try {
        const ev = await this.prisma.event.findUnique({
          where: { id: inv.eventId },
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startAt: true,
            endAt: true,
            allDay: true,
            startDate: true,
            endDate: true,
            timeZone: true,
            color: true,
            visibility: true,
            busyStatus: true,
            // include meeting fields so accepted recipients receive the join link on their copy
            meetingProvider: true,
            meetingUrl: true,
            meetingData: true,
          },
        });
        if (ev) {
          const user = await this.prisma.user.findUnique({
            where: { email: inv.email },
            select: { id: true, email: true },
          });
          if (user) {
            const cal = await this.calendars.ensureDefaultCalendar(user.id);
            // avoid creating obvious duplicates: same title + same startAt
            const exists = await this.prisma.event.findFirst({
              where: {
                calendarId: cal.id,
                title: ev.title,
                startAt: ev.startAt,
              },
              select: { id: true },
            });
            if (!exists) {
              const lighter = this.computeLighterColor(ev.color ?? undefined);
              type InvitationMeta2 = {
                invitedEmail?: string;
                lighterColor?: string | null;
                rsvp?: string | undefined;
              };
              const invitationMeta: InvitationMeta2 = {
                invitedEmail: inv.email,
                lighterColor: lighter,
              };
              const created = await this.prisma.event.create({
                data: {
                  calendarId: cal.id,
                  title: ev.title,
                  description: ev.description,
                  location: ev.location,
                  allDay: ev.allDay,
                  startAt: ev.startAt,
                  endAt: ev.endAt,
                  startDate: ev.startDate ?? null,
                  endDate: ev.endDate ?? null,
                  timeZone: ev.timeZone ?? undefined,
                  color: ev.color ?? undefined,
                  visibility: ev.visibility ?? undefined,
                  busyStatus: ev.busyStatus ?? undefined,
                  // copy meeting fields so accepted recipients also see the join link
                  meetingProvider: ev.meetingProvider ?? undefined,
                  meetingUrl: ev.meetingUrl ?? undefined,
                  meetingData: ev.meetingData ?? undefined,
                  // store invitation metadata so UI can show lighter bg/stripe
                  guests: invitationMeta as Prisma.InputJsonValue,
                },
                select: { id: true },
              });

              // create attendee for the new event and mark accepted
              await this.prisma.eventAttendee.create({
                data: {
                  event: { connect: { id: created.id } },
                  email: inv.email,
                  rsvp,
                },
              });
            }
          }
        }
      } catch (err) {
        // Non-fatal: if anything goes wrong creating the recipient copy we still
        // want to treat RSVP as successful. Log for debugging.
        console.error('Failed to create event copy for recipient on RSVP', err);
      }
    }

    console.info('RSVP recorded', {
      token,
      eventId: inv.eventId,
      email: inv.email,
      rsvp,
      updatedCount: updateResult.count,
    });

    // Mark the original invitation as delivered when the recipient follows the RSVP link.
    // This mirrors the expected test behavior: after a recipient uses the token the
    // invitation status should reflect delivery/interacting with the invitation.
    try {
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { status: 'delivered' },
      });
    } catch (e) {
      console.error(
        'Failed to update invitation status to delivered on RSVP',
        e,
      );
    }

    return { ok: true, updatedCount: updateResult.count };
  }
}
