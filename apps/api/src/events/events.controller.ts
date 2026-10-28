import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import type { RequestWithUser } from '../auth/auth.types';
import { UpdateEventDto } from './dto/update-event.dto';

type RecurrenceScope = 'this' | 'following' | 'all';

function parseScope(scope?: string): RecurrenceScope {
  if (!scope) return 'all';
  if (scope === 'this' || scope === 'following' || scope === 'all')
    return scope;
  throw new BadRequestException('Invalid scope');
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @UseGuards(JwtCookieGuard)
  async list(
    @Req() req: RequestWithUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user!.sub;

    // For recurrence expansion + performance, require a bounded window
    if (!from || !to) {
      throw new BadRequestException('from and to query params are required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to');
    }
    if (toDate <= fromDate) {
      throw new BadRequestException('to must be after from');
    }

    // Guardrail: prevent massive windows.
    // 366 days covers a full leap-year (needed by the year calendar view).
    const MAX_WINDOW_DAYS = 366;
    const maxWindowMs = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxWindowMs) {
      throw new BadRequestException(
        `Date range too large (max ${MAX_WINDOW_DAYS} days)`,
      );
    }
    return this.events.listForUser(userId, fromDate, toDate);
  }

  @Post()
  @UseGuards(JwtCookieGuard)
  async create(@Req() req: RequestWithUser, @Body() dto: CreateEventDto) {
    const userId = req.user!.sub;
    return this.events.createForUser(userId, dto);
  }

  @Get('search')
  @UseGuards(JwtCookieGuard)
  async search(@Req() req: RequestWithUser, @Query('q') q?: string) {
    return this.events.searchForUser(req.user!.sub, q ?? '');
  }

  @Get(':id')
  @UseGuards(JwtCookieGuard)
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.events.getForUser(req.user!.sub, id);
  }

  @Patch(':id')
  @UseGuards(JwtCookieGuard)
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Query('scope') scope?: string,
  ) {
    const userId = req.user!.sub;
    return this.events.updateForUser(userId, id, dto, parseScope(scope));
  }

  @Delete(':id')
  @UseGuards(JwtCookieGuard)
  async delete(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('scope') scope?: string,
  ) {
    const userId = req.user!.sub;
    return this.events.deleteForUser(userId, id, parseScope(scope));
  }

  @Post(':id/invitations')
  @UseGuards(JwtCookieGuard)
  async createInvitations(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body('emails')
    emails: Array<string | { email: string; permissions?: unknown }>,
  ) {
    const userId = req.user!.sub;
    return this.events.createInvitations(userId, id, emails);
  }
}

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly events: EventsService) {}

  @Post(':token/rsvp')
  @HttpCode(200)
  async rsvp(
    @Param('token') token: string,
    @Body('rsvp') rsvp: 'accepted' | 'declined' | 'tentative',
  ) {
    return this.events.rsvpByToken(token, rsvp);
  }

  @Get(':token/ics')
  async getIcs(@Param('token') token: string, @Res() res: Response) {
    // Serve a simple ICS file for the invitation token
    const ics = await this.events.getIcsForToken(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invite.ics"`);
    res.send(ics);
  }
}
