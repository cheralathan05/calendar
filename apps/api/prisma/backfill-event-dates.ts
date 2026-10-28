import { PrismaClient } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

/**
 * Convert an instant to a DATE-only value (stored as @db.Date) for the given tz.
 * We store it as a JS Date at 00:00:00Z of that calendar date.
 *
 * Example:
 * - instant: 2026-02-03T17:00:00Z
 * - tz: Asia/Jakarta (local = 2026-02-04 00:00)
 * - result: 2026-02-04T00:00:00.000Z  (represents DATE 2026-02-04)
 */
function dateOnlyFromInstantInTz(instant: Date, tz: string): Date {
  const z = toZonedTime(instant, tz);
  return new Date(
    Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0, 0),
  );
}

async function main() {
  const BATCH_SIZE = 200;

  let updated = 0;
  let scanned = 0;

  // Scan all all-day events missing startDate/endDate
  // (Also fixes partially-filled rows.)
  while (true) {
    const rows = await prisma.event.findMany({
      where: {
        allDay: true,
        OR: [{ startDate: null }, { endDate: null }],
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        timeZone: true,
        recurrenceTimeZone: true,
        startDate: true,
        endDate: true,
      },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (rows.length === 0) break;

    scanned += rows.length;

    for (const ev of rows) {
      const tz = ev.recurrenceTimeZone ?? ev.timeZone ?? 'UTC';

      // Derive date-only start/end from existing instants.
      // endDate is exclusive in your model semantics; this derives that as well.
      const startDate = dateOnlyFromInstantInTz(ev.startAt, tz);
      const endDate = dateOnlyFromInstantInTz(ev.endAt, tz);

      // Sanity: ensure endDate > startDate for all-day.
      // If old data had endAt==startAt or wrong, force +1 day.
      let normalizedEndDate = endDate;
      if (normalizedEndDate.getTime() <= startDate.getTime()) {
        normalizedEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      }

      // Skip if already correct
      const startSame =
        ev.startDate?.toISOString?.() === startDate.toISOString();
      const endSame =
        ev.endDate?.toISOString?.() === normalizedEndDate.toISOString();

      if (startSame && endSame) continue;

      await prisma.event.update({
        where: { id: ev.id },
        data: {
          startDate,
          endDate: normalizedEndDate,
        },
      });

      updated++;
    }
  }

  console.log(`[backfill-event-dates] scanned=${scanned} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error('[backfill-event-dates] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
