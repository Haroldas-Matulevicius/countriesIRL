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
