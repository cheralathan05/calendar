import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ViewSwitcher } from './ViewSwitcher';

// ViewSwitcher renders a dropdown button that shows the current view label
// and calls onChange when the user picks a different view.
// Tests focus on BEHAVIOR (what the user sees and can do), not implementation.

describe('ViewSwitcher', () => {
  it('shows the active view label on the trigger button', () => {
    render(<ViewSwitcher view="week" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /view: week/i })).toBeInTheDocument();
  });

  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ViewSwitcher view="week" onChange={vi.fn()} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view:/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onChange with the selected view and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewSwitcher view="week" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /view:/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /month/i }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('month');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks the active view with aria-checked=true', async () => {
    const user = userEvent.setup();
    render(<ViewSwitcher view="month" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /view:/i }));

    const monthOption = screen.getByRole('menuitemradio', { name: /month/i });
    const weekOption = screen.getByRole('menuitemradio', { name: /week/i });

    expect(monthOption).toHaveAttribute('aria-checked', 'true');
    expect(weekOption).toHaveAttribute('aria-checked', 'false');
  });

  it('closes the menu when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<ViewSwitcher view="week" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /view:/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onChange via keyboard shortcut when menu is open', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewSwitcher view="week" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /view:/i }));
    await user.keyboard('d'); // 'd' → day view

    expect(onChange).toHaveBeenCalledWith('day');
  });
});
