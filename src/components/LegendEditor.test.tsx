import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { LegendState } from '../types/composition';
import type { LegendBounds } from '../utils/legend';
import { LegendDisclosure, getLegendDisclosureSummary } from './LegendDisclosure';
import {
  LEGEND_LABEL_MAX_LENGTH,
  LegendEditor,
  getLegendBlockingMessage,
  resolveLegendLabelCommit,
} from './LegendEditor';

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

function createCommands() {
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
      <LegendDisclosure entryCount={2} positionLabel="Top right">
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
        onValidationChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Legend label for #DC2626');
    expect(markup).toContain('15/32');
    expect(markup).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
    expect(markup).toContain('>Move Up<');
    expect(markup).toContain('>Move Down<');
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
  });

  it('renders exact empty state with disabled style and position controls', (): void => {
    const markup = renderToStaticMarkup(
      <LegendEditor
        legend={{ ...TEST_LEGEND, entries: [] }}
        effectiveColors={[]}
        bounds={{ width: 0, height: 0 }}
        commands={createCommands()}
        onStatusMessage={vi.fn()}
        onValidationChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Your legend will appear here');
    expect(markup).toContain(
      'Color at least one country to create the first legend entry.',
    );
    expect(markup).toContain('<fieldset disabled=""');
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
