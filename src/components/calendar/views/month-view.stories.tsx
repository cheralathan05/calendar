import type { Meta, StoryObj } from '@storybook/react'
import { MonthView } from './month-view'
import type { CalendarEvent } from '../types'

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    startDate: new Date(2025, 10, 19, 9, 0),
    endDate: new Date(2025, 10, 19, 9, 30),
    color: 'blue',
    isAllDay: false,
  },
  {
    id: '2',
    title: 'All Day Conference',
    startDate: new Date(2025, 10, 20),
    endDate: new Date(2025, 10, 20),
    color: 'green',
    isAllDay: true,
  },
]

const meta = {
  title: 'Calendar/MonthView',
  component: MonthView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    currentDate: { control: 'date' },
    events: { control: 'object' },
  },
} satisfies Meta<typeof MonthView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    currentDate: new Date(2025, 10, 19),
    events: mockEvents,
  },
}

export const WithManyEvents: Story = {
  args: {
    currentDate: new Date(2025, 10, 19),
    events: Array.from({ length: 30 }, (_, i) => ({
      id: `event-${i}`,
      title: `Event ${i + 1}`,
      startDate: new Date(2025, 10, (i % 28) + 1, 9 + i % 8),
      endDate: new Date(2025, 10, (i % 28) + 1, 10 + i % 8),
      color: ['blue', 'red', 'green', 'yellow', 'purple'][i % 5] as any,
      isAllDay: i % 5 === 0,
    })),
  },
}

export const Mobile: Story = {
  args: {
    currentDate: new Date(2025, 10, 19),
    events: mockEvents,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
