import { useState, useCallback } from 'react'
import type { CalendarEvent, ViewType } from '@/components/calendar/types'

export function useCalendarState() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>()

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => [...prev, event])
  }, [])

  const updateEvent = useCallback((event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
  }, [])

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }, [])

  return {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    selectedEvent,
    setSelectedEvent,
  }
}
