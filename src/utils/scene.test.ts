import { describe, expect, it } from 'vitest';

import type { EffectiveScene, SnapshotId } from '../types/composition';
import type { ColorMap, CountryId, SceneFeature } from '../types/map';
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
      FRA: '#dc2626',
      GLP: '#2563EB',
      ESH: '#16A34A',
    };

    expect([...scene.selectableEntityIds]).toEqual(['FRA']);
    expect(getSelectableEntityIds(scene.features)).toEqual(new Set(['FRA']));
    expect(scene.features.map((feature) => getEffectiveFeatureColor(feature, colors))).toEqual([
      '#DC2626',
      '#DC2626',
      '#FFFFFF',
    ]);
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
      FRA: '#DC2626',
      'historical-hre-1700': '#16A34A',
      'Holy Roman Empire': '#2563EB',
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
    const colors = JSON.parse('{"__proto__":"#DC2626"}') as ColorMap;

    expect(scene.features).toHaveLength(1);
    expect(scene.selectableEntityIds.size).toBe(0);
    expect(getEffectiveFeatureColor(scene.features[0], colors)).toBe('#FFFFFF');
    expect(getEffectiveSceneColors(scene, colors)).toEqual(['#FFFFFF']);
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
