import { useMemo, useState } from 'react'
import type { CalendarEvent } from '@/components/calendar/types'

export function useEventSearch(events: CalendarEvent[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<{
    colors?: string[]
    isAllDay?: boolean
  }>({})

  const searchResults = useMemo(() => {
    return events.filter((event) => {
      // Title and description search
      const matchesQuery =
        searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase())

      // Color filter
      const matchesColor =
        !filters.colors || filters.colors.length === 0 || filters.colors.includes(event.color)

      // All day filter
      const matchesAllDay =
        filters.isAllDay === undefined || event.isAllDay === filters.isAllDay

      return matchesQuery && matchesColor && matchesAllDay
    })
  }, [events, searchQuery, filters])

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    searchResults,
  }
}
