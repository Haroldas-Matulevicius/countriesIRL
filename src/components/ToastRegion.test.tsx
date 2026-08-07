import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  ATTRIBUTION_TEXT_FIT_MESSAGE,
  SUBTITLE_TEXT_FIT_MESSAGE,
  TITLE_TEXT_FIT_MESSAGE,
  characterBoundFor,
  getCompositionTextBlockingMessage,
} from '../utils/compositionText';
import {
  LEGEND_LABEL_FIT_MESSAGE,
  LEGEND_OVERFLOW_MESSAGE,
  getLegendBlockingMessage,
} from '../utils/legend';
import { getPeriodFailureMessage } from '../utils/periods';
import { TOAST_MESSAGES, ToastRegion } from './ToastRegion';

function renderToast(
  message: string,
  severity: 'success' | 'info' | 'warning' | 'error' = 'info',
): string {
  return renderToStaticMarkup(
    <ToastRegion
      message={{ id: `toast-${severity}`, severity, message }}
      onDismiss={vi.fn()}
    />,
  );
}

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

  /*
   * D4-15. THREE positive tests for the three entries `04-11` adds to the
   * allowlist, which is the evidence assertion 23's raised counts stand on.
   * Each pairs the RENDERED string with the classifier that produces it, so an
   * entry cannot survive here while the product stops emitting it.
   */
  it('surfaces a title that will not fit, without a refresh instruction or retry', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('title', 'medium') + 1);
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'title-block',
          severity: 'error',
          message: TITLE_TEXT_FIT_MESSAGE,
          retry: vi.fn(),
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain(TITLE_TEXT_FIT_MESSAGE);
    expect(markup).not.toContain('Refresh the page');
    expect(markup).not.toContain('Try Export Again');
    expect(markup).not.toContain(
      'The operation could not be completed. Please try again.',
    );
    expect(
      getCompositionTextBlockingMessage(
        { title: overBound, subtitle: '', attribution: '' },
        { title: 'medium', subtitle: 'medium' },
      ),
    ).toBe(TITLE_TEXT_FIT_MESSAGE);
  });

  it('surfaces a subtitle that will not fit, without a refresh instruction or retry', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('subtitle', 'medium') + 1);
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'subtitle-block',
          severity: 'error',
          message: SUBTITLE_TEXT_FIT_MESSAGE,
          retry: vi.fn(),
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain(SUBTITLE_TEXT_FIT_MESSAGE);
    expect(markup).not.toContain('Refresh the page');
    expect(markup).not.toContain('Try Export Again');
    expect(
      getCompositionTextBlockingMessage(
        { title: '', subtitle: overBound, attribution: '' },
        { title: 'medium', subtitle: 'medium' },
      ),
    ).toBe(SUBTITLE_TEXT_FIT_MESSAGE);
  });

  it('surfaces an attribution that will not fit, without a refresh instruction or retry', (): void => {
    const overBound = 'W'.repeat(characterBoundFor('attribution') + 1);
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'attribution-block',
          severity: 'error',
          message: ATTRIBUTION_TEXT_FIT_MESSAGE,
          retry: vi.fn(),
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain(ATTRIBUTION_TEXT_FIT_MESSAGE);
    expect(markup).not.toContain('Refresh the page');
    expect(markup).not.toContain('Try Export Again');
    expect(
      getCompositionTextBlockingMessage(
        { title: '', subtitle: '', attribution: overBound },
        { title: 'medium', subtitle: 'medium' },
      ),
    ).toBe(ATTRIBUTION_TEXT_FIT_MESSAGE);
  });

  it('surfaces a refused composition without a refresh instruction or retry', (): void => {
    const markup = renderToStaticMarkup(
      <ToastRegion
        message={{
          id: 'invalid-composition',
          severity: 'error',
          message: TOAST_MESSAGES.exportLayoutInvalid,
          // Even when a retry is handed in, the refusal is synchronous and
          // structural, so no retry affordance may be offered.
          retry: vi.fn(),
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(markup).toContain(TOAST_MESSAGES.exportLayoutInvalid);
    expect(markup).not.toContain('Refresh the page');
    expect(markup).not.toContain('Try Export Again');
    expect(markup).not.toContain(
      'The operation could not be completed. Please try again.',
    );
    expect(TOAST_MESSAGES.exportLayoutInvalid).not.toBe(
      TOAST_MESSAGES.exportFailed,
    );
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

  it('covers every approved Phase 2 status category', (): void => {
    const approved = [
      // Camera
      'Centered on Poland.',
      'Centered on Bosnia and Herzegovina.',
      'Centered on Åland Islands.',
      // A real catalog name with a slash: it is a country name, not two paths.
      'Centered on Falkland Islands / Malvinas.',
      'Map view reset.',
      // Period
      'Showing Modern — current borders.',
      'Showing 1914 — Before World War I.',
      getPeriodFailureMessage('1914 — Before World War I'),
      // Legend
      'Legend added. Open Legend to edit labels.',
      'Legend moved to Bottom right.',
      'Legend position updated.',
      'Legend order updated.',
      'Moved Allies to position 1 of 2.',
      // Colors and history
      'No countries selected.',
      '3 countries selected.',
      'Applied Red to 2 countries.',
      'Applied #1A2B3C to 1 country.',
      'Color change undone.',
      'Color change redone.',
      'All colors reset. Use Undo Color Change to restore them.',
      // Persistence
      'Map saved to this browser.',
      'Saved map replaced.',
      'Saved map loaded.',
      'Saved map deleted.',
      'Older saved map loaded with a modern world view. Save it again to keep the full composition.',
      'Saved map loaded, but some invalid saved colors were omitted.',
      'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
      'Browser storage is full. Delete an older saved map, then save this map again.',
      // Export
      'PNG downloaded at 1080 × 1080.',
      TOAST_MESSAGES.exportFailed,
      TOAST_MESSAGES.exportLayoutInvalid,
    ];

    // React escapes the message when it renders it as text.
    const escapeHtml = (value: string): string =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;');

    approved.forEach((message): void => {
      const markup = renderToast(message);
      expect(markup).toContain(escapeHtml(message));
      expect(markup).not.toContain('Map updated.');
    });
  });

  it('states the export failure without a refresh instruction', (): void => {
    // The composition is browser-memory only: "Refresh the page" would destroy
    // the unsaved map instead of repairing the export.
    expect(TOAST_MESSAGES.exportFailed).toBe(
      'The PNG could not be created. Your map is unchanged. Try Export PNG again.',
    );
    expect(renderToast(TOAST_MESSAGES.exportFailed, 'error')).not.toContain(
      'Refresh the page',
    );
  });

  it('offers the retry affordance only for the recoverable export failure', (): void => {
    const withRetry = (message: string): string =>
      renderToStaticMarkup(
        <ToastRegion
          message={{ id: 'retry', severity: 'error', message, retry: vi.fn() }}
          onDismiss={vi.fn()}
        />,
      );

    expect(withRetry(TOAST_MESSAGES.exportFailed)).toContain('Try Export Again');
    expect(withRetry(TOAST_MESSAGES.exportLayoutInvalid)).not.toContain(
      'Try Export Again',
    );
    expect(withRetry(LEGEND_OVERFLOW_MESSAGE)).not.toContain('Try Export Again');
  });

  it('rejects technical and arbitrary text in every severity', (): void => {
    const rejected = [
      // Raw content hash
      'a'.repeat(64),
      '3b1f8c2d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      // A bounded parameter is not a place to smuggle one either
      `Centered on ${'a'.repeat(64)}.`,
      // Projection terminology
      'Mercator projection updated.',
      'Showing Mercator — current borders.',
      // Schema and versioning
      'schemaVersion 3 migrated.',
      'Saved map schema 2 upgraded to 3.',
      // Source paths and filenames
      'public/data/snapshots/1700.geojson could not be read.',
      'world-modern.geojson loaded.',
      // Stack traces and error frames
      "TypeError: Cannot read properties of null (reading 'ownerDocument')",
      '    at exportMapPng (src/utils/export.ts:42:9)',
      // Storage exception names
      'QuotaExceededError',
      'DOMException: QuotaExceededError',
      'SecurityError: The operation is insecure.',
      // Deferred features must not be advertised
      'Historical borders for 1492 are coming soon.',
      'Batch export is coming soon.',
      // Arbitrary strings
      'Something went wrong',
      'OK',
      'Click here now.',
    ];

    rejected.forEach((message): void => {
      expect(renderToast(message, 'success')).toContain('Map updated.');
      expect(renderToast(message, 'info')).toContain('Map updated.');
      expect(renderToast(message, 'warning')).toContain(
        'The operation completed with a warning.',
      );
      expect(renderToast(message, 'error')).toContain(
        'The operation could not be completed. Please try again.',
      );
      expect(renderToast(message, 'error')).not.toContain(message);
    });
  });

  it('keeps one polite status for information and one assertive alert for errors', (): void => {
    const status = renderToast('Saved map loaded.', 'success');
    expect(status).toContain('role="status"');
    expect(status).toContain('aria-live="polite"');
    expect(status).not.toContain('role="alert"');

    const alert = renderToast(TOAST_MESSAGES.exportFailed, 'error');
    expect(alert).toContain('role="alert"');
    expect(alert).toContain('aria-live="assertive"');
    expect(alert).not.toContain('role="status"');

    // One toast, one dismiss control, exact label.
    expect(status.match(/<section/gu)).toHaveLength(1);
    expect(status.match(/Dismiss Message/gu)).toHaveLength(1);
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
