import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createE2eApp } from './utils/e2e-app';
import { makeAuthCookie } from './utils/auth-cookie';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let userId: string;
  let authCookie: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.COOKIE_NAME = process.env.COOKIE_NAME ?? 'access_token';

    app = await createE2eApp();
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.calendar.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: 'e2e-auth@example.com',
        name: 'E2E Auth User',
        googleSub: 'e2e-auth-google-sub',
      },
    });

    userId = user.id;
    authCookie = makeAuthCookie({ userId, email: user.email });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /v1/auth/me returns 401 without cookie', async () => {
    await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
  });

  it('GET /v1/auth/me returns user when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Cookie', authCookie)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.user).toBeTruthy();

    // The guard typically sets req.user.sub from the JWT
    expect(res.body.user.sub).toBe(userId);
  });

  it('POST /v1/auth/logout clears cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Cookie', authCookie);

    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeTruthy();

    // Should include cookie name and an expiry/max-age that clears it
    const cookieName = process.env.COOKIE_NAME ?? 'access_token';
    const combined = Array.isArray(setCookie)
      ? setCookie.join(';')
      : String(setCookie);

    expect(combined).toContain(`${cookieName}=`);
    expect(combined.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});
