import jwt from 'jsonwebtoken';

export function makeAuthCookie(params: { userId: string; email: string }) {
  const cookieName = process.env.COOKIE_NAME ?? 'access_token';
  const secret = process.env.JWT_SECRET ?? 'test-secret';

  // Must match what JwtCookieGuard expects.
  // Typically at least: sub
  const token = jwt.sign({ sub: params.userId, email: params.email }, secret, {
    expiresIn: '1h',
  });

  return `${cookieName}=${token}`;
}
