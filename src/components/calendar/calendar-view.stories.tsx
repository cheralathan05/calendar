import type { Meta, StoryObj } from '@storybook/react'
import { CalendarView } from './calendar-view'

const meta = {
  title: 'Calendar/CalendarView',
  component: CalendarView,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CalendarView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <CalendarView />,
}

export const MobileView: Story = {
  render: () => <CalendarView />,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}

export const TabletView: Story = {
  render: () => <CalendarView />,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
}

export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-background p-4">
      <CalendarView />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}
