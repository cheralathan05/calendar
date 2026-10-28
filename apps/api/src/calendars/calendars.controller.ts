import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

@Controller('calendars')
@UseGuards(JwtCookieGuard)
export class CalendarsController {
  constructor(private readonly calendars: CalendarsService) {}

  /** GET /v1/calendars — list all calendars for the current user */
  @Get()
  async list(@Req() req: RequestWithUser) {
    const userId = req.user!.sub;
    try {
      // Ensure default calendar exists for the user. If the user record is missing
      // (possible with stale auth cookie), surface a safe empty list instead of
      // throwing an internal/top-level error we display to users.
      await this.calendars.ensureDefaultCalendar(userId);
    } catch (err: unknown) {
      // If the user truly doesn't exist return an empty list so the UI can handle
      // unauthenticated state gracefully. Re-throw other unexpected errors.
      // (NotFoundException uses message 'User not found')
      if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        (err as { message?: unknown }).message === 'User not found'
      ) {
        return [];
      }
      throw err;
    }

    return this.calendars.listForUser(userId);
  }

  /** GET /v1/calendars/:id — get a single calendar */
  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.calendars.getForUser(req.user!.sub, id);
  }

  /** POST /v1/calendars — create a new calendar */
  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateCalendarDto) {
    return this.calendars.createForUser(req.user!.sub, dto);
  }

  /** PATCH /v1/calendars/:id — rename or recolor a calendar */
  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarDto,
  ) {
    return this.calendars.updateForUser(req.user!.sub, id, dto);
  }

  /** DELETE /v1/calendars/:id — delete a calendar and all its events */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.calendars.deleteForUser(req.user!.sub, id);
  }
}
