import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { LegendState } from '../types/composition';
import type { LegendBounds } from '../utils/legend';
import { getLegendBlockingMessage } from '../utils/legend';
import { LegendDisclosure, getLegendDisclosureSummary } from './LegendDisclosure';
import {
  LEGEND_LABEL_MAX_LENGTH,
  LegendEditor,
  resolveLegendLabelCommit,
} from './LegendEditor';
import type { LegendEditorCommands } from './LegendEditor';
import {
  LegendOverlay,
  clampLegendDragPosition,
  getLegendOverlayBounds,
} from './LegendOverlay';

const TEST_BOUNDS: LegendBounds = { width: 360, height: 240 };
const TEST_LEGEND: LegendState = {
  entries: [
    { color: '#DC2626', label: 'Warm countries', order: 0 },
    { color: '#2563EB', label: 'Cool countries', order: 1 },
  ],
  position: { x: 688, y: 32, preset: 'top-right' },
  theme: 'light',
  textSize: 'medium',
  backgroundOpacity: 90,
  borderStyle: 'hairline',
};

function createCommands(): LegendEditorCommands {
  return {
    setLegendEntry: vi.fn(),
    setLegendStyle: vi.fn(),
    setLegendOrder: vi.fn(),
    setLegendPosition: vi.fn(),
  };
}

describe('LegendDisclosure', (): void => {
  it('renders the exact collapsed summaries and native disclosure semantics', (): void => {
    expect(getLegendDisclosureSummary(0, 'Top right')).toBe(
      'Appears after you add color',
    );
    expect(getLegendDisclosureSummary(2, 'Top right')).toBe(
      '2 entries · Top right',
    );

    const markup = renderToStaticMarkup(
      <LegendDisclosure
        entryCount={2}
        positionLabel="Top right"
        isExpanded={false}
        onExpandedChange={vi.fn()}
      >
        <p>Legend controls</p>
      </LegendDisclosure>,
    );

    expect(markup).toContain('>Legend<');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="legend-editor-panel"');
    expect(markup).toContain('2 entries · Top right');
    expect(markup).not.toContain('Legend controls');
  });
});

describe('LegendEditor static semantics', (): void => {
  it('renders exact entry, style, position, and nudge controls', (): void => {
    const markup = renderToStaticMarkup(
      <LegendEditor
        legend={TEST_LEGEND}
        effectiveColors={['#DC2626', '#2563EB']}
        bounds={TEST_BOUNDS}
        commands={createCommands()}
        onStatusMessage={vi.fn()}
      />,
    );

    expect(markup).toContain('Legend label for #DC2626');
    expect(markup).toContain('14/32');
    // The counter never announces per keystroke.
    expect(markup).toContain('aria-live="off"');
    expect(markup).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
    // Icon-only since 03-07; the accessible names are unchanged.
    expect(markup).toContain('aria-label="Move Up"');
    expect(markup).toContain('aria-label="Move Down"');
    expect(markup).toContain('Drag Warm countries to reorder');
    expect(markup).toContain('aria-label="Legend theme"');
    expect(markup).toContain('value="light"');
    expect(markup).toContain('value="dark"');
    expect(markup).toContain('value="soft"');
    expect(markup).toContain('aria-label="Legend text size"');
    expect(markup).toContain('value="small"');
    expect(markup).toContain('value="medium"');
    expect(markup).toContain('value="large"');
    expect(markup).toContain('min="70"');
    expect(markup).toContain('max="100"');
    expect(markup).toContain('step="5"');
    expect(markup).toContain('90%');
    expect(markup).toContain('aria-label="Legend border"');
    expect(markup).toContain('value="none"');
    expect(markup).toContain('value="hairline"');
    expect(markup).toContain('value="strong"');
    expect(markup).toContain('aria-label="Legend position"');
    expect(markup).toContain('>Top left<');
    expect(markup).toContain('>Top right<');
    expect(markup).toContain('>Bottom left<');
    expect(markup).toContain('>Bottom right<');
    // 03-07: the 3x3 position grid gains the Custom cell; a preset position
    // leaves it unchecked.
    expect(markup).toContain('>Custom<');
    expect(markup).toContain('legend-editor__position-grid');
  });

  it('renders exact empty state with disabled style and position controls', (): void => {
    const markup = renderToStaticMarkup(
      <LegendEditor
        legend={{ ...TEST_LEGEND, entries: [] }}
        effectiveColors={[]}
        bounds={{ width: 0, height: 0 }}
        commands={createCommands()}
        onStatusMessage={vi.fn()}
      />,
    );

    expect(markup).toContain('Your legend will appear here');
    expect(markup).toContain(
      'Color at least one country to create the first legend entry.',
    );
    expect(markup).toContain('<fieldset disabled=""');
  });
});

