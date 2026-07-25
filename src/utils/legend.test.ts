import { describe, expect, it } from 'vitest';

import type {
  LegendEntryState,
  LegendState,
} from '../types/composition';
import type { SceneFeature } from '../types/map';
import {
  createDefaultLegendState,
  createLegendLayout,
  getActiveLegendEntries,
  getLegendCornerPosition,
  moveLegendEntry,
  nudgeLegendPosition,
  reconcileLegend,
  reconcileLegendForScene,
  resolveLegendPosition,
  resolveLegendRender,
  validateActiveLegend,
  validateLegend,
  validateLegendForScene,
} from './legend';
import {
  composeEffectiveScene,
  getEffectiveSceneColors,
} from './scene';

const TEST_RING: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

const TEST_LEGEND_BOUNDS = Object.freeze({ width: 320, height: 240 });

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
      'HIST-HRE': '#dc2626',
      'HIST-SAXONY': 'rgb(220, 38, 38)',
    };
    const effectiveColors = getEffectiveSceneColors(scene, colors);
    const reconciled = reconcileLegendForScene(
      scene,
      colors,
      createDefaultLegendState(),
    );

    expect(reconciled.entries).toEqual([
      { color: '#DC2626', label: '#DC2626', order: 0 },
    ]);
    expect(getActiveLegendEntries(effectiveColors, reconciled)).toEqual(
      reconciled.entries,
    );
    expect(
      validateLegendForScene(reconciled, scene, colors, TEST_LEGEND_BOUNDS),
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
    const layout = createLegendLayout(createEntries(count), 'medium');

    expect(layout.columns).toBe(columns);
    expect(layout.items).toHaveLength(count);
    expect(layout.width).toBeLessThanOrEqual(1016);
    expect(layout.height).toBeLessThanOrEqual(1016);
    expect(layout.effectiveTextSize).toBe(count >= 17 ? 'small' : 'medium');
  });
});

