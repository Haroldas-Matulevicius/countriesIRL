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
