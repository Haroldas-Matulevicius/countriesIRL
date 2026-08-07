import { afterEach, describe, expect, it, vi } from 'vitest';

import manifestText from '../../public/data/world-manifest.json?raw';
import worldText from '../../public/data/world-modern.geojson?raw';
import { WORLD_MANIFEST_URL, loadWorldGeoData } from '../hooks/useGeoData';

import { NEUTRAL_UNIT_COLOR } from '../constants/colors';
import type { EffectiveScene, SnapshotId } from '../types/composition';
import type { ColorMap, CountryId, SceneFeature } from '../types/map';
import { customColor, rampColor } from './colors';
import { reconcileLegend, createDefaultLegendState } from './legend';
import {
  composeEffectiveScene,
  getEffectiveFeatureColor,
  getEffectiveSceneColors,
  getSelectableEntityIds,
  reconcileSelectionForScene,
} from './scene';

const TEST_RING: number[][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

interface SelectableFeatureOptions {
  readonly sourceFeatureId: string;
  readonly entityId: CountryId;
  readonly name: string;
  readonly boundaryMode: 'modern' | 'historical';
  readonly provenanceId?: string;
  readonly interactionMode?: 'modern-core' | 'historical-entity';
}

function createSelectableFeature(options: SelectableFeatureOptions): SceneFeature {
  return {
    type: 'Feature',
    id: options.sourceFeatureId,
    sourceFeatureId: options.sourceFeatureId,
    entityId: options.entityId,
    colorOwnerId: options.entityId,
    isSelectable: true,
    interactionMode:
      options.interactionMode ??
      (options.boundaryMode === 'modern' ? 'modern-core' : 'historical-entity'),
    boundaryMode: options.boundaryMode,
    provenanceId: options.provenanceId ?? `${options.sourceFeatureId}-provenance`,
    properties: { name: options.name },
    geometry: {
      type: 'Polygon',
      coordinates: [TEST_RING],
    },
  };
}

function createDependencyFeature(
  sourceFeatureId: string,
  entityId: CountryId,
  colorOwnerId: CountryId,
  boundaryMode: 'modern' | 'historical',
): SceneFeature {
  return {
    type: 'Feature',
    id: sourceFeatureId,
    sourceFeatureId,
    entityId,
    colorOwnerId,
    isSelectable: false,
    interactionMode: 'inherited-dependency',
    boundaryMode,
    provenanceId: `${sourceFeatureId}-provenance`,
    properties: { name: entityId },
    geometry: {
      type: 'Polygon',
      coordinates: [TEST_RING],
    },
  };
}

function createNeutralFeature(
  sourceFeatureId: string,
  interactionMode: 'neutral' | 'disputed',
  boundaryMode: 'modern' | 'historical',
): SceneFeature {
  return {
    type: 'Feature',
    id: sourceFeatureId,
    sourceFeatureId,
    entityId: sourceFeatureId,
    colorOwnerId: null,
    isSelectable: false,
    interactionMode,
    boundaryMode,
    provenanceId: `${sourceFeatureId}-provenance`,
    properties: { name: sourceFeatureId },
    geometry: {
      type: 'Polygon',
      coordinates: [TEST_RING],
    },
  };
}

function composeHistoricalScene(
  snapshotId: SnapshotId,
  modernFeatures: ReadonlyArray<SceneFeature>,
  historicalFeatures: ReadonlyArray<SceneFeature>,
  replacedModernSourceFeatureIds: ReadonlySet<string>,
): EffectiveScene {
  return composeEffectiveScene({
    snapshotId,
    modernFeatures,
    historicalFeatures,
    replacedModernSourceFeatureIds,
  });
}

describe('composeEffectiveScene', (): void => {
  it('uses explicit color owners and keeps dependencies and neutral units non-selectable', (): void => {
    const modernFeatures = [
      createSelectableFeature({
        sourceFeatureId: 'modern-FRA',
        entityId: 'FRA',
        name: 'France',
        boundaryMode: 'modern',
      }),
      createDependencyFeature('modern-GLP', 'GLP', 'FRA', 'modern'),
      createNeutralFeature('modern-ESH', 'disputed', 'modern'),
    ];
    const scene = composeEffectiveScene({
      snapshotId: 'modern',
      modernFeatures,
    });
    const colors: ColorMap = {
      FRA: customColor('#dc2626'),
      GLP: customColor('#2563EB'),
      ESH: customColor('#16A34A'),
    };

    expect([...scene.selectableEntityIds]).toEqual(['FRA']);
    expect(getSelectableEntityIds(scene.features)).toEqual(new Set(['FRA']));
    // The neutral unit renders the neutral fill (never white), and because its
    // owner is null it must stay out of the effective colors the legend and
    // export gate read.
    expect(scene.features.map((feature) => getEffectiveFeatureColor(feature, colors))).toEqual([
      '#DC2626',
      '#DC2626',
      NEUTRAL_UNIT_COLOR,
    ]);
    expect(NEUTRAL_UNIT_COLOR).not.toBe('#FFFFFF');
    expect(getEffectiveSceneColors(scene, colors)).toEqual(['#DC2626', '#DC2626']);
  });

  it('replaces declared modern coverage and preserves modern fallback elsewhere', (): void => {
    const modernFeatures = Object.freeze([
      createSelectableFeature({
        sourceFeatureId: 'modern-FRA',
        entityId: 'FRA',
        name: 'France',
        boundaryMode: 'modern',
      }),
      createDependencyFeature('modern-GLP', 'GLP', 'FRA', 'modern'),
      createSelectableFeature({
        sourceFeatureId: 'modern-DEU',
        entityId: 'DEU',
        name: 'Germany',
        boundaryMode: 'modern',
      }),
    ]);
    const historicalFeatures = Object.freeze([
      createSelectableFeature({
        sourceFeatureId: 'historical-france-1700',
        entityId: 'FRA',
        name: 'Kingdom of France',
        boundaryMode: 'historical',
      }),
      createSelectableFeature({
        sourceFeatureId: 'historical-hre-1700',
        entityId: 'HIST-HRE',
        name: 'Holy Roman Empire',
        boundaryMode: 'historical',
      }),
      createDependencyFeature('historical-colony-1700', 'HIST-COLONY', 'FRA', 'historical'),
    ]);
    const scene = composeHistoricalScene(
      '1700',
      modernFeatures,
      historicalFeatures,
      new Set(['modern-FRA', 'modern-GLP']),
    );

    expect(scene.features.map((feature) => feature.sourceFeatureId)).toEqual([
      'modern-DEU',
      'historical-france-1700',
      'historical-hre-1700',
      'historical-colony-1700',
    ]);
    expect(scene.features.map((feature) => feature.boundaryMode)).toEqual([
      'modern-fallback',
      'historical',
      'historical',
      'historical',
    ]);
    expect([...scene.selectableEntityIds]).toEqual(['DEU', 'FRA', 'HIST-HRE']);
    expect(modernFeatures.map((feature) => feature.boundaryMode)).toEqual([
      'modern',
      'modern',
      'modern',
    ]);
  });

  it('fails when historical selection collides with undeclared modern fallback', (): void => {
    const modernFrance = createSelectableFeature({
      sourceFeatureId: 'modern-FRA',
      entityId: 'FRA',
      name: 'France',
      boundaryMode: 'modern',
    });
    const historicalFrance = createSelectableFeature({
      sourceFeatureId: 'historical-france-1700',
      entityId: 'FRA',
      name: 'Kingdom of France',
      boundaryMode: 'historical',
    });

    expect((): EffectiveScene =>
      composeHistoricalScene(
        '1700',
        [modernFrance],
        [historicalFrance],
        new Set(),
      ),
    ).toThrow('historical-selectable-entity-collision');
    expect((): EffectiveScene =>
      composeHistoricalScene(
        '1700',
        [modernFrance],
        [historicalFrance],
        new Set(['modern-FRA']),
      ),
    ).not.toThrow();
  });

  it('rejects duplicate feature, fallback source, and selectable identities', (): void => {
    const france = createSelectableFeature({
      sourceFeatureId: 'modern-FRA',
      entityId: 'FRA',
      name: 'France',
      boundaryMode: 'modern',
    });
    const duplicateFeatureId: SceneFeature = {
      ...createSelectableFeature({
        sourceFeatureId: 'modern-DEU',
        entityId: 'DEU',
        name: 'Germany',
        boundaryMode: 'modern',
      }),
      id: france.id,
    };
    const duplicateSourceId: SceneFeature = {
      ...createSelectableFeature({
        sourceFeatureId: 'modern-ESP',
        entityId: 'ESP',
        name: 'Spain',
        boundaryMode: 'modern',
      }),
      id: 'modern-ESP-copy',
      sourceFeatureId: france.sourceFeatureId,
    };
    const duplicateSelectableId = createSelectableFeature({
      sourceFeatureId: 'modern-FRA-copy',
      entityId: 'FRA',
      name: 'France copy',
      boundaryMode: 'modern',
    });

    expect((): EffectiveScene =>
      composeEffectiveScene({
        snapshotId: 'modern',
        modernFeatures: [france, duplicateFeatureId],
      }),
    ).toThrow('duplicate-scene-feature-id');
    expect((): EffectiveScene =>
      composeEffectiveScene({
        snapshotId: 'modern',
        modernFeatures: [france, duplicateSourceId],
      }),
    ).toThrow('duplicate-scene-source-feature-id');
    expect((): EffectiveScene =>
      composeEffectiveScene({
        snapshotId: 'modern',
        modernFeatures: [france, duplicateSelectableId],
      }),
    ).toThrow('duplicate-scene-selectable-entity-id');
  });

  it('keeps continuing colors while distinct historical identities start white without heuristics', (): void => {
    const historicalFeatures = [
      createSelectableFeature({
        sourceFeatureId: 'historical-france-1700',
        entityId: 'FRA',
        name: 'Kingdom of France',
        boundaryMode: 'historical',
      }),
      createSelectableFeature({
        sourceFeatureId: 'historical-hre-1700',
        entityId: 'HIST-HRE',
        name: 'Holy Roman Empire',
        boundaryMode: 'historical',
      }),
    ];
    const scene = composeHistoricalScene('1700', [], historicalFeatures, new Set());
    const sourceAndNameColors: ColorMap = {
      FRA: customColor('#DC2626'),
      'historical-hre-1700': customColor('#16A34A'),
      'Holy Roman Empire': customColor('#2563EB'),
    };

    expect(getEffectiveSceneColors(scene, sourceAndNameColors)).toEqual([
      '#DC2626',
      '#FFFFFF',
    ]);
    expect([...scene.selectableEntityIds]).toEqual(['FRA', 'HIST-HRE']);
  });

  it('fails closed for reserved curator IDs without removing visible geography', (): void => {
    const unsafeFeature = createSelectableFeature({
      sourceFeatureId: 'historical-unsafe',
      entityId: '__proto__',
      name: 'Unsafe entity',
      boundaryMode: 'historical',
    });
    const scene = composeHistoricalScene('1700', [], [unsafeFeature], new Set());
    const colors = JSON.parse(
      '{"__proto__":{"kind":"custom","hex":"#DC2626"}}',
    ) as ColorMap;

    expect(scene.features).toHaveLength(1);
    expect(scene.selectableEntityIds.size).toBe(0);
    expect(getEffectiveFeatureColor(scene.features[0], colors)).toBe('#FFFFFF');
    expect(getEffectiveSceneColors(scene, colors)).toEqual(['#FFFFFF']);
  });
});

/* ------------------------------------------------------------------ *
 * 04-08 / D4-09 - the render-time uncoloured fill
 * ------------------------------------------------------------------ */

describe('getEffectiveFeatureColor and the uncolored fill', (): void => {
  const UNCOLORED_FILL = '#E5E7EB';
  const CUSTOM_UNCOLORED_FILL = '#D1D5DB';

  function createTwoCountryScene(): EffectiveScene {
    return composeEffectiveScene({
      snapshotId: 'modern',
      modernFeatures: [
        createSelectableFeature({
          sourceFeatureId: 'modern-FRA',
          entityId: 'FRA',
          name: 'France',
          boundaryMode: 'modern',
        }),
        createSelectableFeature({
          sourceFeatureId: 'modern-DEU',
          entityId: 'DEU',
          name: 'Germany',
          boundaryMode: 'modern',
        }),
      ],
    });
  }

  it('renders the creator fill for a country with no stored colour', (): void => {
    const scene = createTwoCountryScene();
    const colors: ColorMap = { FRA: customColor('#DC2626') };
    const [france, germany] = scene.features;
    if (france === undefined || germany === undefined) {
      throw new Error('The fixture scene lost a feature.');
    }

    expect(getEffectiveFeatureColor(france, colors, UNCOLORED_FILL)).toBe(
      '#DC2626',
    );
    expect(getEffectiveFeatureColor(germany, colors, UNCOLORED_FILL)).toBe(
      UNCOLORED_FILL,
    );
  });

  it('renders a CUSTOM fill rather than the default when one is given', (): void => {
    const scene = createTwoCountryScene();
    const [, germany] = scene.features;
    if (germany === undefined) {
      throw new Error('The fixture scene lost a feature.');
    }

    expect(
      getEffectiveFeatureColor(germany, {}, CUSTOM_UNCOLORED_FILL),
      'the render must follow settings.uncoloredFill, not a constant baked ' +
        'into this function.',
    ).toBe(CUSTOM_UNCOLORED_FILL);
    expect(CUSTOM_UNCOLORED_FILL).not.toBe(UNCOLORED_FILL);
  });

  /**
   * The assertion that stops a future refactor from "simplifying" the sentinel
   * away. `#FFFFFF` is what STORAGE holds for an uncoloured country and what
   * `reconcileLegend` excludes; if the render mapping ever wrote back, every
   * uncoloured country would silently acquire a legend row.
   */
  it('reads the colour map and never writes it', (): void => {
    const scene = createTwoCountryScene();
    const colors: ColorMap = { FRA: customColor('#FFFFFF') };
    const [france] = scene.features;
    if (france === undefined) {
      throw new Error('The fixture scene lost a feature.');
    }

    expect(getEffectiveFeatureColor(france, colors, UNCOLORED_FILL)).toBe(
      UNCOLORED_FILL,
    );
    expect(
      colors['FRA'],
      'the stored value moved. #FFFFFF is the sentinel for "not coloured" and ' +
        'the render maps it; the map itself is read-only here.',
    ).toStrictEqual(customColor('#FFFFFF'));
  });

  /**
   * Legend exclusion is UNTOUCHED, and this is the gate that keeps it so.
   * `getEffectiveSceneColors` is `reconcileLegend`'s feed, and `reconcileLegend`
   * excludes exactly `#FFFFFF`. It must therefore keep reporting the sentinel,
   * not the grey a creator sees.
   */
  it('keeps the legend feed on the sentinel, so no grey row appears', (): void => {
    const scene = createTwoCountryScene();
    const colors: ColorMap = { FRA: customColor('#DC2626') };

    expect(getEffectiveSceneColors(scene, colors)).toEqual([
      '#DC2626',
      '#FFFFFF',
    ]);

    const legend = reconcileLegend(
      getEffectiveSceneColors(scene, colors),
      createDefaultLegendState(),
    );
    expect(legend.entries.map((entry): string => entry.color)).toEqual([
      '#DC2626',
    ]);
    expect(
      legend.entries.some((entry): boolean => entry.color === UNCOLORED_FILL),
      'an uncoloured country reached the legend. The render-time fill must not ' +
        'be visible to reconcileLegend.',
    ).toBe(false);
  });

  it('leaves a null-owner unit on the neutral fill, not the creator fill', (): void => {
    const scene = composeEffectiveScene({
      snapshotId: 'modern',
      modernFeatures: [
        createNeutralFeature('modern-ATA', 'neutral', 'modern'),
      ],
    });
    const [antarctica] = scene.features;
    if (antarctica === undefined) {
      throw new Error('The fixture scene lost a feature.');
    }

    expect(
      getEffectiveFeatureColor(antarctica, {}, CUSTOM_UNCOLORED_FILL),
      'a null-owner unit is not "uncoloured" - it is uncolourABLE, and D4-09 ' +
        'did not merge the two treatments.',
    ).toBe(NEUTRAL_UNIT_COLOR);
  });
});

describe('reconcileSelectionForScene', (): void => {
  it('retains only identities selectable in the incoming effective scene', (): void => {
    const incomingScene = composeHistoricalScene(
      '1700',
      [
        createSelectableFeature({
          sourceFeatureId: 'modern-DEU',
          entityId: 'DEU',
          name: 'Germany',
          boundaryMode: 'modern',
        }),
      ],
      [
        createSelectableFeature({
          sourceFeatureId: 'historical-hre-1700',
          entityId: 'HIST-HRE',
          name: 'Holy Roman Empire',
          boundaryMode: 'historical',
        }),
        createDependencyFeature('historical-colony-1700', 'HIST-COLONY', 'DEU', 'historical'),
      ],
      new Set(),
    );
    const previousSelection = new Set(['FRA', 'DEU', 'HIST-HRE', 'HIST-COLONY']);

    expect(reconcileSelectionForScene(previousSelection, incomingScene)).toEqual(
      new Set(['DEU', 'HIST-HRE']),
    );
    expect(previousSelection).toEqual(new Set(['FRA', 'DEU', 'HIST-HRE', 'HIST-COLONY']));
  });
});

/**
 * D4-10. These run against the committed world asset rather than synthetic
 * fixtures, because the claim under test is about the shipped scene: there is
 * no unit in the Modern scene a creator cannot colour.
 */
describe('the twelve self-colorable units (D4-10)', (): void => {
  /**
   * Written out, not counted. A list derived from the asset would agree with
   * the asset whatever the asset said, which is the shape of a gate that
   * cannot fail.
   */
  const SELF_COLORABLE_IDS: ReadonlyArray<CountryId> = [
    'ATA',
    'COK',
    'CYN',
    'FLK',
    'GIB',
    'IOT',
    'KAS',
    'KOS',
    'NIU',
    'SAH',
    'SOL',
    'TWN',
  ];
  /**
   * The literal the whole plan turns on. 195 core states plus twelve
   * self-colorable units. Never `cores.length + others.length` - that product
   * is satisfied by an empty scene.
   */
  const COLORABLE_UNIT_COUNT = 207;

  async function loadModernScene(): Promise<EffectiveScene> {
    const manifest: unknown = JSON.parse(manifestText);
    const world: unknown = JSON.parse(worldText);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL): Promise<Response> =>
          Promise.resolve(
            new Response(
              JSON.stringify(
                String(input) === WORLD_MANIFEST_URL ? manifest : world,
              ),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          ),
      ),
    );

    const result = await loadWorldGeoData(new AbortController().signal);
    if (result.status !== 'ready') {
      throw new Error(`world asset did not load: ${result.status}`);
    }

    return composeEffectiveScene({
      snapshotId: 'modern',
      modernFeatures: result.features,
    });
  }

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('puts all twelve in the selectable set and lands the count on 207', async (): Promise<void> => {
    const scene = await loadModernScene();
    const selectableEntityIds = getSelectableEntityIds(scene.features);

    // The count first, so a regression reports the number that moved rather
    // than the first id it happened to miss.
    expect(selectableEntityIds.size).toBe(COLORABLE_UNIT_COUNT);
    expect(scene.selectableEntityIds.size).toBe(COLORABLE_UNIT_COUNT);
    for (const id of SELF_COLORABLE_IDS) {
      expect(selectableEntityIds.has(id)).toBe(true);
      expect(scene.selectableEntityIds.has(id)).toBe(true);
    }
    // The rendered scene is unchanged at 248 units - nothing was added or
    // removed, only reclassified.
    expect(scene.features).toHaveLength(248);
  });

  it('resolves an applied colour for each of the twelve instead of the neutral fill', async (): Promise<void> => {
    const scene = await loadModernScene();
    const applied = '#DC2626';
    const colors: ColorMap = Object.fromEntries(
      SELF_COLORABLE_IDS.map((id) => [id, customColor(applied)]),
    );

    for (const id of SELF_COLORABLE_IDS) {
      const feature = scene.features.find(
        (candidate) => candidate.entityId === id,
      );
      expect(feature).toBeDefined();
      if (feature === undefined) {
        continue;
      }

      expect(feature.colorOwnerId).toBe(id);
      expect(feature.isSelectable).toBe(true);
      expect(feature.interactionMode).toBe('self-colorable');
      expect(getEffectiveFeatureColor(feature, colors)).toBe(applied);
      expect(getEffectiveFeatureColor(feature, {})).not.toBe(NEUTRAL_UNIT_COLOR);
    }

    // Every one of the twelve reaches the legend and export gate, which reads
    // only owned features. Before D4-10 none of them did.
    expect(getEffectiveSceneColors(scene, colors)).toHaveLength(248);
  });

  it('keeps a selection of the twelve through scene reconciliation', async (): Promise<void> => {
    const scene = await loadModernScene();

    expect(
      reconcileSelectionForScene(new Set(SELF_COLORABLE_IDS), scene),
    ).toEqual(new Set(SELF_COLORABLE_IDS));
  });
});

