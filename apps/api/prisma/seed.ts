import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUser(email: string, name: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  // Remove existing demo events for clean refresh
  await prisma.event.deleteMany({
    where: { calendar: { ownerId: user.id } },
  });

  let workCal = await prisma.calendar.findFirst({
    where: { ownerId: user.id, name: 'Work & Projects' },
  });
  if (!workCal) {
    workCal = await prisma.calendar.create({
      data: { ownerId: user.id, name: 'Work & Projects', color: '#0B57D0' },
    });
  }

  let personalCal = await prisma.calendar.findFirst({
    where: { ownerId: user.id, name: 'Personal & Health' },
  });
  if (!personalCal) {
    personalCal = await prisma.calendar.create({
      data: { ownerId: user.id, name: 'Personal & Health', color: '#10B981' },
    });
  }

  let tasksCal = await prisma.calendar.findFirst({
    where: { ownerId: user.id, name: 'Tasks & Focus' },
  });
  if (!tasksCal) {
    tasksCal = await prisma.calendar.create({
      data: { ownerId: user.id, name: 'Tasks & Focus', color: '#F59E0B' },
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

  const events = [
    {
      calendarId: workCal.id,
      title: '🚀 Team Daily Standup & Sprint Sync',
      description: 'Review blockers, daily commitments, and PR reviews with the distributed engineering team.',
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
      description: 'Walkthrough of the modern monorepo redesign, typography scale, and dark mode palette.',
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
      description: 'High-focus window for state machine optimization and Next.js 16 App Router enhancements.',
      allDay: false,
      startAt: mkDate(0, 14, 30),
      endAt: mkDate(0, 16, 30),
      timeZone: tz,
      color: '#F59E0B',
    },
    {
      calendarId: workCal.id,
      title: '🏆 Q4 Milestone Sprint Launch',
      description: 'Company-wide release of modern collaborative scheduling platform.',
      allDay: true,
      startAt: mkDate(0, 0, 0),
      endAt: mkDate(1, 0, 0),
      startDate: mkDate(0, 0, 0),
      endDate: mkDate(1, 0, 0),
      timeZone: tz,
      color: '#EC4899',
    },
    {
      calendarId: tasksCal.id,
      title: '✅ Review Pull Request #142 (Calendar Monolith UI)',
      description: '#task Review code changes, verify end-to-end flow, and approve deployment.',
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
      description: '#task Outline high-level initiatives, dependencies, and deliverables.',
      allDay: true,
      startAt: mkDate(0, 0, 0),
      endAt: mkDate(1, 0, 0),
      startDate: mkDate(0, 0, 0),
      endDate: mkDate(1, 0, 0),
      timeZone: tz,
      color: '#F59E0B',
    },
    {
      calendarId: workCal.id,
      title: '📊 Sprint Planning & Backlog Grooming',
      description: 'Estimate user stories, define sprint goals, and prioritize upcoming features.',
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
      description: 'Bi-weekly check-in on technical strategy and career trajectory.',
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
    {
      calendarId: workCal.id,
      title: '💡 Customer Discovery & Feedback Session',
      description: 'User interview with enterprise leads regarding calendar integrations.',
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
    {
      calendarId: workCal.id,
      title: '📈 Quarterly Business Review & Retrospective',
      description: 'Review of Key Performance Indicators and retrospective learnings.',
      allDay: false,
      startAt: mkDate(-1, 13, 0),
      endAt: mkDate(-1, 14, 30),
      timeZone: tz,
      color: '#6366F1',
    },
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

  for (const ev of events) {
    await prisma.event.create({ data: ev });
  }

  console.log(`Seeded ${events.length} events for ${email}`);
}

async function main() {
  await seedUser('demo@calendar-clone.local', 'Demo User');
  await seedUser('alex.pm@calendar-clone.local', 'Alex Morgan');
  await seedUser('sarah.tech@calendar-clone.local', 'Sarah Chen');
  await seedUser('marcus.founder@calendar-clone.local', 'Marcus Vance');
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