describe('LegendOverlay export-safe SVG', (): void => {
  it('renders one group-only root with deterministic SVG primitives and editor-only movement', (): void => {
    const bounds = getLegendOverlayBounds(TEST_LEGEND, [
      '#DC2626',
      '#2563EB',
    ]);
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1080 1080">
        <LegendOverlay
          legend={TEST_LEGEND}
          effectiveColors={['#DC2626', '#2563EB']}
          onPositionChange={vi.fn()}
          onStatusMessage={vi.fn()}
        />
      </svg>,
    );
    const overlayMarkup = markup.slice(markup.indexOf('<g data-layer="legend"'));

    // Re-baselined 152 -> 184 by 03-11 (D-25/OQ-5): the 14-char labels wrap
    // to two 'medium' lines under the Inter-derived 7-chars-per-line table,
    // so both entries grow from the 48px single-line row to the 64px two-line
    // row (24 + 64 + 8 + 64 + 24 = 184).
    expect(bounds).toEqual({ width: 336, height: 184 });
    expect(overlayMarkup.startsWith('<g data-layer="legend"')).toBe(true);
    expect(overlayMarkup).not.toContain('<svg');
    expect(overlayMarkup).not.toContain('<div');
    expect(overlayMarkup).not.toContain('<foreignObject');
    expect(overlayMarkup).not.toContain('filter=');
    expect(overlayMarkup).not.toContain('style=');
    // The stored x (688) was authored against wider bounds; the preset is
    // authoritative, so the overlay renders the corner for the live bounds.
    expect(overlayMarkup).toContain('transform="translate(712 32)"');
    expect(712 + bounds.width).toBe(1048);
    expect(overlayMarkup).toContain('fill="#FFFFFF"');
    expect(overlayMarkup).toContain('fill-opacity="0.9"');
    expect(overlayMarkup).toContain('stroke="#CBD5E1"');
    expect(overlayMarkup).toContain('stroke-width="2"');
    expect(overlayMarkup).toContain('<text');
    expect(overlayMarkup).toContain('aria-hidden="true"');
    expect(overlayMarkup).toContain('data-editor-only="true"');
    expect(overlayMarkup).toContain('aria-label="Move legend"');
  });

  it('clamps pointer movement to the canonical 32-unit safe inset', (): void => {
    expect(
      clampLegendDragPosition(
        { x: -500, y: 2000, preset: null },
        { width: 336, height: 152 },
      ),
    ).toEqual({ x: 32, y: 896, preset: null });
  });
});

describe('LegendEditor validation helpers', (): void => {
  it('commits valid labels and restores the previous label for empty drafts', (): void => {
    expect(resolveLegendLabelCommit('Allies', 'Previous')).toEqual({
      ok: true,
      label: 'Allies',
    });
    expect(resolveLegendLabelCommit('   ', 'Previous')).toEqual({
      ok: false,
      restoredLabel: 'Previous',
      message: 'Enter a legend label.',
    });
    expect(
      resolveLegendLabelCommit('x'.repeat(LEGEND_LABEL_MAX_LENGTH + 1), 'Previous'),
    ).toEqual({
      ok: false,
      restoredLabel: 'Previous',
      message: 'Shorten this label so it fits in the exported legend.',
    });
  });

  it('maps overflow and fitting failures to exact export-blocking copy', (): void => {
    expect(getLegendBlockingMessage([{ code: 'too-many-active-colors' }])).toBe(
      'This map uses more than 30 legend colors. Reduce the number of colors so every label stays readable in the export.',
    );
    expect(
      getLegendBlockingMessage([
        { code: 'label-does-not-fit', path: 'entries[0].label' },
      ]),
    ).toBe('Shorten this label so it fits in the exported legend.');
  });
});
