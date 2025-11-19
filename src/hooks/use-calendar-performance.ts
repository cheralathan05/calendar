import { useCallback, useRef } from 'react'

interface PerformanceMetrics {
  renderTime: number
  eventCount: number
  memoryUsage?: number
}

export function useCalendarPerformance() {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    eventCount: 0,
  })

  const recordRenderTime = useCallback((startTime: number) => {
    const endTime = performance.now()
    metricsRef.current.renderTime = endTime - startTime
  }, [])

  const recordEventCount = useCallback((count: number) => {
    metricsRef.current.eventCount = count
  }, [])

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current }
  }, [])

  return {
    recordRenderTime,
    recordEventCount,
    getMetrics,
  }
}
