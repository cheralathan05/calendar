export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  color: 'blue' | 'red' | 'green' | 'yellow' | 'purple'
  isAllDay: boolean
  attendees?: string[]
  location?: string
  reminder?: number // minutes before event
}

export type ViewType = 'month' | 'week' | 'day'

export interface CalendarState {
  currentDate: Date
  viewType: ViewType
  events: CalendarEvent[]
  selectedEvent?: CalendarEvent
  isLoading: boolean
}
