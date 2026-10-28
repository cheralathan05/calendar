import { eventMinutesWithinDay } from './day-layout';

/**
 * Greedy column assignment for overlapping events.
 * - Only considers the event's portion within the given day (via eventMinutesWithinDay).
 * - Returns each event with a column index and the total columns in its overlap group.
 */
export function layoutOverlappingEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  // Clamp to the current day and sort by start
  const items = events
    .map((event) => {
      const { startMin, endMin } = eventMinutesWithinDay(event, day);
      return { event, startMin, endMin };
    })
    .filter((x) => x.endMin > x.startMin)
    .sort(
      (a, b) =>
        a.startMin - b.startMin || a.endMin - b.endMin || a.event.id.localeCompare(b.event.id),
    );

  const result: PositionedEvent[] = [];

  let i = 0;
  while (i < items.length) {
    // Build one overlap group: all events that connect by overlap
    const group: typeof items = [];
    let groupEnd = items[i].endMin;

    group.push(items[i]);
    i++;

    while (i < items.length && items[i].startMin < groupEnd) {
      group.push(items[i]);
      groupEnd = Math.max(groupEnd, items[i].endMin);
      i++;
    }

    // Assign columns within group
    // columns[k] = endMin of last event in column k
    const columns: number[] = [];
    const placed = group.map((g) => {
      let col = 0;

      // find first column that is free
      while (col < columns.length && g.startMin < columns[col]) col++;

      if (col === columns.length) columns.push(g.endMin);
      else columns[col] = g.endMin;

      return { ...g, col };
    });

    const colCount = columns.length;
    for (const p of placed) {
      result.push({
        event: p.event,
        startMin: p.startMin,
        endMin: p.endMin,
        col: p.col,
        colCount,
      });
    }
  }

  return result;
}
