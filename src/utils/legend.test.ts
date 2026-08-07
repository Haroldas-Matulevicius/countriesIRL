import { describe, expect, it } from 'vitest';

import type {
  LegendEntryState,
  LegendState,
} from '../types/composition';
import type { ColorMap, SceneFeature } from '../types/map';
import { DEFAULT_COMPOSITION_SETTINGS } from '../constants/mapStyle';
import { BAND_DEFAULT_HEIGHT, BAND_MAX_HEIGHT, resolveBandExtents } from './bands';
import {
  LEGEND_BAR_SEGMENT_GAP,
  LEGEND_BAR_TICK_LABEL_GAP,
  LEGEND_BAR_TICK_LENGTH,
  LEGEND_BAR_WIDTH,
  LEGEND_CAPTION_BLOCK_HEIGHT,
  LEGEND_CAPTION_FONT_SIZE,
  LEGEND_CHARACTERS_PER_LINE,
  LEGEND_ENTRY_GAP,
  LEGEND_FORMS,
  LEGEND_OVERFLOW_MESSAGE,
  LEGEND_SAFE_INSET,
  LEGEND_TEXT_FONT_SIZE,
  LEGEND_WIDEST_CHARACTER_ADVANCE_EM,
  createBarLegendLayout,
  createDefaultLegendState,
  createLegendLayout,
  getActiveLegendEntries,
  getLegendBlockingMessage,
  inferLegendForm,
  legendTextWidth,
  resolveLegendBounds,
  resolveLegendForm,
  getLegendCornerPosition,
  moveLegendEntry,
  nudgeLegendPosition,
  reconcileLegend,
  resolveLegendPosition,
  resolveLegendRender,
  validateActiveLegend,
  validateLegend,
} from './legend';
import {
  composeEffectiveScene,
  getEffectiveSceneColors,
} from './scene';
import { createLegacyCompatibleSnapshot } from '../hooks/useLocalStorage';
import { customColor, rampColor } from './colors';
import { WIDEST_CHARACTER_ADVANCE_EM } from './compositionText';
import { createInitialCompositionState } from '../providers/CompositionStateProvider';

const TEST_RING: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

const TEST_LEGEND_BOUNDS = Object.freeze({ width: 320, height: 240 });
/**
 * Bands OFF. Every pre-D4-13 case below asserts the BARE safe inset, and it
 * still holds exactly — the band-aware inset adds to 32, it does not replace
 * it. Passing this explicitly rather than defaulting the parameter is what
 * keeps a production call site from silently opting out of the inset.
 */
const NO_BANDS = Object.freeze({ top: 0, bottom: 0 });
/**
 * No caption and no "no data" row — the shipped default, and the state every
 * pre-`04-13` geometry assertion below was measured in. Passed explicitly for
 * the same reason `NO_BANDS` is: a defaulted `{caption: '', showNoData: false}`
 * would let a call site opt out of reserving space it actually needs.
 */
const BARE = Object.freeze({ caption: '', showNoData: false });

function createHistoricalFeature(
  sourceFeatureId: string,
  entityId: string,
): SceneFeature {
  return {
    type: 'Feature',
    id: sourceFeatureId,
    sourceFeatureId,
    entityId,
    colorOwnerId: entityId,
    isSelectable: true,
    interactionMode: 'historical-entity',
    boundaryMode: 'historical',
    provenanceId: `${sourceFeatureId}-provenance`,
    properties: { name: entityId },
    geometry: {
      type: 'Polygon',
      coordinates: [TEST_RING],
    },
  };
}

function createEntries(count: number): ReadonlyArray<LegendEntryState> {
  return Array.from({ length: count }, (_, index) => ({
    color: `#${(index + 1).toString(16).padStart(6, '0').toUpperCase()}`,
    label: `Entry ${index + 1}`,
    order: index,
  }));
}

function withEntries(
  entries: ReadonlyArray<LegendEntryState>,
  overrides: Partial<LegendState> = {},
): LegendState {
  return {
    ...createDefaultLegendState(),
    ...overrides,
    entries,
  };
}

describe('legend defaults', (): void => {
  it('gives a fresh map, the provider, and a legacy-migrated map the same legend', (): void => {
    const fresh = createDefaultLegendState();

    expect(fresh.position).toEqual({ x: 32, y: 32, preset: 'top-left' });
    // D4-11: the whole legend state is three fields. `theme`,
    // `backgroundOpacity`, and `borderStyle` are GONE, and asserting the key
    // set is what stops one quietly coming back through a spread.
    /*
     * D4-11 cut it to three fields; **`04-13` (D4-12) brought three back** —
     * `form`, `caption`, and `showNoData`. None of them is box chrome: they are
     * what the legend SAYS and which marks it draws. Asserting the whole key
     * set is still what stops a deleted chrome field quietly returning through
     * a spread, and it now also pins the shape `04-14`'s V3 record inherits.
     */
    expect(Object.keys(fresh).sort()).toEqual([
      'caption',
      'entries',
      'form',
      'position',
      'showNoData',
      'textSize',
    ]);
    // The shipped default FOLLOWS the colouring technique — a concrete form
    // here would freeze it at first save.
    expect(fresh.form).toBeNull();
    expect(fresh.caption).toBe('');
    expect(fresh.showNoData).toBe(false);
    // The coordinates agree with the preset they claim, so the disclosure
    // summary can never describe a position the render contradicts.
    expect(getLegendCornerPosition('top-left', { width: 0, height: 0 }, NO_BANDS)).toEqual(
      fresh.position,
    );
    expect(getLegendCornerPosition('top-left', TEST_LEGEND_BOUNDS, NO_BANDS)).toEqual(
      fresh.position,
    );

    expect(createInitialCompositionState().legend).toEqual(fresh);
    expect(createLegacyCompatibleSnapshot({ FRA: customColor('#DC2626') }).legend).toEqual({
      ...fresh,
      entries: [{ color: '#DC2626', label: '#DC2626', order: 0 }],
    });
  });

  it('keeps the default valid for the export gate at boot and after the first color', (): void => {
    const fresh = createDefaultLegendState();
    const empty = resolveLegendRender(fresh, [], NO_BANDS, 'rows');
    expect(empty.position).toEqual(fresh.position);
    expect(validateActiveLegend(fresh, [], empty.bounds, NO_BANDS)).toEqual({
      ok: true,
      activeEntries: [],
    });

    const colored = reconcileLegend(['#DC2626'], fresh);
    const rendered = resolveLegendRender(colored, ['#DC2626'], NO_BANDS, 'rows');
    expect(rendered.position).toEqual(fresh.position);
    expect(
      validateActiveLegend(colored, ['#DC2626'], rendered.bounds, NO_BANDS),
    ).toMatchObject({ ok: true });
  });
});