describe('legend positioning', (): void => {
  it.each([
    ['top-left', { x: 32, y: 32 }],
    ['top-right', { x: 728, y: 32 }],
    ['bottom-left', { x: 32, y: 808 }],
    ['bottom-right', { x: 728, y: 808 }],
  ] as const)('places %s at the exact safe inset', (corner, expected): void => {
    expect(getLegendCornerPosition(corner, TEST_LEGEND_BOUNDS)).toEqual({
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

    expect(resolveLegendPosition(parkedRight, ONE_COLUMN)).toEqual({
      x: 712,
      y: 32,
      preset: null,
    });
    // The 9th color reflows to two columns: 712 + 648 = 1360 would put 280px
    // outside the 1080 canvas, so the resolved x drops to the new maximum.
    expect(resolveLegendPosition(parkedRight, TWO_COLUMNS)).toEqual({
      x: 400,
      y: 32,
      preset: null,
    });
    expect(400 + TWO_COLUMNS.width).toBe(1048);
  });

  it('re-clamps at the harsher 16 to 17 entry step', (): void => {
    const parkedRight = { x: 400, y: 32, preset: null };

    expect(resolveLegendPosition(parkedRight, THREE_COLUMNS)).toEqual({
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
      ),
    ).toEqual({ x: 712, y: 560, preset: 'bottom-right' });
    expect(
      resolveLegendPosition(
        { x: 712, y: 560, preset: 'bottom-right' },
        THREE_COLUMNS,
      ),
    ).toEqual({ x: 88, y: 688, preset: 'bottom-right' });
  });

  it('falls back to the safe inset for non-finite or unknown stored values', (): void => {
    expect(
      resolveLegendPosition(
        { x: Number.NaN, y: -4000, preset: null },
        ONE_COLUMN,
      ),
    ).toEqual({ x: 32, y: 32, preset: null });
    expect(
      resolveLegendPosition(
        { x: 900, y: 900, preset: 'middle' as never },
        ONE_COLUMN,
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
    );

    expect(resolved.bounds).toEqual({ width: 648, height: resolved.layout.height });
    expect(resolved.position).toEqual({ x: 400, y: 32, preset: null });
    expect(resolved.activeEntries).toHaveLength(9);
  });
});

describe('validateLegend', (): void => {
  it('accepts exact enums, bounds, labels, and active effective colors', (): void => {
    const state = withEntries(
      [{ color: '#DC2626', label: 'Category', order: 0 }],
      {
        position: { x: 728, y: 32, preset: 'top-right' },
        theme: 'dark',
        textSize: 'large',
        backgroundOpacity: 0.7,
        borderStyle: 'strong',
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

  it('fails closed for reserved keys, invalid enums, opacity, labels, and positions', (): void => {
    const unsafe = withEntries(
      JSON.parse(
        '[{"color":"__proto__","label":"Unsafe","order":0}]',
      ) as ReadonlyArray<LegendEntryState>,
      {
        position: { x: Number.NaN, y: 2000, preset: null },
        theme: 'glass' as LegendState['theme'],
        textSize: 'huge' as LegendState['textSize'],
        backgroundOpacity: 0.4,
        borderStyle: 'shadow' as LegendState['borderStyle'],
      },
    );

    expect(validateLegend(unsafe, ['#DC2626'], TEST_LEGEND_BOUNDS)).toEqual({
      ok: false,
      issues: [
        { code: 'invalid-entry-color', path: 'entries[0].color' },
        { code: 'missing-active-color', color: '#DC2626' },
        { code: 'invalid-theme', path: 'theme' },
        { code: 'invalid-text-size', path: 'textSize' },
        { code: 'invalid-background-opacity', path: 'backgroundOpacity' },
        { code: 'invalid-border-style', path: 'borderStyle' },
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
});

describe('validateActiveLegend export gate', (): void => {
  it('re-evaluates from live state so a cleared color unblocks a previously failing legend', (): void => {
    const overflowing = withEntries(
      [{ color: '#DC2626', label: 'x'.repeat(32), order: 0 }],
      { textSize: 'large', backgroundOpacity: 90 },
    );

    expect(
      validateActiveLegend(overflowing, ['#DC2626'], TEST_LEGEND_BOUNDS),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'label-does-not-fit', path: 'entries[0].label' }],
    });

    // Reset All Colors leaves the stored entry in place but drops every active
    // color, so the export gate must clear even though the entry never changed.
    expect(
      validateActiveLegend(overflowing, ['#FFFFFF'], TEST_LEGEND_BOUNDS),
    ).toEqual({ ok: true, activeEntries: [] });
  });

  it('cannot report invalid-position, because it validates the resolved position', (): void => {
    const entries = createEntries(9);
    const effectiveColors = entries.map((entry) => entry.color);
    // The exact HI-1 state: parked at the far right while 8 colors made one
    // column, then a 9th color reflowed the legend into two.
    const strandedRight = withEntries(entries, {
      position: { x: 712, y: 32, preset: null },
      backgroundOpacity: 90,
    });
    const bounds = resolveLegendRender(strandedRight, effectiveColors).bounds;

    expect(bounds.width).toBe(648);
    expect(validateActiveLegend(strandedRight, effectiveColors, bounds)).toEqual(
      {
        ok: true,
        activeEntries: getActiveLegendEntries(effectiveColors, strandedRight),
      },
    );
    // The raw validator still sees the stale stored value, which is exactly why
    // nothing may read the stored position directly.
    expect(
      validateLegend(
        { ...strandedRight, backgroundOpacity: 0.9 },
        effectiveColors,
        bounds,
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'invalid-position', path: 'position' }],
    });
  });

  it('converts the stored 0-100 background opacity to the exported ratio', (): void => {
    const state = withEntries(
      [{ color: '#DC2626', label: 'Category', order: 0 }],
      { backgroundOpacity: 90 },
    );

    expect(
      validateActiveLegend(state, ['#DC2626'], TEST_LEGEND_BOUNDS),
    ).toEqual({
      ok: true,
      activeEntries: [{ color: '#DC2626', label: 'Category', order: 0 }],
    });
    expect(
      validateLegend(state, ['#DC2626'], TEST_LEGEND_BOUNDS),
    ).toMatchObject({
      ok: false,
      issues: [
        { code: 'invalid-background-opacity', path: 'backgroundOpacity' },
      ],
    });
  });
});
