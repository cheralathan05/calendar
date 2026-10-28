import { Injectable, Logger } from '@nestjs/common';
import type { Event } from '@prisma/client';
import nodemailer from 'nodemailer';

// Minimal interface we rely on from nodemailer to avoid importing noisy types
interface SmtpTransporter {
  sendMail(options: Record<string, unknown>): Promise<unknown>;
  verify?(): Promise<void>;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: SmtpTransporter | null = null;

  constructor() {
    const host = process.env.MAIL_HOST ?? 'localhost';
    const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 1025;
    const user = process.env.MAIL_USER ?? undefined;
    const pass = process.env.MAIL_PASS ?? undefined;

    // In test mode, use an in-memory stub transporter to avoid network I/O.
    if (process.env.NODE_ENV === 'test') {
      this.transporter = {
        sendMail: (opts: Record<string, unknown>) => {
          const rawTo = opts['to'];
          const accepted = Array.isArray(rawTo)
            ? rawTo
            : rawTo != null
              ? [rawTo]
              : [];
          const messageId = `<test-${Date.now()}@test>`;
          const rawFrom = opts['from'];
          let fromStr: string;
          if (typeof rawFrom === 'string') {
            fromStr = rawFrom;
          } else if (rawFrom && typeof rawFrom === 'object') {
            try {
              fromStr = JSON.stringify(rawFrom);
            } catch {
              fromStr = 'test';
            }
          } else if (rawFrom == null) {
            fromStr = 'test';
          } else if (
            typeof rawFrom === 'number' ||
            typeof rawFrom === 'boolean' ||
            typeof rawFrom === 'bigint' ||
            typeof rawFrom === 'symbol'
          ) {
            fromStr = String(rawFrom);
          } else {
            fromStr = 'test';
          }
          return Promise.resolve({
            accepted,
            rejected: [],
            response: '250 OK (test)',
            envelope: {
              from:
                process.env.MAIL_ENVELOPE_FROM ??
                process.env.MAIL_USER ??
                fromStr,
              to: accepted,
            },
            messageId,
          });
        },
      } as SmtpTransporter;
      this.logger.debug('Using test stub mail transporter');
      return;
    }

    // If BREVO_API_KEY is set, the HTTP API path is used — no SMTP transporter needed.
    // Most cloud platforms (Render, Vercel, Railway) block outbound SMTP ports at the
    // network level, so SMTP will always time-out in those environments.
    if (process.env.BREVO_API_KEY) {
      this.logger.log('Brevo HTTP API key detected — SMTP transporter skipped');
      return;
    }

    // Warn clearly at startup so the issue is visible in Render/production logs.
    if (
      !process.env.MAIL_HOST ||
      !process.env.MAIL_USER ||
      !process.env.MAIL_PASS
    ) {
      this.logger.warn(
        'No BREVO_API_KEY and no SMTP env vars (MAIL_HOST/MAIL_USER/MAIL_PASS). ' +
          'Emails will NOT be sent. ' +
          'Set BREVO_API_KEY in Render → Environment (recommended) or configure SMTP vars.',
      );
    }

    try {
      const secureEnv = process.env.MAIL_SECURE;
      const secure =
        typeof secureEnv !== 'undefined'
          ? secureEnv === '1' || secureEnv === 'true'
          : port === 465;

      const service = process.env.MAIL_SERVICE ?? undefined;
      const tlsRejectUnauthorized =
        process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== '0';
      const debugMode = process.env.DEBUG_MAILER === '1';

      const baseOpts: Record<string, unknown> = {
        host,
        port,
        secure,
        tls: { rejectUnauthorized: tlsRejectUnauthorized },
        ...(secure ? {} : { requireTLS: true }),
        ...(debugMode ? { logger: true, debug: true } : {}),
      };

      const opts: Record<string, unknown> = user
        ? { ...baseOpts, auth: { user, pass }, ...(service ? { service } : {}) }
        : { ...baseOpts, ...(service ? { service } : {}) };

      const createTransport = (
        nodemailer as unknown as {
          createTransport: (opts: Record<string, unknown>) => unknown;
        }
      ).createTransport;
      this.transporter = createTransport(opts) as SmtpTransporter;

      if (this.transporter?.verify) {
        this.transporter
          .verify()
          .then(() => {
            this.logger.log(
              `SMTP transporter ready (${host}:${port}, secure=${secure})`,
            );
          })
          .catch((err: unknown) => {
            const errMsg =
              err instanceof Error
                ? err.message
                : typeof err === 'string'
                  ? err
                  : JSON.stringify(err);
            if (
              errMsg.includes('535') ||
              /BadCredentials|Invalid login/i.test(errMsg)
            ) {
              this.logger.warn(
                `SMTP verify failed (${host}:${port}): auth error — check MAIL_USER / MAIL_PASS`,
              );
            } else if (/timeout/i.test(errMsg)) {
              this.logger.warn(
                `SMTP verify timed out (${host}:${port}). ` +
                  'Cloud platforms (Render, Vercel) block outbound SMTP ports at the network level. ' +
                  'Set BREVO_API_KEY to use the Brevo HTTP API instead (port 443, never blocked).',
              );
            } else {
              this.logger.warn(
                `SMTP verify failed (${host}:${port}): ${errMsg}`,
              );
            }
          });
      } else {
        this.logger.debug(
          `SMTP transporter configured (${host}:${port}, secure=${secure})`,
        );
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err);
      this.logger.debug(
        'Failed to create SMTP transporter, will log mails instead',
        errMsg,
      );
      this.transporter = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Brevo HTTP API (preferred in production — unaffected by SMTP port blocks)
  // ─────────────────────────────────────────────────────────────────────────

  private async sendViaBrevoApi(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    ics?: string;
  }): Promise<boolean> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return false;

    const fromEmail =
      process.env.MAIL_FROM ?? process.env.MAIL_USER ?? 'no-reply@example.com';
    // Brevo requires sender.name to be set; derive it from the "Name <email>" format if present.
    const fromMatch = fromEmail.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
    const sender = fromMatch
      ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
      : { name: 'Calendar', email: fromEmail };

    const body: Record<string, unknown> = {
      sender,
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    };

    if (params.ics) {
      body['attachment'] = [
        {
          content: Buffer.from(params.ics).toString('base64'),
          name: 'invite.ics',
        },
      ];
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      this.logger.error(`Brevo API send failed (${res.status}): ${txt}`);
      return false;
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shared delivery — tries Brevo API, then SMTP, then Postmark, then logs.
  // Both sendInvitation and sendReminder funnel through this.
  // ─────────────────────────────────────────────────────────────────────────

  private async deliver(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    ics?: string;
  }): Promise<boolean> {
    const { to, subject, html, text, ics } = params;
    const host = process.env.MAIL_HOST ?? 'localhost';
    const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 1025;

    // 1. Brevo HTTP API — preferred in production (not blocked by cloud platforms)
    if (process.env.BREVO_API_KEY) {
      const sent = await this.sendViaBrevoApi({ to, subject, html, text, ics });
      if (sent) {
        this.logger.log(`[MAILER] email sent via Brevo API to ${to}`);
        return true;
      }
      // Fall through to SMTP if Brevo API call itself failed (e.g. invalid key)
    }

    // 2. SMTP — works in local dev (MailHog) but blocked on most cloud platforms
    if (this.transporter) {
      try {
        const fromAddr =
          process.env.MAIL_FROM ??
          process.env.MAIL_USER ??
          'no-reply@example.com';
        await this.transporter.sendMail({
          from: fromAddr,
          to,
          subject,
          text,
          html,
          alternatives: ics
            ? [
                {
                  content: ics,
                  contentType: 'text/calendar; method=REQUEST; charset=utf-8',
                  contentTransferEncoding: '7bit',
                },
              ]
            : undefined,
          attachments: ics
            ? [
                {
                  content: ics,
                  filename: 'invite.ics',
                  contentType: 'text/calendar; charset=utf-8',
                  contentDisposition: 'inline',
                  contentTransferEncoding: '7bit',
                },
              ]
            : undefined,
          headers: ics
            ? { 'Content-class': 'urn:content-classes:calendarmessage' }
            : undefined,
        });
        this.logger.log(`[MAILER] email sent via SMTP to ${to}`);
        return true;
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : JSON.stringify(err);
        this.logger.error(
          `Mailer SMTP send failed (${host}:${port}): ${errMsg}`,
        );
      }
    }

    // 3. Postmark HTTP API fallback
    const postmarkToken =
      process.env.POSTMARK_API_TOKEN ?? process.env.POSTMARK_SERVER_TOKEN;
    if (postmarkToken) {
      try {
        const body: Record<string, unknown> = {
          From: process.env.MAIL_FROM ?? 'no-reply@example.com',
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
        };
        if (ics) {
          body['Attachments'] = [
            {
              Name: 'invite.ics',
              Content: Buffer.from(ics).toString('base64'),
              ContentType: 'text/calendar; charset=utf-8',
            },
          ];
        }
        const res = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': postmarkToken,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          this.logger.warn(`Postmark send failed (${res.status}): ${txt}`);
          return false;
        }
        this.logger.log(`[MAILER] email sent via Postmark to ${to}`);
        return true;
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : JSON.stringify(err);
        this.logger.warn(`Postmark send failed: ${errMsg}`);
      }
    }

    // 4. Nothing configured — log for debugging
    this.logger.debug('[MAILER STUB] deliver', { to, subject, hasIcs: !!ics });
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public methods
  // ─────────────────────────────────────────────────────────────────────────

  async sendInvitation(
    ev: Partial<Event>,
    toEmail: string,
    token: string,
    ics?: string,
  ): Promise<boolean> {
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3004';
    const apiBase = process.env.API_URL ?? `${frontend.replace(/\/$/, '')}/v1`;

    const rsvpUrl = `${frontend.replace(/\/$/, '')}/invitations/${encodeURIComponent(token)}`;
    const icsUrl = `${apiBase.replace(/\/$/, '')}/invitations/${encodeURIComponent(token)}/ics`;
    const subject = `Invitation: ${ev.title ?? 'Event'}`;

    const text =
      `You're invited to ${ev.title ?? 'an event'}\n\n` +
      `Accept: ${rsvpUrl}?rsvp=accepted\n` +
      `Tentative: ${rsvpUrl}?rsvp=tentative\n` +
      `Decline: ${rsvpUrl}?rsvp=declined\n\n` +
      `Download calendar file: ${icsUrl}`;

    const html =
      `<p>You're invited to <strong>${ev.title ?? 'an event'}</strong>.</p>` +
      `<p>` +
      `<a href="${rsvpUrl}?rsvp=accepted">Accept</a> | ` +
      `<a href="${rsvpUrl}?rsvp=tentative">Tentative</a> | ` +
      `<a href="${rsvpUrl}?rsvp=declined">Decline</a>` +
      `</p>` +
      `<p>If your mail client doesn't add the event automatically, ` +
      `<a href="${icsUrl}">download the .ics file</a>.</p>`;

    return this.deliver({ to: toEmail, subject, html, text, ics });
  }

  async sendReminder(
    event: {
      id: string;
      title: string;
      startAt: Date;
      endAt: Date;
      location: string | null;
    },
    toEmail: string,
    notification: { amount: number; unit: string; anchor?: string },
  ): Promise<boolean> {
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3004';
    const eventUrl = `${frontend.replace(/\/$/, '')}/events/${encodeURIComponent(event.id)}/edit`;

    const anchorLabel = notification.anchor === 'end' ? 'ends' : 'starts';
    const whenLabel = `${notification.amount} ${notification.unit} before it ${anchorLabel}`;
    const startLabel = event.startAt.toISOString();

    const subject = `Reminder: ${event.title}`;
    const text =
      `${event.title}\n\n` +
      `Starts: ${startLabel}\n` +
      (event.location ? `Location: ${event.location}\n` : '') +
      `\nThis reminder was scheduled for ${whenLabel}.\n\n` +
      `View event: ${eventUrl}`;
    const html =
      `<p><strong>${event.title}</strong></p>` +
      `<p>Starts: ${startLabel}</p>` +
      (event.location ? `<p>Location: ${event.location}</p>` : '') +
      `<p>This reminder was scheduled for ${whenLabel}.</p>` +
      `<p><a href="${eventUrl}">View event</a></p>`;

    return this.deliver({ to: toEmail, subject, html, text });
  }
}