describe('reconcileLegend', (): void => {
  it('creates one uppercase entry per unique non-white effective scene color', (): void => {
    const scene = composeEffectiveScene({
      snapshotId: '1700',
      modernFeatures: [],
      historicalFeatures: [
        createHistoricalFeature('historical-hre-1700', 'HIST-HRE'),
        createHistoricalFeature('historical-saxony-1700', 'HIST-SAXONY'),
      ],
    });
    const colors = {
      'HIST-HRE': customColor('#dc2626'),
      'HIST-SAXONY': customColor('rgb(220, 38, 38)'),
    };
    const effectiveColors = getEffectiveSceneColors(scene, colors);
    const reconciled = reconcileLegend(
      effectiveColors,
      createDefaultLegendState(),
    );

    expect(reconciled.entries).toEqual([
      { color: '#DC2626', label: '#DC2626', order: 0 },
    ]);
    expect(getActiveLegendEntries(effectiveColors, reconciled)).toEqual(
      reconciled.entries,
    );
    expect(
      validateLegend(reconciled, effectiveColors, TEST_LEGEND_BOUNDS),
    ).toEqual({
      ok: true,
      activeEntries: reconciled.entries,
    });
  });

  it('hides dormant entries during undo or period removal and restores metadata on return', (): void => {
    const initial = reconcileLegend(
      ['#2563EB'],
      createDefaultLegendState(),
    );
    const edited: LegendState = {
      ...initial,
      entries: [{ color: '#2563EB', label: 'Historical allies', order: 4 }],
    };
    const afterUndo = reconcileLegend([], edited);
    const afterRedo = reconcileLegend(['#2563eb'], afterUndo);
    const afterPeriodRemoval = reconcileLegend([], afterRedo);
    const afterPeriodReturn = reconcileLegend(['#2563EB'], afterPeriodRemoval);

    expect(getActiveLegendEntries([], afterUndo)).toEqual([]);
    expect(getActiveLegendEntries(['#2563EB'], afterRedo)).toEqual([
      { color: '#2563EB', label: 'Historical allies', order: 4 },
    ]);
    expect(getActiveLegendEntries([], afterPeriodRemoval)).toEqual([]);
    expect(getActiveLegendEntries(['#2563EB'], afterPeriodReturn)).toEqual([
      { color: '#2563EB', label: 'Historical allies', order: 4 },
    ]);
  });

  it('appends new colors after the highest dormant order without mutating prior state', (): void => {
    const previous = withEntries([
      { color: '#DC2626', label: 'Warm', order: 7 },
      { color: '#2563EB', label: 'Cool', order: 2 },
    ]);
    const reconciled = reconcileLegend(['#16A34A'], previous);

    expect(reconciled.entries).toEqual([
      { color: '#DC2626', label: 'Warm', order: 7 },
      { color: '#2563EB', label: 'Cool', order: 2 },
      { color: '#16A34A', label: '#16A34A', order: 8 },
    ]);
    expect(previous.entries).toHaveLength(2);
  });
});

describe('legend ordering and layout', (): void => {
  it('moves entries deterministically and compacts their order values', (): void => {
    const state = withEntries([
      { color: '#DC2626', label: 'Red', order: 4 },
      { color: '#16A34A', label: 'Green', order: 9 },
      { color: '#2563EB', label: 'Blue', order: 2 },
    ]);

    expect(moveLegendEntry(state, '#16A34A', 0).entries).toEqual([
      { color: '#16A34A', label: 'Green', order: 0 },
      { color: '#2563EB', label: 'Blue', order: 1 },
      { color: '#DC2626', label: 'Red', order: 2 },
    ]);
    expect(state.entries[0].order).toBe(4);
  });

  it.each([
    [1, 1],
    [8, 1],
    [9, 2],
    [16, 2],
    [17, 3],
    [30, 3],
  ])('uses %i entries in %i deterministic columns', (count, columns): void => {
    const layout = createLegendLayout(createEntries(count), 'medium', BARE);

    expect(layout.form).toBe('rows');
    if (layout.form !== 'rows') {
      throw new Error('the rows layout function returned a bar layout');
    }
    expect(layout.columns).toBe(columns);
    expect(layout.items).toHaveLength(count);
    expect(layout.width).toBeLessThanOrEqual(1016);
    expect(layout.height).toBeLessThanOrEqual(1016);
    expect(layout.effectiveTextSize).toBe(count >= 17 ? 'small' : 'medium');
  });
});

/* ------------------------------------------------------------------ *
 * D4-13 — the band-aware inset
 * ------------------------------------------------------------------ */

