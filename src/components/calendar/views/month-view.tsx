'use client'

import { useMemo, useState, useRef, memo } from 'react'
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  format,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useMemoizedEvents } from '@/hooks/use-memoized-events'
import type { CalendarEvent } from '../types'

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_MOBILE = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const EVENT_COLORS = {
  blue: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800',
  red: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800',
  green: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800',
  yellow: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800',
  purple: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-800',
}

const CalendarCell = memo(({
  date,
  events,
  isCurrentMonth,
  isDayToday,
  isFocusedDate,
  isMobile,
  onEventClick,
  onDayClick,
  onKeyDown,
  cellRef,
}: {
  date: Date
  events: CalendarEvent[]
  isCurrentMonth: boolean
  isDayToday: boolean
  isFocusedDate: boolean
  isMobile: boolean
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  cellRef: React.Ref<HTMLDivElement>
}) => (
  <div
    ref={cellRef}
    className={`min-h-20 sm:min-h-24 md:min-h-28 p-1 sm:p-2 md:p-3 bg-card transition-colors cursor-pointer hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${
      isCurrentMonth
        ? 'text-foreground'
        : 'text-muted-foreground bg-muted/20'
    } ${isDayToday ? 'bg-blue-50 dark:bg-blue-950' : ''} ${
      isFocusedDate ? 'ring-2 ring-accent' : ''
    }`}
    role="gridcell"
    aria-label={`${format(date, isMobile ? 'PPP' : 'PPPP')}${events.length > 0 ? `, ${events.length} event${events.length !== 1 ? 's' : ''}` : ''}`}
    onClick={() => onDayClick?.(date)}
    onKeyDown={onKeyDown}
    tabIndex={isFocusedDate ? 0 : -1}
  >
    <div
      className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 md:mb-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-center ${
        isDayToday ? 'bg-accent text-accent-foreground' : ''
      }`}
      aria-hidden="true"
    >
      {format(date, 'd')}
    </div>

    <div className="space-y-0.5 sm:space-y-1">
      {events.slice(0, isMobile ? 1 : 2).map((event) => (
        <div
          key={event.id}
          className={`event-badge ${EVENT_COLORS[event.color]} text-xs py-0.5 sm:py-1 px-1 truncate`}
          role="button"
          tabIndex={0}
          aria-label={`${event.title}${event.isAllDay ? ', all day' : ''}`}
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
          <span className="sr-only">{event.title}</span>
          <span aria-hidden="true" className="block truncate">
            {!isMobile && (event.isAllDay ? '●' : format(event.startDate, 'H:mm') + ' ')}
            {event.title}
          </span>
        </div>
      ))}
      {events.length > (isMobile ? 1 : 2) && (
        <div className="text-xs text-muted-foreground px-1 py-0.5" aria-label={`${events.length - (isMobile ? 1 : 2)} more events`}>
          +{events.length - (isMobile ? 1 : 2)}
        </div>
      )}
    </div>
  </div>
))

CalendarCell.displayName = 'CalendarCell'

export function MonthView({ currentDate, events, onEventClick, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const [focusedDate, setFocusedDate] = useState(new Date())
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isMobile = useMediaQuery('(max-width: 640px)')

  const { getEventsForDay } = useMemoizedEvents(events, currentDate, 'month')

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  )

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, date: Date) => {
    let newFocusDate = focusedDate

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        newFocusDate = addDays(focusedDate, -7)
        break
      case 'ArrowDown':
        e.preventDefault()
        newFocusDate = addDays(focusedDate, 7)
        break
      case 'ArrowLeft':
        e.preventDefault()
        newFocusDate = addDays(focusedDate, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        newFocusDate = addDays(focusedDate, 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onDayClick?.(date)
        return
      default:
        return
    }

    setFocusedDate(newFocusDate)
    const key = newFocusDate.toISOString()
    const ref = cellRefs.current.get(key)
    ref?.focus()
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px bg-border" role="rowgroup">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className="bg-secondary text-secondary-foreground p-1.5 sm:p-2 md:p-4 text-center font-semibold text-xs sm:text-sm"
            role="columnheader"
            aria-label={day}
          >
            <span className="hidden md:inline">{DAYS_SHORT[index]}</span>
            <span className="hidden sm:inline md:hidden">{DAYS_SHORT[index]}</span>
            <span className="sm:hidden">{DAYS_MOBILE[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid - uses memoized cells */}
      <div className="grid grid-cols-7 gap-px bg-border" role="rowgroup">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isDayToday = isToday(day)
          const isFocusedDate = isSameDay(day, focusedDate)
          const dateKey = day.toISOString()

          return (
            <CalendarCell
              key={`${dateKey}-${index}`}
              date={day}
              events={dayEvents}
              isCurrentMonth={isCurrentMonth}
              isDayToday={isDayToday}
              isFocusedDate={isFocusedDate}
              isMobile={isMobile}
              onEventClick={onEventClick}
              onDayClick={onDayClick}
              onKeyDown={(e) => handleCellKeyDown(e, day)}
              cellRef={(el) => {
                if (el) cellRefs.current.set(dateKey, el)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
