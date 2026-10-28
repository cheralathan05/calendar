import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { AuthUser, RequestWithUser } from './auth.types';

type CookiesRequest = RequestWithUser & { cookies: Record<string, string> };

function isAuthUser(payload: unknown): payload is AuthUser {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Partial<AuthUser>;
  return typeof p.sub === 'string' && typeof p.email === 'string';
}

function verifyJwt(token: string, secret: string): unknown {
  // jsonwebtoken's typings can degrade to `any` depending on setup.
  // We isolate the unsafeness here and validate the shape at callsites.

  const decoded = jwt.verify(token, secret);
  return decoded as unknown;
}

@Injectable()
export class JwtCookieGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<CookiesRequest>();

    const cookieName = process.env.COOKIE_NAME ?? 'access_token';

    const token =
      typeof req.cookies?.[cookieName] === 'string'
        ? req.cookies[cookieName]
        : undefined;
    if (!token) throw new UnauthorizedException('Missing auth cookie');

    const secret = process.env.JWT_SECRET;
    if (typeof secret !== 'string' || !secret)
      throw new Error('Missing JWT_SECRET');

    try {
      const decoded = verifyJwt(token, secret);

      if (process.env.DEBUG_AUTH === 'true') {
        try {
          console.log('Auth debug: decoded token', decoded);
        } catch {
          // ignore console failures in debug logging
        }
      }

      if (!isAuthUser(decoded)) {
        throw new UnauthorizedException('Invalid token payload');
      }

      req.user = decoded;
      return true;
    } catch (err) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.error(
          'Auth debug: token verification failed',
          err instanceof Error ? err.message : err,
        );
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
