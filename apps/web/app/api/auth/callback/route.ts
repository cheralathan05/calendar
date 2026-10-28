import { NextResponse, type NextRequest } from 'next/server';

// Receives the JWT from the API after demo or Google OAuth completes.
// The API redirects here (instead of setting a cookie itself) so the cookie
// is set on the frontend domain (Vercel), not the API domain (Render).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const cookieName = process.env.COOKIE_NAME ?? 'access_token';
  const response = NextResponse.redirect(new URL('/', request.url));

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
