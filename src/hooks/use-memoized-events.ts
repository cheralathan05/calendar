import { useMemo } from 'react'
import { isSameDay, isSameMonth } from 'date-fns'
import type { CalendarEvent } from '@/components/calendar/types'

interface EventsPerformanceOptions {
  maxEventsPerDay?: number
  useVirtualization?: boolean
}

export function useMemoizedEvents(
  events: CalendarEvent[],
  currentDate: Date,
  viewType: 'month' | 'week',
  options: EventsPerformanceOptions = {}
) {
  const { maxEventsPerDay = 50 } = options

  const memoizedEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth())
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)

        if (viewType === 'month') {
          return eventStart < nextMonth && eventEnd > currentMonth
        }
        return true
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [events, currentDate, viewType])

  // Memoize events grouped by day for faster lookups
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    memoizedEvents.forEach((event) => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      let currentDay = new Date(eventStart)

      while (currentDay <= eventEnd) {
        const key = currentDay.toDateString()
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(event)
        currentDay.setDate(currentDay.getDate() + 1)
      }
    })

    return map
  }, [memoizedEvents])

  const getEventsForDay = (date: Date) => {
    const key = date.toDateString()
    return eventsByDay.get(key) || []
  }

  return {
    memoizedEvents,
    eventsByDay,
    getEventsForDay,
  }
}
