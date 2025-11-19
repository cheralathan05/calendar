import { useState, useCallback } from 'react'

interface DragState {
  isDragging: boolean
  draggedItem: any
  dragOffset: { x: number; y: number }
}

export function useDragDrop() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
  })

  const handleDragStart = useCallback((e: React.DragEvent, item: any) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOffset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    })
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  return {
    ...dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
  }
}
