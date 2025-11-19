'use client'

import { useMemo } from 'react'
import {
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  addHours,
  isSameDay,
  isToday,
} from 'date-fns'
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import type { CalendarEvent } from '../types'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onTimeSlotClick?: (date: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate)
  const weekEnd = endOfWeek(currentDate)
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  )

  const visibleHours = isMobile ? HOURS.slice(8, 18) : HOURS

  const getEventsForHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      const hourStart = addHours(day, hour)
      const hourEnd = addHours(day, hour + 1)

      return (
        eventStart < hourEnd &&
        eventEnd > hourStart &&
        isSameDay(day, eventStart)
      )
    })
  }

  const visibleDays = isMobile ? days.slice(1, 6) : days

  return (
    <div className="bg-card rounded-lg border border-border overflow-auto shadow-sm">
      <div className="min-w-full">
        {/* Header with Days */}
        <div
          className="grid gap-px bg-border sticky top-0 z-10"
          style={{ gridTemplateColumns: `${isMobile ? '50px' : '60px'} repeat(${visibleDays.length}, 1fr)` }}
        >
          <div className="bg-secondary text-secondary-foreground p-2 sm:p-4" />
          {visibleDays.map((day) => {
            const isDayToday = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={`bg-secondary text-secondary-foreground p-2 sm:p-4 text-center font-semibold text-xs sm:text-sm ${
                  isDayToday ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <div className="hidden sm:block">{format(day, 'EEE')}</div>
                <div className="sm:hidden">{format(day, 'E')}</div>
                <div className="text-sm sm:text-lg">{format(day, 'd')}</div>
              </div>
            )
          })}
        </div>

        {/* Hours Grid */}
        <div
          className="grid gap-px bg-border"
          style={{ gridTemplateColumns: `${isMobile ? '50px' : '60px'} repeat(${visibleDays.length}, 1fr)` }}
        >
          {visibleHours.map((hour) => (
            <div key={`hour-${hour}`}>
              {/* Time Label */}
              <div
                className="bg-card text-muted-foreground text-xs font-medium p-1 sm:p-2 h-16 sm:h-20 flex items-start justify-center border-r border-border"
                role="columnheader"
              >
                <span className="hidden sm:inline">{format(addHours(new Date(), hour), 'H:mm')}</span>
                <span className="sm:hidden">{format(addHours(new Date(), hour), 'H')}</span>
              </div>

              {/* Hour cells for each day */}
              {visibleDays.map((day) => {
                const hourEvents = getEventsForHour(day, hour)
                const isDayToday = isToday(day)

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`h-16 sm:h-20 p-0.5 sm:p-1 border-b border-border cursor-pointer transition-colors ${
                      isDayToday ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-secondary'
                    }`}
                    role="gridcell"
                    aria-label={`${format(day, isMobile ? 'PPP' : 'PPPP')} ${hour}:00`}
                    onClick={() => onTimeSlotClick?.(addHours(day, hour))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onTimeSlotClick?.(addHours(day, hour))
                      }
                    }}
                    tabIndex={0}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-0.5 sm:p-1 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100`}
                        role="button"
                        tabIndex={0}
                        aria-label={event.title}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(event)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
