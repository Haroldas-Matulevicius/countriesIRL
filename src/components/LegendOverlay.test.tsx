import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { LegendEntryState, LegendState } from '../types/composition';
import { LegendOverlay, getLegendOverlayBounds } from './LegendOverlay';

const CANVAS_SIZE = 1080;
const SAFE_INSET = 32;

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
    theme: 'light',
    textSize: 'medium',
    backgroundOpacity: 90,
    borderStyle: 'hairline',
  };
}

function renderOverlay(legend: LegendState, colors: ReadonlyArray<string>): string {
  return renderToStaticMarkup(
    <svg viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
      <LegendOverlay
        legend={legend}
        effectiveColors={colors}
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
