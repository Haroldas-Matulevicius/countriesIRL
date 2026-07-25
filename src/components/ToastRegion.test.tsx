import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TOAST_MESSAGES, ToastRegion } from './ToastRegion';

describe('color application messages', (): void => {
  it('uses singular and plural country grammar', (): void => {
    expect(TOAST_MESSAGES.presetApplied('Red', 1)).toBe(
      'Applied Red to 1 country.',
    );
    expect(TOAST_MESSAGES.presetApplied('Red', 2)).toBe(
      'Applied Red to 2 countries.',
    );
    expect(TOAST_MESSAGES.customColorApplied('#1A2B3C', 1)).toBe(
      'Applied #1A2B3C to 1 country.',
    );
  });

  it('allows composition migration warnings through the approved-message guard', (): void => {
    const messages = [
      'Older saved map loaded with a modern world view. Save it again to keep the full composition.',
      'Saved map loaded, but some unavailable settings were restored to safe defaults.',
    ];

    messages.forEach((message, index): void => {
      const markup = renderToStaticMarkup(
        <ToastRegion
          message={{
            id: `warning-${index}`,
            severity: 'warning',
            message,
          }}
          onDismiss={vi.fn()}
        />,
      );

      expect(markup).toContain(message);
      expect(markup).not.toContain('The operation completed with a warning.');
    });
  });

  it('allows singular color feedback through the approved-message guard', (): void => {
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'message-1',
          severity: 'success',
          message: TOAST_MESSAGES.presetApplied('Red', 1),
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain('Applied Red to 1 country.');
    expect(markup).not.toContain('Map updated.');
  });
});
