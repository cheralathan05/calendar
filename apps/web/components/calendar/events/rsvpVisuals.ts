// Centralized RSVP visuals helper used by calendar views

// Helper: accept '#RRGGBB' or 'rgba(...)' and return an rgba() string with provided alpha
function toRgba(input: string | undefined, alpha = 0.16) {
  if (!input) return `rgba(3,155,229,${alpha})`;
  const s = String(input).trim();
  if (s.startsWith('rgba')) {
    const m = s.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/i);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
    return s;
  }
  if (s.startsWith('rgb(')) {
    const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  const hex = s.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(3,155,229,${alpha})`;
}

function extractLighterColorFromGuests(guests: unknown): string | undefined {
  if (!guests) return undefined;
  if (typeof guests === 'object' && !Array.isArray(guests)) {
    const obj = guests as Record<string, unknown>;
    if (typeof obj.lighterColor === 'string') return obj.lighterColor;
  }
  if (Array.isArray(guests)) {
    for (const g of guests) {
      if (g && typeof g === 'object') {
        const gg = g as Record<string, unknown>;
        if (typeof gg.lighterColor === 'string') return gg.lighterColor;
      }
    }
  }
  return undefined;
}

export type RsvpVisuals = {
  rsvp?: string | undefined;
  isDeclined: boolean;
  isTentative: boolean;
  baseColor: string;
  background: string | undefined;
  borderLeft?: string | undefined;
  titleClass: string;
  textColorClass: string;
};

/**
 * Resolve RSVP visuals for an event-like object. Accepts objects shaped like
 * CalendarEvent or ApiEvent. Returns background, border and text classes.
 */
export function resolveRsvpVisuals(ev: unknown): RsvpVisuals {
  const evt = ev as
    | {
        attendees?: Array<{ email?: string; rsvp?: string }>;
        userRsvp?: string;
        color?: string;
        guests?: unknown;
      }
    | undefined;
  const attendee = evt?.attendees?.find((a) => !!a.email);
  const rsvp = evt?.userRsvp ?? attendee?.rsvp;
  const isDeclined = rsvp === 'declined';
  const isTentative = rsvp === 'tentative';

  const guestLighter = extractLighterColorFromGuests(evt?.guests);
  const baseColor = (guestLighter ?? evt?.color ?? '#039BE5') as string;
  const stripe = toRgba(baseColor, 0.16);
  // Tentative: denser diagonal stripes; declined -> transparent
  const background = isDeclined
    ? 'transparent'
    : isTentative
      ? `repeating-linear-gradient(135deg, ${stripe} 0 3px, transparent 3px 7px), ${baseColor}`
      : baseColor;
  const borderLeft = isTentative ? `4px solid ${baseColor}` : undefined;
  const titleClass = isDeclined ? 'line-through' : '';
  const textColorClass = isDeclined ? 'text-[#0B57D0]' : 'text-white';

  return {
    rsvp,
    isDeclined,
    isTentative,
    baseColor,
    background,
    borderLeft,
    titleClass,
    textColorClass,
  };
}
