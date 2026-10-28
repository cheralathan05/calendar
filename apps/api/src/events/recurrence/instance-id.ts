/** Instance ids are `<masterId>@<isoUtc>` so the API can address a single occurrence. */
export function parseInstanceId(
  id: string,
): { masterId: string; originalStartAt: Date } | null {
  const at = id.indexOf('@');
  if (at < 0) return null;
  const masterId = id.slice(0, at);
  const iso = id.slice(at + 1);
  const d = new Date(iso);
  if (!masterId || Number.isNaN(d.getTime())) return null;
  return { masterId, originalStartAt: d };
}

export function makeInstanceId(
  masterId: string,
  originalStartAtIso: string,
): string {
  return `${masterId}@${originalStartAtIso}`;
}

export function exceptionKey(
  eventId: string,
  originalStartAt: Date | string,
): string {
  const iso =
    typeof originalStartAt === 'string'
      ? originalStartAt
      : originalStartAt.toISOString();
  return `${eventId}|${iso}`;
}
