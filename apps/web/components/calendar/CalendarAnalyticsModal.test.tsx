import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarAnalyticsModal } from './CalendarAnalyticsModal';

describe('CalendarAnalyticsModal', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Sprint Planning Sync',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      color: '#039BE5',
    },
    {
      id: '2',
      title: 'Deep Focus Coding',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      allDay: false,
      color: '#3F51B5',
    },
  ];

  it('does not render when closed', () => {
    render(
      <CalendarAnalyticsModal
        open={false}
        onClose={vi.fn()}
        events={mockEvents}
        currentDate={new Date()}
        onScheduleFocusBlock={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Calendar & Productivity Insights/i)).not.toBeInTheDocument();
  });

  it('renders stats and tabs when open', () => {
    render(
      <CalendarAnalyticsModal
        open={true}
        onClose={vi.fn()}
        events={mockEvents}
        currentDate={new Date()}
        onScheduleFocusBlock={vi.fn()}
      />,
    );
    expect(screen.getByText(/Calendar & Productivity Insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/Overview & Workload/i)).toBeInTheDocument();
    expect(screen.getByText(/Category Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart Optimization/i)).toBeInTheDocument();
  });

  it('switches to recommendations tab and triggers focus block schedule', async () => {
    const user = userEvent.setup();
    const onScheduleFocusBlock = vi.fn();
    const onClose = vi.fn();

    render(
      <CalendarAnalyticsModal
        open={true}
        onClose={onClose}
        events={mockEvents}
        currentDate={new Date()}
        onScheduleFocusBlock={onScheduleFocusBlock}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Smart Optimization/i }));
    expect(screen.getByText(/Smart Schedule Recommendation/i)).toBeInTheDocument();

    const scheduleBtn = screen.getByRole('button', { name: /Auto-Schedule 1-Hour Focus Block/i });
    await user.click(scheduleBtn);

    expect(onScheduleFocusBlock).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
