import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  LEGEND_LABEL_FIT_MESSAGE,
  LEGEND_OVERFLOW_MESSAGE,
  getLegendBlockingMessage,
} from '../utils/legend';
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

  it('surfaces a legend-blocked export without a refresh instruction or retry', (): void => {
    [LEGEND_LABEL_FIT_MESSAGE, LEGEND_OVERFLOW_MESSAGE].forEach(
      (message, index): void => {
        const markup = renderToStaticMarkup(
          <ToastRegion
            message={{ id: `legend-block-${index}`, severity: 'error', message }}
            onDismiss={vi.fn()}
          />,
        );

        expect(markup).toContain(message);
        expect(markup).not.toContain('Refresh the page');
        expect(markup).not.toContain(
          'The operation could not be completed. Please try again.',
        );
        // Retrying an export blocked by the legend re-enters the same early
        // return, so no retry affordance is offered.
        expect(markup).not.toContain('Try Export Again');
      },
    );

    expect(getLegendBlockingMessage([{ code: 'too-many-active-colors' }])).toBe(
      LEGEND_OVERFLOW_MESSAGE,
    );
    expect(
      getLegendBlockingMessage([
        { code: 'invalid-label', path: 'entries[0].label' },
      ]),
    ).toBe(LEGEND_LABEL_FIT_MESSAGE);
  });

  it('still falls back for an unapproved error message', (): void => {
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'unapproved',
          severity: 'error',
          message: 'Shorten this label so it fits in the exported legend!',
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain(
      'The operation could not be completed. Please try again.',
    );
  });

  it('announces approved period copy and degrades catalog-supplied text', (): void => {
    const renderStatus = (message: string): string =>
      renderToStaticMarkup(
        <ToastRegion
          message={{ id: 'period', severity: 'info', message }}
          onDismiss={vi.fn()}
        />,
      );

    expect(renderStatus('Map view reset.')).toContain('Map view reset.');
    expect(renderStatus('Showing Modern — current borders.')).toContain(
      'Showing Modern — current borders.',
    );
    expect(renderStatus('Showing 1700 — Post-Westphalia Europe.')).toContain(
      'Showing 1700 — Post-Westphalia Europe.',
    );
    // A label the catalog supplied is data, not approved copy.
    expect(renderStatus('Showing 1700 — click here now.')).toContain(
      'Map updated.',
    );
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
