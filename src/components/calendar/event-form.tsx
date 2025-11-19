'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { CalendarEvent } from './types'

interface EventFormProps {
  initialEvent?: CalendarEvent
  onSubmit: (event: CalendarEvent) => void
  onCancel: () => void
  defaultDate?: Date
}

const COLOR_OPTIONS = [
  { value: 'blue' as const, label: 'Blue', className: 'bg-blue-500' },
  { value: 'red' as const, label: 'Red', className: 'bg-red-500' },
  { value: 'green' as const, label: 'Green', className: 'bg-green-500' },
  { value: 'yellow' as const, label: 'Yellow', className: 'bg-yellow-500' },
  { value: 'purple' as const, label: 'Purple', className: 'bg-purple-500' },
]

export function EventForm({ initialEvent, onSubmit, onCancel, defaultDate }: EventFormProps) {
  const [title, setTitle] = useState(initialEvent?.title || '')
  const [description, setDescription] = useState(initialEvent?.description || '')
  const [startDate, setStartDate] = useState(
    initialEvent?.startDate ? format(initialEvent.startDate, "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [endDate, setEndDate] = useState(
    initialEvent?.endDate ? format(initialEvent.endDate, "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [color, setColor] = useState(initialEvent?.color || 'blue')
  const [isAllDay, setIsAllDay] = useState(initialEvent?.isAllDay || false)
  const [location, setLocation] = useState(initialEvent?.location || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Event title is required'
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const newEvent: CalendarEvent = {
      id: initialEvent?.id || Date.now().toString(),
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      color,
      isAllDay,
      location,
    }

    onSubmit(newEvent)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Title Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
          Event Title <span aria-label="required">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (errors.title) setErrors({ ...errors, title: '' })
          }}
          placeholder="Enter event title"
          className={`w-full px-3 py-2 border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent ${
            errors.title ? 'border-destructive' : 'border-border'
          }`}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          required
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive mt-1">
            {errors.title}
          </p>
        )}
      </div>

      {/* Description Input */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add event details"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Location Input */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter location"
          className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* All Day Checkbox */}
      <div className="flex items-center gap-3">
        <input
          id="all-day"
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-accent"
          aria-label="Mark as all day event"
        />
        <label htmlFor="all-day" className="text-sm font-medium text-foreground cursor-pointer">
          All day event
        </label>
      </div>

      {/* Start Date & Time Input */}
      {!isAllDay && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-2">
                Start Date & Time <span aria-label="required">*</span>
              </label>
              <input
                id="start-date"
                type="datetime-local"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (errors.startDate) setErrors({ ...errors, startDate: '' })
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent ${
                  errors.startDate ? 'border-destructive' : 'border-border'
                }`}
                aria-invalid={!!errors.startDate}
                aria-describedby={errors.startDate ? 'start-date-error' : undefined}
                required
              />
              {errors.startDate && (
                <p id="start-date-error" className="text-sm text-destructive mt-1">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-foreground mb-2">
                End Date & Time <span aria-label="required">*</span>
              </label>
              <input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  if (errors.endDate) setErrors({ ...errors, endDate: '' })
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent ${
                  errors.endDate ? 'border-destructive' : 'border-border'
                }`}
                aria-invalid={!!errors.endDate}
                aria-describedby={errors.endDate ? 'end-date-error' : undefined}
                required
              />
              {errors.endDate && (
                <p id="end-date-error" className="text-sm text-destructive mt-1">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* All Day Date Inputs */}
      {isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="all-day-start" className="block text-sm font-medium text-foreground mb-2">
              Start Date <span aria-label="required">*</span>
            </label>
            <input
              id="all-day-start"
              type="date"
              value={startDate.split('T')[0] || ''}
              onChange={(e) => setStartDate(e.target.value + 'T00:00')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label htmlFor="all-day-end" className="block text-sm font-medium text-foreground mb-2">
              End Date <span aria-label="required">*</span>
            </label>
            <input
              id="all-day-end"
              type="date"
              value={endDate.split('T')[0] || ''}
              onChange={(e) => setEndDate(e.target.value + 'T23:59')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
        </div>
      )}

      {/* Color Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Color</label>
        <div className="flex gap-3" role="group" aria-label="Event color selection">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              className={`w-8 h-8 rounded-lg ${option.className} transition-all border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent ${
                color === option.value ? 'border-foreground' : 'border-transparent'
              }`}
              aria-label={`Select ${option.label} color`}
              aria-pressed={color === option.value}
              title={option.label}
            />
          ))}
        </div>
      </div>

      {/* Form Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          {initialEvent ? 'Update' : 'Create'} Event
        </button>
      </div>
    </form>
  )
}
