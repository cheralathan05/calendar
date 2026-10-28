import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickTemplatesModal } from './QuickTemplatesModal';

describe('QuickTemplatesModal', () => {
  it('does not render when open=false', () => {
    render(
      <QuickTemplatesModal
        open={false}
        onClose={vi.fn()}
        selectedDate={new Date()}
        onScheduleTemplate={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Quick Event Templates/i)).not.toBeInTheDocument();
  });

  it('renders templates and triggers scheduling callback', async () => {
    const user = userEvent.setup();
    const onSchedule = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickTemplatesModal
        open={true}
        onClose={onClose}
        selectedDate={new Date(2026, 4, 15)}
        onScheduleTemplate={onSchedule}
      />,
    );

    expect(screen.getByText(/Quick Event Templates/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /1:1 Sync & Catchup/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Deep Work & Focus Block/i })).toBeInTheDocument();

    // Select Deep Work
    await user.click(screen.getByRole('heading', { name: /Deep Work & Focus Block/i }));

    // Click schedule button
    const scheduleBtn = screen.getByRole('button', { name: /Schedule "Deep Work & Focus Block"/i });
    await user.click(scheduleBtn);

    expect(onSchedule).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
