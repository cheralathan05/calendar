import type { Metadata } from 'next';
import { Suspense } from 'react';
import { format } from 'date-fns';
import CalendarPageClient from '@/components/calendar/CalendarPageClient';

type SearchParams = Record<string, string | string[] | undefined>;

function getFirst(sp: SearchParams, key: string) {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? undefined;
  return v;
}

function parseIsoDateOnly(value: string | undefined): Date {
  if (!value) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return new Date();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

function parseView(value: string | undefined): CalendarView {
  if (value === 'year' || value === 'month' || value === 'week' || value === 'day' || value === 'schedule') return value;
  return 'month';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const view = parseView(getFirst(sp, 'view'));
  const date = parseIsoDateOnly(getFirst(sp, 'date'));

  let title: string;
  if (view === 'year') title = format(date, 'yyyy') + ' year';
  else if (view === 'day') title = format(date, 'EEEE, MMMM d, yyyy');
  else if (view === 'schedule') title = 'Schedule · ' + format(date, 'MMMM yyyy');
  else title = format(date, 'MMMM yyyy');

  return { title };
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageClient />
    </Suspense>
  );
}