/**
 * The legend's top inset follows the top band's resolved height, and the
 * bottom one follows the bottom band's. Two things make this the right shape
 * rather than a literal `y = 152`:
 *
 * - it fixes **both** top presets, not only the default one, and both bottom
 *   presets symmetrically;
 * - it is a pure function of composition state, so it is `node`-testable with
 *   no DOM and the legend can never collide with a band a creator has grown.
 *
 * Every case below asserts the number **twice** — once as a literal, once
 * reproduced from `LEGEND_SAFE_INSET + bandHeight`. The literal catches a
 * change to the arithmetic; the derivation catches a change to either input
 * that a literal alone would hide. Neither form on its own can fail on both.
 *
 * ⚠ **This moves exported pixels.** Toggling a band now moves the legend. That
 * is intended and it is gated per-property (D4-14), never by a re-baselined
 * image.
 */
describe('the band-aware legend inset (D4-13)', (): void => {
  const BOUNDS = TEST_LEGEND_BOUNDS;
  const NO_BANDS = { top: 0, bottom: 0 } as const;

  it('leaves a top-anchored preset at the bare safe inset when the top band is off', (): void => {
    const extents = resolveBandExtents({
      topBandVisible: false,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: false,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });

    expect(extents.top).toBe(0);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(32);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(
      LEGEND_SAFE_INSET + extents.top,
    );
  });

  it('insets a top-anchored preset by the top band at its default height', (): void => {
    const extents = resolveBandExtents({
      topBandVisible: true,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: false,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });

    expect(BAND_DEFAULT_HEIGHT).toBe(120);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(152);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(
      LEGEND_SAFE_INSET + BAND_DEFAULT_HEIGHT,
    );
  });

  it('insets a top-anchored preset by the top band at its cap', (): void => {
    const extents = resolveBandExtents({
      topBandVisible: true,
      topBandHeight: BAND_MAX_HEIGHT,
      bottomBandVisible: false,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });

    expect(BAND_MAX_HEIGHT).toBe(154);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(186);
    expect(getLegendCornerPosition('top-left', BOUNDS, extents).y).toBe(
      LEGEND_SAFE_INSET + BAND_MAX_HEIGHT,
    );
  });

  it('grows a bottom-anchored preset symmetrically by the bottom band', (): void => {
    const extents = resolveBandExtents({
      topBandVisible: false,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: true,
      bottomBandHeight: BAND_DEFAULT_HEIGHT,
    });
    const bareY = getLegendCornerPosition('bottom-left', BOUNDS, NO_BANDS).y;
    const bandedY = getLegendCornerPosition('bottom-left', BOUNDS, extents).y;

    expect(bareY).toBe(808);
    expect(bandedY).toBe(688);
    expect(bareY - bandedY).toBe(BAND_DEFAULT_HEIGHT);
    // Symmetry, stated as the arithmetic rather than as a second literal.
    expect(bandedY + BOUNDS.height).toBe(
      1080 - LEGEND_SAFE_INSET - extents.bottom,
    );
  });

  it('resolves the default position to {x: 32, y: 152} under Phase 4 defaults', (): void => {
    const fresh = createDefaultLegendState();
    const extents = resolveBandExtents(DEFAULT_COMPOSITION_SETTINGS);

    // The STORED default is unchanged: `top-left` at 32/32. The inset
    // arithmetic is what moves it, so nothing had to be written back.
    expect(fresh.position).toEqual({ x: 32, y: 32, preset: 'top-left' });

    const colored = reconcileLegend(['#DC2626'], fresh);
    const rendered = resolveLegendRender(colored, ['#DC2626'], extents, 'rows');

    expect(rendered.position).toEqual({ x: 32, y: 152, preset: 'top-left' });
    expect(rendered.position.y).toBe(LEGEND_SAFE_INSET + extents.top);
    // 14% down the square, below the title block, hugging the left edge —
    // which is where the owner's reference puts it.
    expect(rendered.position.y / 1080).toBeCloseTo(0.1407, 4);
  });

  it('moves BOTH top presets, not only the default one', (): void => {
    const extents = resolveBandExtents({
      topBandVisible: true,
      topBandHeight: BAND_DEFAULT_HEIGHT,
      bottomBandVisible: true,
      bottomBandHeight: BAND_MAX_HEIGHT,
    });

    expect(getLegendCornerPosition('top-left', BOUNDS, extents)).toEqual({
      x: 32,
      y: 152,
      preset: 'top-left',
    });
    expect(getLegendCornerPosition('top-right', BOUNDS, extents)).toEqual({
      x: 728,
      y: 152,
      preset: 'top-right',
    });
    expect(getLegendCornerPosition('bottom-left', BOUNDS, extents)).toEqual({
      x: 32,
      y: 808 - BAND_MAX_HEIGHT,
      preset: 'bottom-left',
    });
    expect(getLegendCornerPosition('bottom-right', BOUNDS, extents)).toEqual({
      x: 728,
      y: 808 - BAND_MAX_HEIGHT,
      preset: 'bottom-right',
    });
  });

  it('still clamps a legend whose layout would leave the square', (): void => {
    // Three columns of two-line rows — the tallest legend the product can
    // produce. Both bands at their cap on top of it.
    //
    // RE-BASELINED by `04-13`, deliberately: 960 -> **912**. The rows form lost
    // `LEGEND_INTERNAL_PADDING` (24 a side) when it was restyled to the bar's
    // restraint, so a three-column legend is 48 units narrower. The CLAIM this
    // case makes — that the clamp holds for the widest legend that exists — is
    // unchanged; only the width of that legend moved.
    const entries = createEntries(30).map((entry) => ({
      ...entry,
      label: 'A very long two line label',
    }));
    const legend = withEntries(entries, {
      position: { x: 32, y: 32, preset: 'top-left' },
    });
    const effectiveColors = entries.map((entry) => entry.color);
    const extents = resolveBandExtents({
      topBandVisible: true,
      topBandHeight: BAND_MAX_HEIGHT,
      bottomBandVisible: true,
      bottomBandHeight: BAND_MAX_HEIGHT,
    });
    const rendered = resolveLegendRender(legend, effectiveColors, extents, 'rows');

    expect(rendered.bounds.width).toBe(912);
    expect(rendered.position.x).toBeGreaterThanOrEqual(LEGEND_SAFE_INSET);
    expect(rendered.position.y).toBeGreaterThanOrEqual(LEGEND_SAFE_INSET);
    expect(rendered.position.x + rendered.bounds.width).toBeLessThanOrEqual(
      1080 - LEGEND_SAFE_INSET,
    );
    expect(
      rendered.position.y + rendered.bounds.height,
      'the band-aware inset pushed the legend off the bottom of the square',
    ).toBeLessThanOrEqual(1080 - LEGEND_SAFE_INSET);
  });
});

