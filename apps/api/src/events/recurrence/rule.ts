import { addMilliseconds } from 'date-fns';
import { RRule } from 'rrule';

/** Normalize a user-provided RRULE into the bare rule body (no DTSTART, no leading RRULE:). */
export function normalizeRuleOnly(
  rule: string | null | undefined,
): string | null {
  if (!rule) return null;
  const trimmed = rule.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  const rruleLine = lines.find((l) => l.toUpperCase().startsWith('RRULE:'));
  const candidate = rruleLine ?? trimmed;

  return candidate.toUpperCase().startsWith('RRULE:')
    ? candidate.slice('RRULE:'.length)
    : candidate;
}

/** Build an RRule anchored to a *floating* DTSTART (timezone applied separately). */
export function buildFloatingRule(ruleOnly: string, dtstartNaive: Date): RRule {
  // Avoid embedding DTSTART in the string and relying on rrulestr's parsing
  // (which interprets floating DTSTART using the process locale). Instead,
  // parse the RRULE into options and set dtstart explicitly using the naive
  // date components so iteration is deterministic regardless of system TZ.
  const opts = RRule.parseString(ruleOnly);
  // Build a naive Date carrying the same Y/M/D/H/M/S fields.
  opts.dtstart = new Date(
    dtstartNaive.getFullYear(),
    dtstartNaive.getMonth(),
    dtstartNaive.getDate(),
    dtstartNaive.getHours(),
    dtstartNaive.getMinutes(),
    dtstartNaive.getSeconds(),
    dtstartNaive.getMilliseconds(),
  );
  return new RRule(opts);
}

/**
 * Walk a rule forward, returning occurrences in [fromNaive, toNaive),
 * capped at `max` to bound CPU/memory for hostile or unbounded rules.
 */
export function generateAfterExclusive(args: {
  rule: RRule;
  fromNaive: Date;
  toNaive: Date;
  max: number;
}): Date[] {
  const { rule, fromNaive, toNaive, max } = args;
  const out: Date[] = [];
  let cursor = addMilliseconds(fromNaive, -1);

  while (out.length < max) {
    const next = rule.after(cursor, false);
    if (!next) break;
    if (next >= toNaive) break;
    if (next.getTime() <= cursor.getTime()) break;
    out.push(next);
    cursor = next;
  }

  return out;
}
