import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { ToastProvider, useToast } from './Toast';

// A minimal button that calls showToast so we can test provider behavior
// without exposing Toast internals.
function Trigger({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { showToast } = useToast();
  return <button type="button" onClick={() => showToast(message, type)}>trigger</button>;
}

function setup(props: { message: string; type?: 'success' | 'error' | 'info' }) {
  const user = userEvent.setup();
  const utils = render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>,
  );
  return { user, ...utils };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('renders no toast before showToast is called', () => {
    setup({ message: 'hello' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the message when showToast is called', async () => {
    const { user } = setup({ message: 'Event created', type: 'success' });
    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(screen.getByText('Event created')).toBeInTheDocument();
  });

  it('uses role="alert" (assertive) for error toasts', async () => {
    const { user } = setup({ message: 'Save failed', type: 'error' });
    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses role="status" (polite) for success/info toasts', async () => {
    const { user } = setup({ message: 'Saved!', type: 'success' });
    await user.click(screen.getByRole('button', { name: 'trigger' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('auto-dismisses after the timeout elapses', () => {
    // userEvent is async-based and conflicts with fake timers; use synchronous
    // fireEvent here so we can fully control time with vi.advanceTimersByTime.
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="will disappear" type="info" />
      </ToastProvider>,
    );

    act(() => { fireEvent.click(screen.getByRole('button', { name: 'trigger' })); });
    expect(screen.getByText('will disappear')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('will disappear')).not.toBeInTheDocument();
  });
});