describe('legend positioning', (): void => {
  it.each([
    ['top-left', { x: 32, y: 32 }],
    ['top-right', { x: 728, y: 32 }],
    ['bottom-left', { x: 32, y: 808 }],
    ['bottom-right', { x: 728, y: 808 }],
  ] as const)('places %s at the exact safe inset', (corner, expected): void => {
    expect(getLegendCornerPosition(corner, TEST_LEGEND_BOUNDS, NO_BANDS)).toEqual({
      ...expected,
      preset: corner,
    });
  });

  it('nudges by 8 or 32 units, clears the preset, and clamps inside the canvas', (): void => {
    const initial = { x: 728, y: 808, preset: 'bottom-right' as const };

    expect(
      nudgeLegendPosition(initial, 'left', TEST_LEGEND_BOUNDS, 'small'),
    ).toEqual({ x: 720, y: 808, preset: null });
    expect(
      nudgeLegendPosition(initial, 'right', TEST_LEGEND_BOUNDS, 'large'),
    ).toEqual({ x: 728, y: 808, preset: null });
    expect(
      nudgeLegendPosition({ x: -100, y: -100, preset: null }, 'up', TEST_LEGEND_BOUNDS),
    ).toEqual({ x: 32, y: 32, preset: null });
  });
});

describe('resolveLegendPosition', (): void => {
  const ONE_COLUMN = Object.freeze({ width: 336, height: 488 });
  const TWO_COLUMNS = Object.freeze({ width: 648, height: 304 });
  const THREE_COLUMNS = Object.freeze({ width: 960, height: 360 });

  it('re-clamps a custom position when a 9th color adds a legend column', (): void => {
    // Dragged to the far right edge while 8 colors made one column.
    const parkedRight = { x: 712, y: 32, preset: null };

    expect(resolveLegendPosition(parkedRight, ONE_COLUMN, NO_BANDS)).toEqual({
      x: 712,
      y: 32,
      preset: null,
    });
    // The 9th color reflows to two columns: 712 + 648 = 1360 would put 280px
    // outside the 1080 canvas, so the resolved x drops to the new maximum.
    expect(resolveLegendPosition(parkedRight, TWO_COLUMNS, NO_BANDS)).toEqual({
      x: 400,
      y: 32,
      preset: null,
    });
    expect(400 + TWO_COLUMNS.width).toBe(1048);
  });

  it('re-clamps at the harsher 16 to 17 entry step', (): void => {
    const parkedRight = { x: 400, y: 32, preset: null };

    expect(resolveLegendPosition(parkedRight, THREE_COLUMNS, NO_BANDS)).toEqual({
      x: 88,
      y: 32,
      preset: null,
    });
    expect(88 + THREE_COLUMNS.width).toBe(1048);
  });

  it('treats a preset as authoritative so the legend tracks its corner', (): void => {
    expect(
      resolveLegendPosition(
        { x: 0, y: 0, preset: 'bottom-right' },
        ONE_COLUMN,
        NO_BANDS,
      ),
    ).toEqual({ x: 712, y: 560, preset: 'bottom-right' });
    expect(
      resolveLegendPosition(
        { x: 712, y: 560, preset: 'bottom-right' },
        THREE_COLUMNS,
        NO_BANDS,
      ),
    ).toEqual({ x: 88, y: 688, preset: 'bottom-right' });
  });

  it('falls back to the safe inset for non-finite or unknown stored values', (): void => {
    expect(
      resolveLegendPosition(
        { x: Number.NaN, y: -4000, preset: null },
        ONE_COLUMN,
        NO_BANDS,
      ),
    ).toEqual({ x: 32, y: 32, preset: null });
    expect(
      resolveLegendPosition(
        { x: 900, y: 900, preset: 'middle' as never },
        ONE_COLUMN,
        NO_BANDS,
      ),
    ).toEqual({ x: 712, y: 560, preset: null });
  });

  it('derives bounds and position together from live state', (): void => {
    const legend = withEntries(createEntries(9), {
      position: { x: 712, y: 32, preset: null },
    });
    const resolved = resolveLegendRender(
      legend,
      createEntries(9).map((entry) => entry.color),
      NO_BANDS,
      'rows',
    );

    // 648 -> 600: the rows restyle removed the 24-a-side container padding.
    expect(resolved.bounds).toEqual({ width: 600, height: resolved.layout.height });
    // 400 -> 448: the narrower legend has 48 more units of legal x.
    expect(resolved.position).toEqual({ x: 448, y: 32, preset: null });
    expect(resolved.activeEntries).toHaveLength(9);
  });
});

