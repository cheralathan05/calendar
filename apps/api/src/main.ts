// Sentry MUST be the first import so it can instrument Node internals.
import './instrument';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Disable NestJS default logger during bootstrap so we don't get duplicate output.
  // The Pino logger (registered in AppModule) replaces it after the app is created.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Render puts exactly one proxy hop in front of the app; trust it so
  // req.ip resolves to the real client IP (not Render's proxy) — needed
  // for the throttler's per-IP rate limit to work per-client instead of
  // treating all traffic as a single IP.
  app.set('trust proxy', 1);

  // Security headers (allow Swagger UI inline scripts in dev)
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Consistent error envelope + request ID correlation across all routes
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('v1');

  // Root route providing service information
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: unknown, res: { json: (data: unknown) => void }) => {
    res.json({
      name: 'Calendar Clone API',
      status: 'online',
      message: 'Calendar Backend REST API is running.',
      health: '/v1/health',
      docs: '/v1/docs',
    });
  });

  // Support root /health in addition to /v1/health for cloud load balancers and Render health checks
  expressApp.get('/health', (_req: unknown, res: { json: (data: unknown) => void }) => {
    res.json({ ok: true });
  });


  app.use(cookieParser());
  const rawOrigins = process.env.WEB_ORIGIN ?? 'http://localhost:3004';
  const origins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return cb(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (origins.includes(normalized) || normalized.endsWith('.onrender.com')) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });

  // Swagger docs — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Calendar API')
      .setDescription('Google Calendar clone REST API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('v1/docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3005, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
