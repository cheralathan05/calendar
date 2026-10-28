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

  // Root route providing service information (HTML for browser, JSON for API clients)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req: { headers: { accept?: string } }, res: { send: (html: string) => void; json: (data: unknown) => void }) => {
    if (req.headers.accept?.includes('text/html')) {
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Clone API — Online</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 60%, #030712 100%);
      color: #f3f4f6;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 40px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -10px rgba(99, 102, 241, 0.2);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; color: #ffffff; letter-spacing: -0.02em; }
    p.subtitle { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .box {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .box-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #818cf8; margin-bottom: 6px; }
    .box-desc { font-size: 13.5px; color: #cbd5e1; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .stat-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
    }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
    .stat-val { font-size: 14px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px; }
    .btn-group { display: flex; gap: 12px; }
    .btn {
      flex: 1;
      text-align: center;
      padding: 12px 18px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> API Operational</div>
    <h1>Calendar Backend API</h1>
    <p class="subtitle">The NestJS REST service and PostgreSQL database are online and serving requests successfully.</p>
    
    <div class="box">
      <div class="box-title">Looking for the Calendar UI?</div>
      <div class="box-desc">This URL is the <strong>Backend API</strong>. The interactive Calendar Web App (Next.js) is built in <code>apps/web</code> and runs as a separate frontend service on Render.</div>
    </div>

    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Health Check</div>
        <div class="stat-val"><span style="color:#10b981;">●</span> 200 OK</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Database Engine</div>
        <div class="stat-val">PostgreSQL</div>
      </div>
    </div>

    <div class="btn-group">
      <a class="btn btn-primary" href="/v1/health">Test Health API</a>
      <a class="btn btn-secondary" href="https://dashboard.render.com" target="_blank">Render Dashboard</a>
    </div>
  </div>
</body>
</html>`);
      return;
    }
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