describe('validateLegend', (): void => {
  it('accepts exact enums, bounds, labels, and active effective colors', (): void => {
    const state = withEntries(
      [{ color: '#DC2626', label: 'Category', order: 0 }],
      {
        position: { x: 728, y: 32, preset: 'top-right' },
        textSize: 'large',
      },
    );

    expect(validateLegend(state, ['#dc2626'], TEST_LEGEND_BOUNDS)).toEqual({
      ok: true,
      activeEntries: [{ color: '#DC2626', label: 'Category', order: 0 }],
    });
  });

  it('blocks export above 30 active colors without silently omitting entries', (): void => {
    const entries = createEntries(31);
    const state = withEntries(entries);

    const result = validateLegend(
      state,
      entries.map((entry) => entry.color),
      TEST_LEGEND_BOUNDS,
    );

    expect(result).toEqual({
      ok: false,
      issues: [{ code: 'too-many-active-colors' }],
    });
    expect(state.entries).toHaveLength(31);
  });

  it('fails closed for reserved keys, invalid enums, labels, and positions', (): void => {
    const unsafe = withEntries(
      JSON.parse(
        '[{"color":"__proto__","label":"Unsafe","order":0}]',
      ) as ReadonlyArray<LegendEntryState>,
      {
        position: { x: Number.NaN, y: 2000, preset: null },
        textSize: 'huge' as LegendState['textSize'],
      },
    );

    expect(validateLegend(unsafe, ['#DC2626'], TEST_LEGEND_BOUNDS)).toEqual({
      ok: false,
      issues: [
        { code: 'invalid-entry-color', path: 'entries[0].color' },
        { code: 'missing-active-color', color: '#DC2626' },
        { code: 'invalid-text-size', path: 'textSize' },
        { code: 'invalid-position', path: 'position' },
      ],
    });
  });

  it('rejects empty, overlong, or non-fitting committed labels', (): void => {
    const empty = withEntries([
      { color: '#DC2626', label: '', order: 0 },
    ]);
    const tooLong = withEntries([
      { color: '#DC2626', label: 'x'.repeat(33), order: 0 },
    ]);
    const doesNotFitLarge = withEntries(
      [{ color: '#DC2626', label: 'x'.repeat(32), order: 0 }],
      { textSize: 'large' },
    );

    expect(validateLegend(empty, ['#DC2626'], TEST_LEGEND_BOUNDS)).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid-label', path: 'entries[0].label' }],
    });
    expect(validateLegend(tooLong, ['#DC2626'], TEST_LEGEND_BOUNDS)).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid-label', path: 'entries[0].label' }],
    });
    expect(
      validateLegend(doesNotFitLarge, ['#DC2626'], TEST_LEGEND_BOUNDS),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'label-does-not-fit', path: 'entries[0].label' }],
    });
  });

  it('measures label fit at the size the layout renders, not the requested size', (): void => {
    // createLegendLayout shrinks text to 'small' at >= 17 active entries.
    // Measuring with the requested 'large' size reported label-does-not-fit for
    // labels that do fit, producing an export block the creator could not clear.
    const uniqueColors = Array.from(
      { length: 17 },
      (_unused, index): string =>
        `#${(index + 1).toString(16).padStart(6, '0').toUpperCase()}`,
    );
    expect(new Set(uniqueColors).size).toBe(17);
    // Derived from the collapsed table so the discriminator survives a
    // re-derivation: the label must fit two 'small' lines but overflow two
    // 'large' lines, which is exactly what separates the requested size from
    // the effective one. The preconditions are asserted so a future value
    // change that breaks the discrimination fails HERE, not silently.
    const label = 'x'.repeat(LEGEND_CHARACTERS_PER_LINE.large * 2 + 1);
    expect(label.length).toBeLessThanOrEqual(
      LEGEND_CHARACTERS_PER_LINE.small * 2,
    );
    expect(label.length).toBeGreaterThan(LEGEND_CHARACTERS_PER_LINE.large * 2);

    const manyEntries: LegendState = {
      ...createDefaultLegendState(),
      textSize: 'large',
      entries: uniqueColors.map(
        (color, order): LegendEntryState => ({ color, label, order }),
      ),
    };

    const layout = createLegendLayout(
      getActiveLegendEntries(uniqueColors, manyEntries),
      manyEntries.textSize,
      BARE,
    );
    expect(layout.effectiveTextSize).toBe('small');

    // The label fits two effective-'small' lines but overflows two 'large'
    // ones, so an ok here proves fit was measured at the effective size.
    expect(
      validateLegend(manyEntries, uniqueColors, {
        width: layout.width,
        height: layout.height,
      }),
    ).toMatchObject({ ok: true });
  });
});

describe('validateActiveLegend export gate', (): void => {
  it('re-evaluates from live state so a cleared color unblocks a previously failing legend', (): void => {
    const overflowing = withEntries(
      [{ color: '#DC2626', label: 'x'.repeat(32), order: 0 }],
      { textSize: 'large' },
    );

    expect(
      validateActiveLegend(overflowing, ['#DC2626'], TEST_LEGEND_BOUNDS, NO_BANDS),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'label-does-not-fit', path: 'entries[0].label' }],
    });

    // Reset All Colors leaves the stored entry in place but drops every active
    // color, so the export gate must clear even though the entry never changed.
    expect(
      validateActiveLegend(overflowing, ['#FFFFFF'], TEST_LEGEND_BOUNDS, NO_BANDS),
    ).toEqual({ ok: true, activeEntries: [] });
  });

  it('cannot report invalid-position, because it validates the resolved position', (): void => {
    const entries = createEntries(9);
    const effectiveColors = entries.map((entry) => entry.color);
    // The exact HI-1 state: parked at the far right while 8 colors made one
    // column, then a 9th color reflowed the legend into two.
    const strandedRight = withEntries(entries, {
      position: { x: 712, y: 32, preset: null },
    });
    const bounds = resolveLegendRender(strandedRight, effectiveColors, NO_BANDS, 'rows')
      .bounds;

    // 648 -> 600, per the rows restyle (`04-13`).
    expect(bounds.width).toBe(600);
    expect(
      validateActiveLegend(strandedRight, effectiveColors, bounds, NO_BANDS),
    ).toEqual(
      {
        ok: true,
        activeEntries: getActiveLegendEntries(effectiveColors, strandedRight),
      },
    );
    // The raw validator still sees the stale stored value, which is exactly why
    // nothing may read the stored position directly.
    expect(
      validateLegend(strandedRight, effectiveColors, bounds),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid-position', path: 'position' }],
    });
  });

  /*
   * D4-11 deleted the background-opacity scale outright, so the gate that
   * validated it is deleted with it rather than left asserting a field nobody
   * writes. What replaces it: the surviving style field is still validated,
   * and a legend carrying NO chrome fields at all is still accepted — the
   * two halves of "the box is unreachable, and its absence is not an error".
   */
  it('still gates the one surviving style field, and accepts a chrome-free legend', (): void => {
    const entry = { color: '#DC2626', label: 'Category', order: 0 };
    const bare = withEntries([entry]);

    expect(bare).toEqual({
      entries: [entry],
      position: { x: 32, y: 32, preset: 'top-left' },
      textSize: 'medium',
      // `04-13`'s three additions, asserted here too so a chrome field cannot
      // sneak back in disguised as one of them.
      form: null,
      caption: '',
      showNoData: false,
    });
    expect(
      validateActiveLegend(bare, ['#DC2626'], TEST_LEGEND_BOUNDS, NO_BANDS),
    ).toEqual({ ok: true, activeEntries: [entry] });

    expect(
      validateActiveLegend(
        withEntries([entry], {
          textSize: 'huge' as LegendState['textSize'],
        }),
        ['#DC2626'],
        TEST_LEGEND_BOUNDS,
        NO_BANDS,
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid-text-size', path: 'textSize' }],
    });
  });
});

