import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @SkipThrottle()
  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('db-health')
  async dbHealth() {
    const result = await this.prisma.$queryRaw<
      { ok: number }[]
    >`SELECT 1 as ok`;
    return { ok: true, db: result?.[0]?.ok === 1 };
  }

  @Get('debug-sentry')
  debugSentry(): never {
    // Permanent diagnostic route: deliberately throws so AllExceptionsFilter
    // reports a real event to Sentry. Safe to hit repeatedly in any environment.
    throw new Error('Sentry test error — safe to ignore');
  }
}
