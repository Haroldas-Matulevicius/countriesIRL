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
      'Older saved map loaded with a modern world view. Save it again to keep the full composition. Saved map loaded, but some invalid saved colors were omitted.',
      'Saved map loaded, but some unavailable settings were restored to safe defaults. Saved map loaded, but some invalid saved colors were omitted.',
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

  it('preserves every bounded legend announcement category', (): void => {
    // React escapes the message when it renders it as text, so compare against
    // the escaped form rather than allowlisting a reduced charset upstream.
    const escapeHtml = (value: string): string =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    const messages = [
      'Legend added. Open Legend to edit labels.',
      'Legend position updated.',
      'Legend order updated.',
      'Legend moved to Top left.',
      'Legend moved to Top right.',
      'Legend moved to Bottom left.',
      'Legend moved to Bottom right.',
      'Moved Allies to position 2 of 3.',
      'Moved Allies & "Central Powers" to position 1 of 3.',
      'Moved Trip 2024 \u2192 2025 to position 2 of 3.',
      'Moved 50% visited to position 3 of 3.',
      'Moved A\u2013B route to position 1 of 2.',
      'Moved \u{1F30D} Visited to position 2 of 2.',
    ];

    messages.forEach((message, index): void => {
      const markup = renderToStaticMarkup(
        <ToastRegion
          message={{ id: `legend-${index}`, severity: 'info', message }}
          onDismiss={vi.fn()}
        />,
      );

      expect(markup).toContain(escapeHtml(message));
      expect(markup).not.toContain('Map updated.');
    });
  });

  it('rejects unbounded or invalid legend reorder announcements', (): void => {
    const messages = [
      `Moved ${'x'.repeat(33)} to position 1 of 2.`,
      'Moved Allies to position 3 of 2.',
      'Moved Allies to position 1 of 31.',
      'Moved Allies\nAll colors reset. to position 1 of 2.',
      'Moved Allies\u202Ereset to position 1 of 2.',
    ];

    messages.forEach((message, index): void => {
      const markup = renderToStaticMarkup(
        <ToastRegion
          message={{ id: `invalid-legend-${index}`, severity: 'info', message }}
          onDismiss={vi.fn()}
        />,
      );

      expect(markup).toContain('Map updated.');
      expect(markup).not.toContain(message);
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
