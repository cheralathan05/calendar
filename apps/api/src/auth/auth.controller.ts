import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtCookieGuard } from './jwt-cookie.guard';
import type { AuthUser } from './auth.types';

const STATE_COOKIE = 'oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Default to 'lax': the final access_token cookie is set by the Next.js
  // frontend (same-origin), so cross-site SameSite=None is no longer needed.
  // Lax also avoids the browser requirement that SameSite=None must have Secure.
  private cookieSameSite(): 'lax' | 'strict' | 'none' {
    return (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none';
  }

  private getWebOrigin(req?: Request): string {
    const configured = process.env.WEB_ORIGIN?.trim().replace(/\/$/, '');
    if (configured && configured !== 'http://localhost:3004') {
      return configured;
    }
    const referer = req?.headers?.referer;
    if (referer) {
      try {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
      } catch {
        // ignore invalid referer URL
      }
    }
    return configured || 'http://localhost:3004';
  }

  private cookieBaseOptions(path = '/', maxAge?: number) {
    const opts: Record<string, unknown> = {
      httpOnly: true,
      sameSite: this.cookieSameSite(),
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.COOKIE_DOMAIN ?? undefined,
      path,
    };
    if (typeof maxAge === 'number') opts.maxAge = maxAge;
    return opts;
  }

  @Get('google/start')
  googleStart(@Res() res: Response) {
    // Cryptographically random, URL-safe state
    const state = randomBytes(32).toString('base64url');

    // Persist it in an httpOnly cookie scoped tightly to the callback path
    res.cookie(
      STATE_COOKIE,
      state,
      this.cookieBaseOptions('/v1/auth/google/callback', STATE_TTL_MS),
    );

    const url = this.auth.getGoogleAuthUrl(state);
    return res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request & { cookies: Record<string, string> },
    @Res() res: Response,
  ) {
    if (!code) throw new BadRequestException('Missing code');
    if (!state) throw new UnauthorizedException('Missing state');

    const expected =
      typeof req.cookies?.[STATE_COOKIE] === 'string'
        ? req.cookies[STATE_COOKIE]
        : undefined;

    // Constant-time-ish compare: both are base64url strings of equal expected length
    if (!expected || expected.length !== state.length || expected !== state) {
      throw new UnauthorizedException('Invalid state');
    }

    // One-shot: clear the state cookie so it can't be replayed
    res.clearCookie(
      STATE_COOKIE,
      this.cookieBaseOptions('/v1/auth/google/callback'),
    );

    const { jwt } = await this.auth.handleGoogleCallback(code);

    // Redirect to the Next.js callback route which sets the cookie on the
    // frontend domain. This avoids the cross-domain cookie problem where
    // Render (api domain) sets a cookie that Vercel (frontend domain) can't read.
    const webOrigin = this.getWebOrigin(req);
    return res.redirect(
      `${webOrigin}/api/auth/callback?token=${encodeURIComponent(jwt)}`,
    );
  }

  @Post('logout')
  logout(@Res() res: Response) {
    const cookieName = process.env.COOKIE_NAME ?? 'access_token';
    res.clearCookie(cookieName, this.cookieBaseOptions('/'));
    return res.json({ ok: true });
  }

  @Get('me')
  @UseGuards(JwtCookieGuard)
  me(@Req() req: Request & { user?: AuthUser }) {
    return { ok: true, user: req.user };
  }

  @Get('demo')
  async demoLogin(
    @Query('persona') persona: string,
    @Query('email') email: string,
    @Query('name') name: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const allowDemo =
      (process.env.ALLOW_DEMO ?? '').toLowerCase() === 'true' ||
      process.env.ALLOW_DEMO === '1';

    if (process.env.NODE_ENV === 'production' && !allowDemo) {
      return res.status(404).send('Not found');
    }

    const { jwt } = await this.auth.createDemoToken({ persona, email, name });

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    );
    res.setHeader('Pragma', 'no-cache');

    const webOrigin = this.getWebOrigin(req);
    return res.redirect(
      `${webOrigin}/api/auth/callback?token=${encodeURIComponent(jwt)}`,
    );
  }

  @Post('quick-login')
  async quickLogin(
    @Body() body: { persona?: string; email?: string; name?: string },
    @Res() res: Response,
  ) {
    const { user, jwt } = await this.auth.createDemoToken(body);
    const cookieName = process.env.COOKIE_NAME ?? 'access_token';
    res.cookie(
      cookieName,
      jwt,
      this.cookieBaseOptions('/', 7 * 24 * 60 * 60 * 1000),
    );
    return res.json({ ok: true, user, token: jwt });
  }

  @Post('reseed')
  @UseGuards(JwtCookieGuard)
  async reseed(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user!.sub;
    const userName = req.user?.name || 'User';
    await this.auth.seedRealisticEventsForUser(userId, userName, true);
    return { ok: true, message: 'Calendar events re-seeded successfully' };
  }
}
