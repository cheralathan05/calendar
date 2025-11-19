'use client'

import { useState, useMemo } from 'react'
import { MonthView } from './views/month-view'
import { WeekView } from './views/week-view'
import { EventModalDialog } from './event-modal-dialog'
import { CalendarHeader } from './calendar-header'
import { Calendar, List } from 'lucide-react'
import type { ViewType, CalendarEvent } from './types'

// Ensure tw-animate-css is installed and configured in tailwind.config.js
// plugins: [require('tailwindcss-animate')],

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    startDate: new Date(2025, 10, 19, 9, 0),
    endDate: new Date(2025, 10, 19, 9, 30),
    color: 'blue',
    isAllDay: false,
  },
  {
    id: '2',
    title: 'Project Review',
    startDate: new Date(2025, 10, 20, 14, 0),
    endDate: new Date(2025, 10, 20, 15, 30),
    color: 'green',
    isAllDay: false,
  },
  {
    id: '3',
    title: 'Design Sprint',
    startDate: new Date(2025, 10, 21),
    endDate: new Date(2025, 10, 21),
    color: 'purple',
    isAllDay: true,
  },
]

export function CalendarView() {
  const [viewType, setViewType] = useState<ViewType>('month')
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 19))
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newEventDate, setNewEventDate] = useState<Date>()

  const handleAddEvent = (event: CalendarEvent) => {
    const existingIndex = events.findIndex((e) => e.id === event.id)
    if (existingIndex >= 0) {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
    } else {
      setEvents((prev) => [...prev, event])
    }
    setSelectedEvent(undefined)
    setIsModalOpen(false)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    setSelectedEvent(undefined)
    setIsModalOpen(false)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleDayClick = (date: Date) => {
    setNewEventDate(date)
    setSelectedEvent(undefined)
    setIsModalOpen(true)
  }

  const handleTimeSlotClick = (date: Date) => {
    setNewEventDate(date)
    setSelectedEvent(undefined)
    setIsModalOpen(true)
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleCreateEvent = () => {
    setSelectedEvent(undefined)
    setNewEventDate(new Date())
    setIsModalOpen(true)
  }

  const viewOptions: { type: ViewType; label: string; icon: React.ReactNode }[] = [
    { type: 'month', label: 'Month', icon: <Calendar className="w-4 h-4" aria-hidden="true" /> },
    { type: 'week', label: 'Week', icon: <List className="w-4 h-4" aria-hidden="true" /> },
  ]

  return (
    <main className="min-h-screen bg-background">
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onCreateEvent={handleCreateEvent}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* View Switcher with subtle group hover animation */}
        <div
          className="flex gap-2 mb-6 border-b border-border pb-4"
          role="tablist"
          aria-label="Calendar view options"
        >
          {viewOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => setViewType(option.type)}
              role="tab"
              aria-selected={viewType === option.type}
              aria-controls={`${option.type}-panel`}
              // Added animation classes for a subtle button effect
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-out 
                focus:outline-none focus:ring-2 focus:ring-focus 
                ${
                  viewType === option.type
                    ? 'bg-accent text-accent-foreground shadow-md animate-in fade-in zoom-in-95' // Active view button animation
                    : 'hover:bg-secondary text-foreground hover:scale-[1.02] active:scale-95' // Inactive view button hover
                }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {/* Month View - Animated Transition */}
        {viewType === 'month' && (
          <div
            key="month-view" // Add a key to force re-mounting and trigger animation
            id="month-panel"
            role="tabpanel"
            aria-labelledby="month-tab"
            // Animation classes for the month view
            className="animate-in fade-in slide-in-from-left-2 duration-500 ease-out"
          >
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          </div>
        )}

        {/* Week View - Animated Transition */}
        {viewType === 'week' && (
          <div
            key="week-view" // Add a key to force re-mounting and trigger animation
            id="week-panel"
            role="tabpanel"
            aria-labelledby="week-tab"
            // Animation classes for the week view (e.g., sliding from right)
            className="animate-in fade-in slide-in-from-right-2 duration-500 ease-out"
          >
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
            />
          </div>
        )}

        {/* Event Modal - Animated Entry/Exit */}
        <EventModalDialog
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedEvent(undefined)
            setNewEventDate(undefined)
          }}
          onSave={handleAddEvent}
          onDelete={handleDeleteEvent}
          defaultDate={newEventDate}
          // Add animation props directly to the dialog if it supports them,
          // otherwise wrap it in a conditional animation container.
          // Assuming EventModalDialog will pass these to a wrapper div or similar.
          
        />
      </div>
    </main>
  )
}