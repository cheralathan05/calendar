'use client'

import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { useMediaQuery } from '@/hooks/use-media-query'

interface CalendarHeaderProps {
  currentDate: Date
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onCreateEvent: () => void
}

export function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onCreateEvent,
}: CalendarHeaderProps) {
  const [focusedButton, setFocusedButton] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  return (
    <header className="bg-card border-b border-border" role="banner">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Logo and Title */}
          {!isMobile && (
            <div className="flex items-center gap-2 sm:gap-3 min-w-fit">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" aria-hidden="true" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground hidden sm:block">Calendar</h1>
            </div>
          )}

          {/* Date Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Date navigation">
            <button
              onClick={onPreviousMonth}
              onFocus={() => setFocusedButton('prev')}
              onBlur={() => setFocusedButton(null)}
              className={`p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedButton === 'prev' ? 'ring-2 ring-accent' : ''
              }`}
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
            <button
              onClick={onToday}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium hover:bg-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent whitespace-nowrap"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              onClick={onNextMonth}
              onFocus={() => setFocusedButton('next')}
              onBlur={() => setFocusedButton(null)}
              className={`p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedButton === 'next' ? 'ring-2 ring-accent' : ''
              }`}
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </button>
          </nav>

          {/* Current Month/Year Display */}
          <div className="text-center min-w-fit">
            <p
              className="text-sm sm:text-lg font-semibold text-foreground"
              aria-label={`Current month: ${format(currentDate, 'MMMM yyyy')}`}
            >
              {isMobile ? format(currentDate, 'MMM yyyy') : format(currentDate, 'MMMM yyyy')}
            </p>
          </div>

          {/* Create Event Button */}
          <button
            onClick={onCreateEvent}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 whitespace-nowrap"
            aria-label="Create new event"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            <span className="hidden sm:inline">New</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
    </header>
  )
}
