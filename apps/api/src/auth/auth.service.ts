import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

type GoogleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

@Injectable()
export class AuthService {
  private oauth = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  constructor(private readonly prisma: PrismaService) {}

  /** Build the consent URL with a server-issued `state` for CSRF protection. */
  getGoogleAuthUrl(state: string): string {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
    }
    return this.oauth.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'consent',
      state, // ← the controller passes the random state here
    });
  }

  async handleGoogleCallback(code: string) {
    const { tokens } = await this.oauth.getToken(code);
    if (!tokens.id_token)
      throw new UnauthorizedException('Missing id_token from Google');

    const ticket = await this.oauth.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleProfile | undefined;
    if (!payload?.sub)
      throw new UnauthorizedException('Invalid Google token payload');

    const googleSub = payload.sub;
    const name = payload.name ?? null;

    // Only trust the email if Google says it's verified.
    // Otherwise we keep the user but never expose a real email we can't trust.
    const verifiedEmail =
      payload.email && payload.email_verified === true ? payload.email : null;

    const user = await this.prisma.user.upsert({
      where: { googleSub },
      create: {
        googleSub,
        email: verifiedEmail ?? `google-${googleSub}@no-email.local`,
        name,
      },
      update: {
        ...(verifiedEmail ? { email: verifiedEmail } : {}),
        ...(name ? { name } : {}),
      },
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('Missing JWT_SECRET');

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name ?? undefined,
        googleSub,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    return { user, jwt: token };
  }

  /** Create or fetch a seeded demo user and issue a JWT for them.
   * Supports multiple realistic personas and dynamic event seeding. */
  async createDemoToken(options?: {
    persona?: string;
    email?: string;
    name?: string;
  }) {
    const PERSONAS: Record<string, { email: string; name: string }> = {
      alex: { email: 'alex.pm@calendar-clone.local', name: 'Alex Morgan' },
      sarah: { email: 'sarah.tech@calendar-clone.local', name: 'Sarah Chen' },
      marcus: {
        email: 'marcus.founder@calendar-clone.local',
        name: 'Marcus Vance',
      },
      demo: { email: 'demo@calendar-clone.local', name: 'Demo User' },
    };

    let email = options?.email?.trim().toLowerCase();
    let name = options?.name?.trim();

    if (options?.persona && PERSONAS[options.persona.toLowerCase()]) {
      const p = PERSONAS[options.persona.toLowerCase()];
      email = p.email;
      name = p.name;
    }

    if (!email) email = 'demo@calendar-clone.local';
    if (!name) name = 'Demo User';

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    // Ensure default calendars and seed realistic active events if user has none
    await this.seedRealisticEventsForUser(user.id, user.name || 'User');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('Missing JWT_SECRET');

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name ?? undefined,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    return { user, jwt: token };
  }

  async seedRealisticEventsForUser(
    userId: string,
    userName: string,
    force = false,
  ) {
    const existingEventsCount = await this.prisma.event.count({
      where: { calendar: { ownerId: userId } },
    });

    if (existingEventsCount > 0 && !force) {
      return;
    }

    if (force) {
      // Clear existing events for user's calendars
      await this.prisma.event.deleteMany({
        where: { calendar: { ownerId: userId } },
      });
    }

    // Ensure calendars
    let workCal = await this.prisma.calendar.findFirst({
      where: { ownerId: userId, name: 'Work & Projects' },
    });
    if (!workCal) {
      workCal = await this.prisma.calendar.create({
        data: { ownerId: userId, name: 'Work & Projects', color: '#0B57D0' },
      });
    }

    let personalCal = await this.prisma.calendar.findFirst({
      where: { ownerId: userId, name: 'Personal & Health' },
    });
    if (!personalCal) {
      personalCal = await this.prisma.calendar.create({
        data: { ownerId: userId, name: 'Personal & Health', color: '#10B981' },
      });
    }

    let tasksCal = await this.prisma.calendar.findFirst({
      where: { ownerId: userId, name: 'Tasks & Focus' },
    });
    if (!tasksCal) {
      tasksCal = await this.prisma.calendar.create({
        data: { ownerId: userId, name: 'Tasks & Focus', color: '#F59E0B' },
      });
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const mkDate = (dayOffset: number, hour: number, minute: number = 0) => {
      return new Date(y, m, d + dayOffset, hour, minute, 0, 0);
    };

    const tz = 'UTC';

    const eventsToCreate = [
      // Today events
      {
        calendarId: workCal.id,
        title: '🚀 Team Daily Standup & Sprint Sync',
        description:
          'Review blockers, daily commitments, and PR reviews with the distributed engineering team.',
        location: 'Virtual / Google Meet',
        allDay: false,
        startAt: mkDate(0, 9, 30),
        endAt: mkDate(0, 10, 0),
        timeZone: tz,
        color: '#0B57D0',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/calendar-daily-standup-sync',
      },
      {
        calendarId: workCal.id,
        title: '🎨 Design System & UI Review',
        description:
          'Walkthrough of the modern monorepo redesign, typography scale, and dark mode palette.',
        location: 'Design Studio / Room 4B',
        allDay: false,
        startAt: mkDate(0, 11, 0),
        endAt: mkDate(0, 12, 0),
        timeZone: tz,
        color: '#8B5CF6',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/calendar-design-critique',
      },
      {
        calendarId: personalCal.id,
        title: '🥗 Team Lunch & Social Catchup',
        description: 'Informal lunch with tech leads and design partners.',
        location: 'Green Garden Bistro / 5th Ave',
        allDay: false,
        startAt: mkDate(0, 12, 30),
        endAt: mkDate(0, 13, 30),
        timeZone: tz,
        color: '#10B981',
      },
      {
        calendarId: tasksCal.id,
        title: '⚡ Deep Work: Core Architecture & Performance',
        description:
          'High-focus window for state machine optimization and Next.js 16 App Router enhancements.',
        allDay: false,
        startAt: mkDate(0, 14, 30),
        endAt: mkDate(0, 16, 30),
        timeZone: tz,
        color: '#F59E0B',
      },
      {
        calendarId: workCal.id,
        title: '🏆 Q4 Milestone Sprint Launch',
        description:
          'Company-wide release of modern collaborative scheduling platform.',
        allDay: true,
        startAt: mkDate(0, 0, 0),
        endAt: mkDate(1, 0, 0),
        startDate: mkDate(0, 0, 0),
        endDate: mkDate(1, 0, 0),
        timeZone: tz,
        color: '#EC4899',
      },
      // Tasks for today
      {
        calendarId: tasksCal.id,
        title: '✅ Review Pull Request #142 (Calendar Monolith UI)',
        description:
          '#task Review code changes, verify end-to-end flow, and approve deployment.',
        allDay: true,
        startAt: mkDate(0, 0, 0),
        endAt: mkDate(1, 0, 0),
        startDate: mkDate(0, 0, 0),
        endDate: mkDate(1, 0, 0),
        timeZone: tz,
        color: '#F59E0B',
      },
      {
        calendarId: tasksCal.id,
        title: '📋 Prepare Q4 Product Roadmap Presentation',
        description:
          '#task Outline high-level initiatives, dependencies, and deliverables.',
        allDay: true,
        startAt: mkDate(0, 0, 0),
        endAt: mkDate(1, 0, 0),
        startDate: mkDate(0, 0, 0),
        endDate: mkDate(1, 0, 0),
        timeZone: tz,
        color: '#F59E0B',
      },
      // Tomorrow events
      {
        calendarId: workCal.id,
        title: '📊 Sprint Planning & Backlog Grooming',
        description:
          'Estimate user stories, define sprint goals, and prioritize upcoming features.',
        location: 'Virtual Conference Room',
        allDay: false,
        startAt: mkDate(1, 10, 0),
        endAt: mkDate(1, 11, 30),
        timeZone: tz,
        color: '#0B57D0',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/calendar-sprint-planning',
      },
      {
        calendarId: workCal.id,
        title: '🤝 1:1 Growth & Architecture Mentorship',
        description:
          'Bi-weekly check-in on technical strategy and career trajectory.',
        allDay: false,
        startAt: mkDate(1, 14, 0),
        endAt: mkDate(1, 14, 45),
        timeZone: tz,
        color: '#06B6D4',
      },
      {
        calendarId: personalCal.id,
        title: '🏃 Evening 5K Run & Mobility',
        description: 'Cardio training and mobility routine.',
        location: 'Riverside Park Trail',
        allDay: false,
        startAt: mkDate(1, 18, 0),
        endAt: mkDate(1, 19, 0),
        timeZone: tz,
        color: '#10B981',
      },
      // Day + 2
      {
        calendarId: workCal.id,
        title: '💡 Customer Discovery & Feedback Session',
        description:
          'User interview with enterprise leads regarding calendar integrations.',
        allDay: false,
        startAt: mkDate(2, 11, 0),
        endAt: mkDate(2, 12, 0),
        timeZone: tz,
        color: '#3B82F6',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/customer-discovery-chat',
      },
      {
        calendarId: personalCal.id,
        title: '🩺 Annual Health & Dental Checkup',
        location: 'Downtown Medical Suite 300',
        allDay: false,
        startAt: mkDate(2, 15, 0),
        endAt: mkDate(2, 16, 0),
        timeZone: tz,
        color: '#10B981',
      },
      // Day + 3
      {
        calendarId: workCal.id,
        title: '🌐 Engineering All-Hands & Demo Day',
        description: 'Showcase of sprint accomplishments and cross-team Q&A.',
        allDay: false,
        startAt: mkDate(3, 14, 0),
        endAt: mkDate(3, 15, 30),
        timeZone: tz,
        color: '#8B5CF6',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/engineering-allhands',
      },
      // Day - 1 (Yesterday)
      {
        calendarId: workCal.id,
        title: '📈 Quarterly Business Review & Retrospective',
        description:
          'Review of Key Performance Indicators and retrospective learnings.',
        allDay: false,
        startAt: mkDate(-1, 13, 0),
        endAt: mkDate(-1, 14, 30),
        timeZone: tz,
        color: '#6366F1',
      },
      // Weekend
      {
        calendarId: personalCal.id,
        title: '🎉 Weekend Mountain Hike & Camping Trip',
        description: 'Outdoor retreat with friends.',
        allDay: true,
        startAt: mkDate(5, 0, 0),
        endAt: mkDate(7, 0, 0),
        startDate: mkDate(5, 0, 0),
        endDate: mkDate(7, 0, 0),
        timeZone: tz,
        color: '#10B981',
      },
    ];

    for (const ev of eventsToCreate) {
      await this.prisma.event.create({
        data: ev,
      });
    }
  }
}
