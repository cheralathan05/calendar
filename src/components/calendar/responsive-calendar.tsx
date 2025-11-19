'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { ViewType } from './types'

interface ResponsiveCalendarProps {
  children: React.ReactNode
  viewType: ViewType
}

export function ResponsiveCalendar({ children, viewType }: ResponsiveCalendarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {viewType === 'month' ? 'Month' : 'Week'}
          </h2>
          <div className="w-10" />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
