import { useEffect, useCallback } from 'react'

interface KeyboardNavConfig {
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onEnter?: () => void
  onEscape?: () => void
  onSpace?: () => void
}

export function useKeyboardNavigation(config: KeyboardNavConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          config.onArrowUp?.()
          break
        case 'ArrowDown':
          e.preventDefault()
          config.onArrowDown?.()
          break
        case 'ArrowLeft':
          e.preventDefault()
          config.onArrowLeft?.()
          break
        case 'ArrowRight':
          e.preventDefault()
          config.onArrowRight?.()
          break
        case 'Enter':
          e.preventDefault()
          config.onEnter?.()
          break
        case 'Escape':
          e.preventDefault()
          config.onEscape?.()
          break
        case ' ':
          if (config.onSpace) {
            e.preventDefault()
            config.onSpace()
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [config])
}

export function useCalendarKeyboard(
  onMonthChange: (direction: 'prev' | 'next') => void,
  onCreateEvent: () => void,
  onNavigateDate: (direction: 'up' | 'down' | 'left' | 'right') => void
) {
  return useKeyboardNavigation({
    onArrowLeft: () => onMonthChange('prev'),
    onArrowRight: () => onMonthChange('next'),
    onArrowUp: () => onNavigateDate('up'),
    onArrowDown: () => onNavigateDate('down'),
    onEnter: onCreateEvent,
  })
}
