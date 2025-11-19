'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { CalendarEvent } from './types'

interface EventModalProps {
  event?: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
}

export function EventModal({ event, isOpen, onClose, onSave }: EventModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      className="rounded-lg shadow-lg backdrop:bg-black/50 max-w-md w-full"
      onClose={onClose}
    >
      <div className="bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          onClose()
        }}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              placeholder="Event title"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground"
              defaultValue={event?.title}
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
