import { format, parseISO } from 'date-fns';

// Minimal iCalendar export/import helpers for local CalendarEvent model.

function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Reverse of escapeICalText — applied to values read from imported ICS files. */
function unescapeICalText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function foldICalLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push(line.slice(i, i + 75));
    i += 75;
  }
  return parts.join('\r\n ');
}

function toICalDate(d: Date): string {
  return format(d, 'yyyyMMdd');
}

function toICalDateTimeUTC(d: Date): string {
  const iso = d.toISOString().replace(/[-:]/g, '');
  // "2026-01-24T00:00:00.000Z" -> "20260124T000000Z"
  return iso.slice(0, 15) + 'Z';
}

export function exportEventsToICS(events: CalendarEvent[]): string {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//calendar-clone//EN');

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');

    // UID
    lines.push(foldICalLine(`UID:${ev.id}`));

    // Summary/title
    if (ev.title) {
      lines.push(foldICalLine(`SUMMARY:${escapeICalText(ev.title)}`));
    }

    // Description
    if (ev.description) {
      lines.push(foldICalLine(`DESCRIPTION:${escapeICalText(ev.description)}`));
    }

    // Location (we store raw string or JSON string; just emit as-is)
    if (ev.location) {
      lines.push(foldICalLine(`LOCATION:${escapeICalText(String(ev.location))}`));
    }

    // Color as custom property
    if (ev.color) {
      lines.push(foldICalLine(`X-COLOR:${escapeICalText(ev.color)}`));
    }

    const start = parseISO(ev.start);
    const end = parseISO(ev.end);

    if (ev.allDay) {
      // All-day: use VALUE=DATE with local dates (no time component)
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${toICalDate(end)}`);
    } else {
      lines.push(`DTSTART:${toICalDateTimeUTC(start)}`);
      lines.push(`DTEND:${toICalDateTimeUTC(end)}`);
    }

    if (ev.recurrence) {
      const rule = ev.recurrence.startsWith('RRULE:')
        ? ev.recurrence.slice('RRULE:'.length)
        : ev.recurrence;
      lines.push(foldICalLine(`RRULE:${rule}`));
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// Very minimal ICS parser: supports DTSTART/DTEND, SUMMARY, UID, RRULE, DESCRIPTION, LOCATION, X-COLOR.
export function importEventsFromICS(ics: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  // Handle all line-ending styles: CRLF (RFC5545/Windows), LF (Unix), bare CR (old Mac).
  // \r\n must be tested before \r so it's consumed as a unit.
  const lines = ics.split(/\r\n|\r|\n/);

  const unfolded: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (/^[ \t]/.test(line) && unfolded.length) {
      // RFC 5545 line folding: continuation line starts with SPACE or TAB
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let current: Partial<CalendarEvent> | null = null;

  for (const raw of unfolded) {
    if (raw === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (raw === 'END:VEVENT') {
      if (current && current.start && current.end) {
        const id = current.id ?? crypto.randomUUID();
        events.push({
          id,
          // Fall back to 'Untitled' so the API's @MinLength(1) validation doesn't reject it
          title: current.title?.trim() || 'Untitled',
          start: current.start!,
          end: current.end!,
          allDay: current.allDay ?? false,
          description: current.description,
          location: current.location,
          recurrence: current.recurrence ?? null,
          color: current.color ?? '#0B57D0',
        } as CalendarEvent);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const prop = raw.slice(0, idx);
    const value = raw.slice(idx + 1);

    if (prop === 'UID') {
      current.id = value.trim();
    } else if (prop.startsWith('SUMMARY')) {
      current.title = unescapeICalText(value);
    } else if (prop.startsWith('DESCRIPTION')) {
      current.description = unescapeICalText(value);
    } else if (prop.startsWith('LOCATION')) {
      current.location = unescapeICalText(value);
    } else if (prop === 'X-COLOR') {
      current.color = value;
    } else if (prop.startsWith('DTSTART')) {
      if (prop.indexOf('VALUE=DATE') !== -1) {
        // All-day: build a UTC midnight ISO string from YYYYMMDD to avoid local-tz drift
        const y = Number(value.slice(0, 4));
        const m = Number(value.slice(4, 6)) - 1;
        const d = Number(value.slice(6, 8));
        current.start = new Date(Date.UTC(y, m, d, 0, 0, 0)).toISOString();
        current.allDay = true;
      } else {
        // date-time; parse as UTC then to ISO
        const iso = value.replace(/Z$/, '');
        const y = Number(iso.slice(0, 4));
        const m = Number(iso.slice(4, 6)) - 1;
        const d = Number(iso.slice(6, 8));
        const hh = Number(iso.slice(9, 11));
        const mm = Number(iso.slice(11, 13));
        const ss = Number(iso.slice(13, 15));
        const dt = new Date(Date.UTC(y, m, d, hh, mm, ss));
        current.start = dt.toISOString();
        current.allDay = false;
      }
    } else if (prop.startsWith('DTEND')) {
      if (prop.indexOf('VALUE=DATE') !== -1) {
        const y = Number(value.slice(0, 4));
        const m = Number(value.slice(4, 6)) - 1;
        const d = Number(value.slice(6, 8));
        current.end = new Date(Date.UTC(y, m, d, 0, 0, 0)).toISOString();
      } else {
        const iso = value.replace(/Z$/, '');
        const y = Number(iso.slice(0, 4));
        const m = Number(iso.slice(4, 6)) - 1;
        const d = Number(iso.slice(6, 8));
        const hh = Number(iso.slice(9, 11));
        const mm = Number(iso.slice(11, 13));
        const ss = Number(iso.slice(13, 15));
        const dt = new Date(Date.UTC(y, m, d, hh, mm, ss));
        current.end = dt.toISOString();
      }
    } else if (prop === 'RRULE') {
      current.recurrence = value;
    }
  }

  return events;
}
