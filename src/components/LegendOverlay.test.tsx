import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_COMPOSITION_SETTINGS } from '../constants/mapStyle';
import type { LegendEntryState, LegendState } from '../types/composition';
import type { BandExtents } from '../utils/bands';
import { BAND_DEFAULT_HEIGHT, resolveBandExtents } from '../utils/bands';
import { LegendOverlay, getLegendOverlayBounds } from './LegendOverlay';

const CANVAS_SIZE = 1080;
const SAFE_INSET = 32;
/**
 * Bands OFF for the framing cases below, so their geometry is the bare safe
 * inset and a column reflow is the only thing moving anything. The band-aware
 * inset has its own suite in `utils/legend.test.ts`; the wiring assertion that
 * the prop actually reaches the rendered transform is at the end of this file.
 */
const NO_BANDS: BandExtents = { top: 0, bottom: 0 };

function createColors(count: number): ReadonlyArray<string> {
  return Array.from(
    { length: count },
    (_, index) => `#${(index + 1).toString(16).padStart(6, '0').toUpperCase()}`,
  );
}

function createEntries(count: number): ReadonlyArray<LegendEntryState> {
  return createColors(count).map((color, order) => ({
    color,
    label: color,
    order,
  }));
}

function createLegend(
  count: number,
  position: LegendState['position'],
): LegendState {
  return {
    entries: createEntries(count),
    position,
    textSize: 'medium',
  };
}

function renderOverlay(
  legend: LegendState,
  colors: ReadonlyArray<string>,
  bandExtents: BandExtents = NO_BANDS,
): string {
  return renderToStaticMarkup(
    <svg viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
      <LegendOverlay
        legend={legend}
        effectiveColors={colors}
        bandExtents={bandExtents}
        onPositionChange={vi.fn()}
        onStatusMessage={vi.fn()}
      />
    </svg>,
  );
}

function readTranslate(markup: string): { x: number; y: number } {
  const match = /data-layer="legend" transform="translate\(([-\d.]+) ([-\d.]+)\)"/.exec(
    markup,
  );
  if (match === null) {
    throw new Error(`Legend transform is missing from: ${markup.slice(0, 200)}`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

/**
 * The exported PNG is a clone of exactly this SVG (`utils/export.ts`
 * `createExportFrame`), so the rendered `translate(...)` is the position the
 * user receives. These assertions are therefore export assertions.
 */
describe('LegendOverlay export framing', (): void => {
  it('keeps a right-edge legend inside the frame when a 9th color adds a column', (): void => {
    const eightColors = createColors(8);
    const draggedRight = createLegend(8, { x: 712, y: 32, preset: null });

    expect(getLegendOverlayBounds(draggedRight, eightColors).width).toBe(336);
    expect(readTranslate(renderOverlay(draggedRight, eightColors))).toEqual({
      x: 712,
      y: 32,
    });

    const nineColors = createColors(9);
    const reflowed = createLegend(9, { x: 712, y: 32, preset: null });
    const bounds = getLegendOverlayBounds(reflowed, nineColors);
    const translate = readTranslate(renderOverlay(reflowed, nineColors));

    expect(bounds.width).toBe(648);
    expect(translate.x).toBe(400);
    expect(translate.x + bounds.width).toBe(CANVAS_SIZE - SAFE_INSET);
  });

  it('keeps a right-edge legend inside the frame across the 16 to 17 step', (): void => {
    const seventeenColors = createColors(17);
    const reflowed = createLegend(17, { x: 400, y: 32, preset: null });
    const bounds = getLegendOverlayBounds(reflowed, seventeenColors);
    const translate = readTranslate(renderOverlay(reflowed, seventeenColors));

    expect(bounds.width).toBe(960);
    expect(translate.x).toBe(88);
    expect(translate.x + bounds.width).toBe(CANVAS_SIZE - SAFE_INSET);
    expect(translate.y).toBeGreaterThanOrEqual(SAFE_INSET);
  });

  it('tracks the stored corner instead of stale coordinates as entries grow', (): void => {
    const stale = { x: 712, y: 560, preset: 'bottom-right' as const };

    const eightColors = createColors(8);
    const eight = createLegend(8, stale);
    const eightBounds = getLegendOverlayBounds(eight, eightColors);
    const eightTranslate = readTranslate(renderOverlay(eight, eightColors));
    expect(eightTranslate.x + eightBounds.width).toBe(CANVAS_SIZE - SAFE_INSET);
    expect(eightTranslate.y + eightBounds.height).toBe(CANVAS_SIZE - SAFE_INSET);

    const seventeenColors = createColors(17);
    const seventeen = createLegend(17, stale);
    const seventeenBounds = getLegendOverlayBounds(seventeen, seventeenColors);
    const seventeenTranslate = readTranslate(
      renderOverlay(seventeen, seventeenColors),
    );
    expect(seventeenTranslate.x + seventeenBounds.width).toBe(
      CANVAS_SIZE - SAFE_INSET,
    );
    expect(seventeenTranslate.y + seventeenBounds.height).toBe(
      CANVAS_SIZE - SAFE_INSET,
    );
    expect(seventeenTranslate.x).toBe(88);
  });
});

/* ------------------------------------------------------------------ *
 * D4-13 — the band extent reaches the rendered transform
 * ------------------------------------------------------------------ */

/**
 * The WIRING assertion, and it is separate from the arithmetic on purpose.
 * `utils/legend.test.ts` proves `getLegendCornerPosition` computes the inset;
 * this proves the number survives the prop, the resolver, and JSX and lands in
 * the `transform` the exported PNG is a clone of. A pure function that is
 * right and a component that never calls it is the gap this closes.
 */
describe('LegendOverlay band-aware placement', (): void => {
  it('renders the default preset 120 units lower when the top band is on', (): void => {
    const colors = createColors(1);
    const legend = createLegend(1, { x: 32, y: 32, preset: 'top-left' });
    const defaults = resolveBandExtents(DEFAULT_COMPOSITION_SETTINGS);

    expect(defaults.top).toBe(BAND_DEFAULT_HEIGHT);
    expect(readTranslate(renderOverlay(legend, colors, NO_BANDS))).toEqual({
      x: 32,
      y: 32,
    });
    expect(readTranslate(renderOverlay(legend, colors, defaults))).toEqual({
      x: 32,
      y: 152,
    });
  });

  it('moves a bottom preset up by the bottom band, and leaves x alone', (): void => {
    const colors = createColors(1);
    const legend = createLegend(1, { x: 32, y: 32, preset: 'bottom-right' });
    const bottomOnly = resolveBandExtents({
      topBandVisible: false,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: true,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });
    const bare = readTranslate(renderOverlay(legend, colors, NO_BANDS));
    const banded = readTranslate(renderOverlay(legend, colors, bottomOnly));

    expect(bare.y - banded.y).toBe(BAND_DEFAULT_HEIGHT);
    expect(banded.x).toBe(bare.x);
  });
});