describe('the legend keeps receiving RESOLVED hexes (D4-02)', (): void => {
  it('resolves ramp assignments to hex before the legend ever sees them', (): void => {
    const scene = composeEffectiveScene({
      snapshotId: 'modern',
      modernFeatures: [
        createSelectableFeature({
          sourceFeatureId: 'modern-FRA',
          entityId: 'FRA',
          name: 'France',
          boundaryMode: 'modern',
        }),
        createSelectableFeature({
          sourceFeatureId: 'modern-DEU',
          entityId: 'DEU',
          name: 'Germany',
          boundaryMode: 'modern',
        }),
      ],
    });
    // Two DIFFERENT assignments that snap to the same step. The map keeps them
    // apart; the legend must not, because it dedupes by hex.
    const colors: ColorMap = {
      FRA: rampColor('blues', 0.5),
      DEU: rampColor('blues', 0.51),
    };
    const effectiveColors = getEffectiveSceneColors(scene, colors);

    expect(effectiveColors).toEqual(['#6BAED6', '#6BAED6']);
    for (const effectiveColor of effectiveColors) {
      expect(typeof effectiveColor).toBe('string');
      expect(effectiveColor).toMatch(/^#[0-9A-F]{6}$/);
    }

    const legend = reconcileLegend(effectiveColors, createDefaultLegendState());

    expect(legend.entries).toHaveLength(1);
    expect(legend.entries[0].color).toBe('#6BAED6');
  });
});
