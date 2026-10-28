import { NextResponse } from 'next/server';

export async function POST() {
  const cookieName = process.env.COOKIE_NAME ?? 'access_token';
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieName);
  return response;
}