/* ------------------------------------------------------------------ *
 * D4-12 — two legend forms, one position resolver
 * ------------------------------------------------------------------ */

/**
 * `04-13`. The bar is a SECOND layout function with its OWN bounds, and the
 * whole reason it exists is that `createLegendLayout`'s width is
 * `columns * LEGEND_COLUMN_WIDTH + (columns - 1) * LEGEND_COLUMN_GAP` — a
 * column-list formula that does not describe a 48-unit strip.
 *
 * Every geometry number below is asserted TWICE where it can be: once as a
 * literal, and once reproduced from the constants it is built out of. A test
 * written only against the constant it imports cannot fail on its own subject
 * (`04-01` shipped exactly that shape and it had to be caught in review).
 */
describe('legend forms (D4-12)', (): void => {
  const rampColors: ColorMap = {
    FRA: rampColor('reds', 0.5),
    DEU: customColor('#2563EB'),
  };
  const customOnlyColors: ColorMap = {
    FRA: customColor('#DC2626'),
    DEU: customColor('#2563EB'),
  };

  it('names exactly two forms, and the vocabulary has one home', (): void => {
    expect([...LEGEND_FORMS].sort()).toEqual(['bar', 'rows']);
    expect(LEGEND_FORMS.size).toBe(2);
  });

  it('infers Bar when ANY assignment is a ramp, Rows when all are custom hex', (): void => {
    expect(inferLegendForm(rampColors)).toBe('bar');
    expect(inferLegendForm(customOnlyColors)).toBe('rows');
    expect(inferLegendForm({ FRA: rampColor('blues', 0) })).toBe('bar');
  });

  it('infers Rows for an empty colour map and produces no marks', (): void => {
    expect(inferLegendForm({})).toBe('rows');

    const rendered = resolveLegendRender(
      createDefaultLegendState(),
      [],
      NO_BANDS,
      inferLegendForm({}),
    );
    expect(rendered.form).toBe('rows');
    expect(rendered.bounds).toEqual({ width: 0, height: 0 });
    expect(rendered.activeEntries).toEqual([]);
    if (rendered.layout.form !== 'rows') {
      throw new Error('an empty colour map resolved to the bar form');
    }
    expect(rendered.layout.items).toEqual([]);
    expect(rendered.layout.caption).toBeNull();
    expect(rendered.layout.noData).toBeNull();
  });

  it('lets an explicit creator override beat inferLegendForm, in both directions', (): void => {
    const base = withEntries(createEntries(2));

    expect(resolveLegendForm({ ...base, form: null }, 'bar')).toBe('bar');
    expect(resolveLegendForm({ ...base, form: null }, 'rows')).toBe('rows');
    expect(resolveLegendForm({ ...base, form: 'rows' }, 'bar')).toBe('rows');
    expect(resolveLegendForm({ ...base, form: 'bar' }, 'rows')).toBe('bar');
    // T-04-13-01: an unrecognised STORED value never wins — a legend with
    // neither form's marks is a blank rectangle in the exported PNG.
    expect(
      resolveLegendForm({ ...base, form: 'stack' as never }, 'bar'),
    ).toBe('bar');
  });

  it('stacks bar swatches contiguously — ZERO gap, where rows use LEGEND_ENTRY_GAP', (): void => {
    const layout = createBarLegendLayout(createEntries(4), 'medium', BARE);
    if (layout.form !== 'bar') {
      throw new Error('createBarLegendLayout returned a rows layout');
    }

    expect(LEGEND_BAR_SEGMENT_GAP).toBe(0);
    expect(LEGEND_ENTRY_GAP).toBe(8);
    expect(LEGEND_BAR_SEGMENT_GAP).not.toBe(LEGEND_ENTRY_GAP);

    // MEASURED from the layout, not restated from the constant: every adjacent
    // pair touches exactly, so there is no room for a background pixel between
    // them. This is Gate B's unit-level twin.
    const gaps = layout.segments.slice(1).map((segment, index): number => {
      const previous = layout.segments[index];
      return segment.y - (previous.y + previous.height);
    });
    expect(gaps).toEqual([0, 0, 0]);
    expect(new Set(gaps)).toEqual(new Set([LEGEND_BAR_SEGMENT_GAP]));

    // The rows form, same entries, MUST disagree — one property, two forms,
    // opposite expectations, so neither can pass by accident.
    const rows = createLegendLayout(createEntries(4), 'medium', BARE);
    if (rows.form !== 'rows') {
      throw new Error('createLegendLayout returned a bar layout');
    }
    const rowGaps = rows.items.slice(1).map((item, index): number => {
      const previous = rows.items[index];
      return item.y - (previous.y + previous.height);
    });
    expect(rowGaps).toEqual([
      LEGEND_ENTRY_GAP,
      LEGEND_ENTRY_GAP,
      LEGEND_ENTRY_GAP,
    ]);
  });

  it('gives the bar a height of entry count x segment height, plus the caption line', (): void => {
    const bare = createBarLegendLayout(createEntries(5), 'medium', BARE);
    if (bare.form !== 'bar') {
      throw new Error('createBarLegendLayout returned a rows layout');
    }
    expect(bare.segmentHeight).toBe(32);
    expect(bare.height).toBe(160);
    expect(bare.height).toBe(5 * bare.segmentHeight);
    // An EMPTY caption reserves nothing — 40 units of dead space above the
    // marks would push the legend back down, which is `G-1`'s complaint.
    expect(bare.caption).toBeNull();

    const captioned = createBarLegendLayout(createEntries(5), 'medium', {
      caption: 'EU = 6.0%',
      showNoData: false,
    });
    if (captioned.form !== 'bar') {
      throw new Error('createBarLegendLayout returned a rows layout');
    }
    expect(captioned.height).toBe(200);
    expect(captioned.height).toBe(
      5 * captioned.segmentHeight + LEGEND_CAPTION_BLOCK_HEIGHT,
    );
    expect(captioned.caption).toMatchObject({
      text: 'EU = 6.0%',
      fontSize: LEGEND_CAPTION_FONT_SIZE,
      x: 0,
    });
    // Every segment moved down by exactly the caption block, and nothing else.
    bare.segments.forEach((segment, index): void => {
      expect(captioned.segments[index].y - segment.y).toBe(
        LEGEND_CAPTION_BLOCK_HEIGHT,
      );
    });
  });

  it('widths the bar from the strip, the ticks, and the widest boundary label — NOT the column formula', (): void => {
    const entries = createEntries(3);
    const layout = createBarLegendLayout(entries, 'medium', BARE);
    const fontSize = LEGEND_TEXT_FONT_SIZE.medium;
    const widestLabel = Math.max(
      ...entries.map((entry): number => legendTextWidth(entry.label, fontSize)),
    );

    expect(layout.width).toBe(
      LEGEND_BAR_WIDTH +
        LEGEND_BAR_TICK_LENGTH +
        LEGEND_BAR_TICK_LABEL_GAP +
        widestLabel,
    );
    // The literal, so a change to the arithmetic cannot hide behind the
    // derivation above.
    expect(layout.width).toBe(297);

    // ⚠ The load-bearing claim: it is NOT `createLegendLayout`'s width. The
    // rows form at the same entry count reports 288, and reusing that formula
    // would over-report the strip by 240 units and clamp the legend to the
    // wrong place at a right-anchored preset.
    const rows = createLegendLayout(entries, 'medium', BARE);
    expect(rows.width).toBe(288);
    expect(layout.width).not.toBe(rows.width);
  });

  it('draws N+1 tick leaders and N boundary labels, and prints no literal range text', (): void => {
    const layout = createBarLegendLayout(createEntries(6), 'medium', BARE);
    if (layout.form !== 'bar') {
      throw new Error('createBarLegendLayout returned a rows layout');
    }

    expect(layout.ticks).toHaveLength(7);
    expect(layout.boundaries).toHaveLength(6);
    expect(layout.ticks.every((tick): boolean => tick.x1 === LEGEND_BAR_WIDTH)).toBe(
      true,
    );
    expect(
      layout.ticks.every(
        (tick): boolean => tick.x2 - tick.x1 === LEGEND_BAR_TICK_LENGTH,
      ),
    ).toBe(true);
    // The last tick closes the bar at its foot; the first opens it at the top.
    expect(layout.ticks[0].y).toBe(layout.outline?.y);
    expect(layout.ticks[6].y).toBe(
      (layout.outline?.y ?? 0) + (layout.outline?.height ?? 0),
    );

    // CD-8: BOUNDARIES, never ranges. Every rendered string is an entry label
    // verbatim — nothing joins two of them with a dash.
    const rangePattern = /[0-9]\s*[-–]\s*[0-9]/u;
    layout.boundaries.forEach((boundary): void => {
      expect(boundary.entry.label).not.toMatch(rangePattern);
    });

    // Every boundary label hangs BELOW its tick, so the first one cannot poke
    // above the legend's own bounds — a bound that does not contain its ink is
    // the failure Live Invariant 3 exists to prevent.
    layout.boundaries.forEach((boundary, index): void => {
      expect(boundary.baseline).toBeGreaterThan(layout.ticks[index].y);
      expect(boundary.baseline).toBeLessThanOrEqual(layout.ticks[index + 1].y);
    });
  });

  it('binds the "no data" row into BOTH forms bounds, detached from the marks', (): void => {
    const withNoData = { caption: '', showNoData: true };

    const bar = createBarLegendLayout(createEntries(3), 'medium', withNoData);
    const bareBar = createBarLegendLayout(createEntries(3), 'medium', BARE);
    expect(bar.noData).not.toBeNull();
    expect(bareBar.noData).toBeNull();
    expect(bar.height).toBeGreaterThan(bareBar.height);
    // Detached: the row starts BELOW the bar's foot, so the bar itself stays
    // contiguous. Welding it on would make "no data" read as a ramp step.
    if (bar.form !== 'bar') {
      throw new Error('createBarLegendLayout returned a rows layout');
    }
    expect(bar.noData?.swatchY).toBeGreaterThan(
      (bar.outline?.y ?? 0) + (bar.outline?.height ?? 0),
    );

    const rows = createLegendLayout(createEntries(3), 'medium', withNoData);
    const bareRows = createLegendLayout(createEntries(3), 'medium', BARE);
    expect(rows.noData).not.toBeNull();
    expect(bareRows.noData).toBeNull();
    expect(rows.height).toBeGreaterThan(bareRows.height);
  });

  it('clamps BOTH forms inside the 1080 square through resolveLegendPosition', (): void => {
    const entries = createEntries(3);
    const effectiveColors = entries.map((entry): string => entry.color);
    // Parked far outside the square on both axes, as a CUSTOM position so the
    // preset branch cannot rescue it.
    const stranded = withEntries(entries, {
      position: { x: 4000, y: 4000, preset: null },
    });

    (['bar', 'rows'] as const).forEach((form): void => {
      const rendered = resolveLegendRender(
        { ...stranded, form },
        effectiveColors,
        NO_BANDS,
        form,
      );

      expect(rendered.form).toBe(form);
      expect(rendered.position.x).toBeGreaterThanOrEqual(LEGEND_SAFE_INSET);
      expect(rendered.position.y).toBeGreaterThanOrEqual(LEGEND_SAFE_INSET);
      expect(
        rendered.position.x + rendered.bounds.width,
        `the ${form} legend runs off the right of the exported square`,
      ).toBeLessThanOrEqual(1080 - LEGEND_SAFE_INSET);
      expect(
        rendered.position.y + rendered.bounds.height,
        `the ${form} legend runs off the bottom of the exported square`,
      ).toBeLessThanOrEqual(1080 - LEGEND_SAFE_INSET);
    });
  });

  it('clamps BOTH forms at a right-anchored preset, where the two widths differ most', (): void => {
    const entries = createEntries(3);
    const effectiveColors = entries.map((entry): string => entry.color);
    const topRight = withEntries(entries, {
      position: { x: 0, y: 0, preset: 'top-right' },
    });

    const bar = resolveLegendRender(
      { ...topRight, form: 'bar' },
      effectiveColors,
      NO_BANDS,
      'bar',
    );
    const rows = resolveLegendRender(
      { ...topRight, form: 'rows' },
      effectiveColors,
      NO_BANDS,
      'rows',
    );

    // Each form's RIGHT EDGE lands exactly on the safe inset. That is only true
    // if each form's OWN width reached the resolver: a bar clamped with the
    // rows width would sit 240 units inside the frame edge.
    expect(bar.position.x + bar.bounds.width).toBe(1080 - LEGEND_SAFE_INSET);
    expect(rows.position.x + rows.bounds.width).toBe(1080 - LEGEND_SAFE_INSET);
    expect(bar.position.x).not.toBe(rows.position.x);
    expect(bar.position.x).toBe(751);
    expect(rows.position.x).toBe(760);
  });

  it('routes resolveLegendBounds through the same dispatch as resolveLegendRender', (): void => {
    const entries = createEntries(4);
    const effectiveColors = entries.map((entry): string => entry.color);
    const legend = withEntries(entries);

    (['bar', 'rows'] as const).forEach((form): void => {
      expect(resolveLegendBounds(legend, effectiveColors, form)).toEqual(
        resolveLegendRender(legend, effectiveColors, NO_BANDS, form).bounds,
      );
    });
  });

  it('keeps LEGEND_MAX_ACTIVE_ENTRIES gating export in BOTH forms, unchanged', (): void => {
    const entries = createEntries(31);
    const effectiveColors = entries.map((entry): string => entry.color);
    const legend = withEntries(entries);

    (['bar', 'rows'] as const).forEach((form): void => {
      const bounds = resolveLegendBounds(legend, effectiveColors, form);
      const validation = validateActiveLegend(
        { ...legend, form },
        effectiveColors,
        bounds,
        NO_BANDS,
      );

      expect(validation.ok).toBe(false);
      if (validation.ok) {
        throw new Error('31 colours passed the overflow gate');
      }
      expect(validation.issues).toContainEqual({
        code: 'too-many-active-colors',
      });
      expect(getLegendBlockingMessage(validation.issues)).toBe(
        LEGEND_OVERFLOW_MESSAGE,
      );
    });
  });

  it('keeps every form/text-size combination inside the exported square', (): void => {
    (['bar', 'rows'] as const).forEach((form): void => {
      ([1, 8, 9, 17, 30] as const).forEach((count): void => {
        (['small', 'medium', 'large'] as const).forEach((textSize): void => {
          const entries = createEntries(count);
          const layout =
            form === 'bar'
              ? createBarLegendLayout(entries, textSize, {
                  caption: 'Unemployment rate, June',
                  showNoData: true,
                })
              : createLegendLayout(entries, textSize, {
                  caption: 'Unemployment rate, June',
                  showNoData: true,
                });

          expect(
            layout.width,
            `${form}/${String(count)}/${textSize} is wider than the safe area`,
          ).toBeLessThanOrEqual(1080 - LEGEND_SAFE_INSET * 2);
          expect(
            layout.height,
            `${form}/${String(count)}/${textSize} is taller than the safe area`,
          ).toBeLessThanOrEqual(1080 - LEGEND_SAFE_INSET * 2);
        });
      });
    });
  });

  it('measures text with the SAME worst-case advance compositionText.ts uses', (): void => {
    // Declared twice on purpose (the `BAND_FALLBACK_STOP_COLOR` precedent):
    // `compositionText.ts` imports `LEGEND_SAFE_INSET` from `legend.ts`, so the
    // reverse edge would be circular. This assertion is what keeps the
    // duplication a CHECKED claim rather than a stale comment.
    expect(LEGEND_WIDEST_CHARACTER_ADVANCE_EM).toBe(WIDEST_CHARACTER_ADVANCE_EM);
    expect(legendTextWidth('WWWW', 32)).toBe(
      Math.ceil(4 * 32 * WIDEST_CHARACTER_ADVANCE_EM),
    );
    expect(legendTextWidth('', 32)).toBe(0);
  });
});
