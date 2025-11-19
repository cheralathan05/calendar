'use client'

import { useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useEventSearch } from '@/hooks/use-event-search'
import type { CalendarEvent } from './types'

interface AdvancedEventFiltersProps {
  events: CalendarEvent[]
  onFiltered: (events: CalendarEvent[]) => void
}

const COLORS = ['blue', 'red', 'green', 'yellow', 'purple'] as const

export function AdvancedEventFilters({ events, onFiltered }: AdvancedEventFiltersProps) {
  const { searchQuery, setSearchQuery, filters, setFilters, searchResults } = useEventSearch(events)

  useMemo(() => {
    onFiltered(searchResults)
  }, [searchResults, onFiltered])

  return (
    <div className="bg-card p-4 rounded-lg border border-border space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Search events"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 hover:bg-secondary rounded-lg p-1"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Color Filters */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Filter by Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                const colors = filters.colors || []
                const newColors = colors.includes(color)
                  ? colors.filter((c) => c !== color)
                  : [...colors, color]
                setFilters({ ...filters, colors: newColors.length > 0 ? newColors : undefined })
              }}
              className={`w-6 h-6 rounded-lg border-2 transition-all ${
                (filters.colors?.includes(color)) ? 'border-foreground' : 'border-transparent'
              } bg-${color}-500`}
              aria-label={`Filter by ${color} color`}
              aria-pressed={filters.colors?.includes(color)}
            />
          ))}
        </div>
      </div>

      {/* Event Type Filter */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Event Type</label>
        <button
          onClick={() => setFilters({ ...filters, isAllDay: filters.isAllDay === true ? undefined : true })}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            filters.isAllDay === true
              ? 'bg-accent text-accent-foreground'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >
          All Day Only
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {searchResults.length} event{searchResults.length !== 1 ? 's' : ''} found
      </div>
    </div>
  )
}
