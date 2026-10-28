import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

/** Fields returned for every calendar response — never expose ownerId directly. */
const CALENDAR_SELECT = {
  id: true,
  name: true,
  color: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CalendarsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Read ─────────────────────────────────────────────────────────────

  listForUser(userId: string) {
    return this.prisma.calendar.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: CALENDAR_SELECT,
    });
  }

  async getForUser(userId: string, id: string) {
    // findFirst with the ownership filter in the WHERE clause: one query, no leak.
    const cal = await this.prisma.calendar.findFirst({
      where: { id, ownerId: userId },
      select: CALENDAR_SELECT,
    });
    if (!cal) throw new NotFoundException('Calendar not found');
    return cal;
  }

  // ── Create ───────────────────────────────────────────────────────────

  createForUser(userId: string, dto: CreateCalendarDto) {
    return this.prisma.calendar.create({
      data: {
        ownerId: userId,
        name: dto.name,
        color: dto.color ?? '#039BE5',
      },
      select: CALENDAR_SELECT,
    });
  }

  // ── Update ───────────────────────────────────────────────────────────

  async updateForUser(userId: string, id: string, dto: UpdateCalendarDto) {
    // Atomic ownership-conditioned update: count===0 ⇒ not found OR not owned.
    const res = await this.prisma.calendar.updateMany({
      where: { id, ownerId: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
    if (res.count === 0) throw new NotFoundException('Calendar not found');

    // Re-read for a shaped response (still cheap: indexed PK lookup).
    return this.prisma.calendar.findUniqueOrThrow({
      where: { id },
      select: CALENDAR_SELECT,
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────

  async deleteForUser(userId: string, id: string) {
    const res = await this.prisma.calendar.deleteMany({
      where: { id, ownerId: userId },
    });
    if (res.count === 0) throw new NotFoundException('Calendar not found');
  }

  // ── Utility ──────────────────────────────────────────────────────────

  async ensureDefaultCalendar(userId: string) {
    // Make sure the user actually exists — avoid a Prisma P2003 foreign-key error
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.calendar.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: CALENDAR_SELECT,
    });
    if (existing) return existing;

    return this.prisma.calendar.create({
      data: { ownerId: userId, name: 'Personal', color: '#0B57D0' },
      select: CALENDAR_SELECT,
    });
  }
}
