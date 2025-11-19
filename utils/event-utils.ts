import { isSameDay, differenceInDays, isAfter, isBefore } from 'date-fns'
import type { CalendarEvent } from '@/components/calendar/types'

/**
 * Check if an event occurs on a specific date
 */
export function eventOccursOnDate(event: CalendarEvent, date: Date): boolean {
  const eventStart = new Date(event.startDate)
  const eventEnd = new Date(event.endDate)
  
  return (
    isSameDay(date, eventStart) ||
    (isAfter(date, eventStart) && isBefore(date, eventEnd)) ||
    isSameDay(date, eventEnd)
  )
}

/**
 * Get the duration of an event in minutes
 */
export function getEventDurationMinutes(event: CalendarEvent): number {
  const start = new Date(event.startDate).getTime()
  const end = new Date(event.endDate).getTime()
  return Math.round((end - start) / (1000 * 60))
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.startDate).getTime()
  const end1 = new Date(event1.endDate).getTime()
  const start2 = new Date(event2.startDate).getTime()
  const end2 = new Date(event2.endDate).getTime()

  return start1 < end2 && start2 < end1
}

/**
 * Get conflicting events for a given event
 */
export function getConflictingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  return allEvents.filter((e) => e.id !== event.id && eventsOverlap(event, e))
}

/**
 * Sort events by start time
 */
export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.startDate).getTime()
    const timeB = new Date(b.startDate).getTime()
    return timeA - timeB
  })
}

/**
 * Get events for a time range
 */
export function getEventsInRange(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    return eventStart < endDate && eventEnd > startDate
  })
}

/**
 * Group events by date
 */
export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  events.forEach((event) => {
    const dateKey = new Date(event.startDate).toDateString()
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)!.push(event)
  })

  return grouped
}

/**
 * Check if event is happening today
 */
export function isEventToday(event: CalendarEvent): boolean {
  return eventOccursOnDate(event, new Date())
}

/**
 * Get upcoming events (next N days)
 */
export function getUpcomingEvents(events: CalendarEvent[], daysAhead: number = 7): CalendarEvent[] {
  const now = new Date()
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  return events
    .filter((event) => {
      const eventStart = new Date(event.startDate)
      return eventStart >= now && eventStart <= futureDate
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}
