'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { EventForm } from './event-form'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { CalendarEvent } from './types'

interface EventModalDialogProps {
  event?: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
  defaultDate?: Date
}

export function EventModalDialog({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDate,
}: EventModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isMobile = useMediaQuery('(max-width: 640px)')

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      className={`rounded-lg shadow-xl backdrop:bg-black/50 max-w-md w-full ${
        isMobile ? 'mx-4' : ''
      }`}
      onClose={onClose}
    >
      <div className={`bg-card p-4 sm:p-6 max-h-[90vh] overflow-y-auto ${
        isMobile ? 'w-screen max-w-[calc(100vw-2rem)]' : ''
      }`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </button>
        </div>

        <EventForm
          initialEvent={event}
          onSubmit={(newEvent) => {
            onSave(newEvent)
            onClose()
          }}
          onCancel={onClose}
          defaultDate={defaultDate}
        />

        {event && onDelete && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
            <button
              onClick={() => {
                if (confirm('Delete this event?')) {
                  onDelete(event.id)
                  onClose()
                }
              }}
              className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Delete Event
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
