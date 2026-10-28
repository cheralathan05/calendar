import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DebugSentryPage from './page';

describe('DebugSentryPage', () => {
  it('throws a test error when the button is clicked', () => {
    // Note: React 19 catches errors in event handlers before they propagate through fireEvent.
    // This test verifies that clicking the button results in an error being thrown,
    // which in production is caught by the error boundary and reported to Sentry.
    const errors: Error[] = [];
    const handleUnhandledError = (event: ErrorEvent) => {
      errors.push(event.error);
    };

    window.addEventListener('error', handleUnhandledError);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<DebugSentryPage />);
      const button = screen.getByRole('button', { name: 'Throw test error' });

      fireEvent.click(button);

      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Sentry test error - safe to ignore');
    } finally {
      window.removeEventListener('error', handleUnhandledError);
    }
  });
});
