import { geoMercator, geoPath } from 'd3';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { describe, expect, it, vi } from 'vitest';

import europeGeoJson from '../../public/data/europe-modern.geojson?raw';
import {
  EXPORT_FRAME_SIZE,
  MAP_EXTENT,
  MAP_VIEWBOX_SIZE,
} from '../constants/config';
import type { GeoFeature } from '../types/map';
import { normalizeGeoJson } from './geojson';
import {
  createFixedEuropeProjection,
  createSafeMapPath,
  hasFiniteProjectedBounds,
} from './mapProjection';

const EXPECTED_COUNTRY_COUNT = 57;
const EXPECTED_DATASET_TRANSLATION = [540, 653.9967569717239] as const;
const MINIMUM_FRAME_MARGIN = 32;
const MAXIMUM_FRAME_MARGIN = 128;
const CENTER_TOLERANCE = 0.01;
const MARGIN_BALANCE_TOLERANCE = 1;
const COORDINATES_PER_TRAVERSAL = 8;
const INVALID_PATH_DATA_PATTERN = /(?:NaN|Infinity)/u;

const FIXED_EUROPE_VIEW_OBJECT: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-25, 34],
        [45, 34],
        [45, 72],
        [-25, 72],
        [-25, 34],
      ],
    ],
  },
};

interface TrackedFeature {
  feature: GeoFeature;
  getCoordinateReadCount: () => number;
}

function loadEuropeFeatures(): ReadonlyArray<GeoFeature> {
  const input: unknown = JSON.parse(europeGeoJson);
  const result = normalizeGeoJson(input);

  if (!result.ok) {
    throw new Error(`Expected valid Europe GeoJSON, received ${result.reason}.`);
  }

  return result.features;
}

function createFeatureCollection(
  features: ReadonlyArray<GeoFeature>,
): FeatureCollection<GeoFeature['geometry'], GeoFeature['properties']> {
  return {
    type: 'FeatureCollection',
    features: [...features],
  };
}

function createTrackedFeature(id: string, longitudeOffset: number): TrackedFeature {
  let coordinateReadCount = 0;
  const sourceRing: ReadonlyArray<readonly [number, number]> = [
    [-10 + longitudeOffset, 45],
    [-8 + longitudeOffset, 45],
    [-8 + longitudeOffset, 47],
    [-10 + longitudeOffset, 47],
    [-10 + longitudeOffset, 45],
  ];
  const trackedRing = sourceRing.map((sourcePoint): [number, number] => {
    const trackedPoint: number[] = [];

    Object.defineProperties(trackedPoint, {
      0: {
        configurable: true,
        enumerable: true,
        get: (): number => {
          coordinateReadCount += 1;
          return sourcePoint[0];
        },
      },
      1: {
        configurable: true,
        enumerable: true,
        get: (): number => {
          coordinateReadCount += 1;
          return sourcePoint[1];
        },
      },
    });

    return trackedPoint as [number, number];
  });

  return {
    feature: {
      type: 'Feature',
      id,
      properties: { name: id },
      geometry: {
        type: 'Polygon',
        coordinates: [trackedRing],
      },
    },
    getCoordinateReadCount: (): number => coordinateReadCount,
  };
}

function createMalformedFeature(
  source: GeoFeature,
  id: string,
  invalidCoordinate: number,
): GeoFeature {
  return {
    ...source,
    id,
    properties: { name: id },
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [invalidCoordinate, 1], [0, 0]]],
    },
  };
}

function createThrowingFeature(source: GeoFeature): GeoFeature {
  const feature = {
    ...source,
    id: 'THROWING',
    properties: { name: 'Throwing' },
  };

  Object.defineProperty(feature, 'geometry', {
    configurable: true,
    enumerable: true,
    get: (): never => {
      throw new Error('Malformed geometry');
    },
  });

  return feature;
}

function legacySafeMapPath(
  pathGenerator: ReturnType<typeof geoPath>,
  feature: GeoFeature,
): string {
  try {
    const bounds = pathGenerator.bounds(feature);
    const pathData = pathGenerator(feature);

    if (
      !hasFiniteProjectedBounds(bounds) ||
      pathData === null ||
      INVALID_PATH_DATA_PATTERN.test(pathData)
    ) {
      return '';
    }

    return pathData;
  } catch {
    return '';
  }
}

function createLegacyFixedEuropeProjection(
  features: ReadonlyArray<GeoFeature>,
): ReturnType<typeof geoMercator> {
  const projection = geoMercator().fitExtent(
    [
      [MAP_EXTENT[0][0], MAP_EXTENT[0][1]],
      [MAP_EXTENT[1][0], MAP_EXTENT[1][1]],
    ],
    FIXED_EUROPE_VIEW_OBJECT,
  );

  if (features.length > 0) {
    const pathGenerator = geoPath(projection);
    const projectableFeatures = features.filter(
      (feature): boolean => legacySafeMapPath(pathGenerator, feature).length > 0,
    );

    if (projectableFeatures.length > 0) {
      const projectedBounds = pathGenerator.bounds(
        createFeatureCollection(projectableFeatures),
      );

      if (hasFiniteProjectedBounds(projectedBounds)) {
        const projectedCenter = [
          (projectedBounds[0][0] + projectedBounds[1][0]) / 2,
          (projectedBounds[0][1] + projectedBounds[1][1]) / 2,
        ] as const;
        const extentCenter = [
          (MAP_EXTENT[0][0] + MAP_EXTENT[1][0]) / 2,
          (MAP_EXTENT[0][1] + MAP_EXTENT[1][1]) / 2,
        ] as const;
        const translation = projection.translate();
        const centeredTranslation = [
          translation[0] + extentCenter[0] - projectedCenter[0],
          translation[1] + extentCenter[1] - projectedCenter[1],
        ] as const;

        if (centeredTranslation.every(Number.isFinite)) {
          projection.translate([...centeredTranslation]);
        }
      }
    }
  }

  return projection.clipExtent([
    [0, 0],
    [MAP_VIEWBOX_SIZE, MAP_VIEWBOX_SIZE],
  ]);
}

describe('createSafeMapPath', (): void => {
  it.each([
    { label: 'valid path data', result: 'M0,0L1,1Z', expected: 'M0,0L1,1Z' },
    { label: 'null path data', result: null, expected: '' },
    { label: 'NaN path data', result: 'MNaN,0Z', expected: '' },
    { label: 'Infinity path data', result: 'MInfinity,0Z', expected: '' },
  ])('calls the generator once for $label without a bounds pass', ({ result, expected }): void => {
    const pathCall = vi.fn((_feature: GeoFeature): string | null => result);
    const boundsCall = vi.fn((): [[number, number], [number, number]] => [
      [0, 0],
      [1, 1],
    ]);
    const pathGenerator = Object.assign(pathCall, {
      bounds: boundsCall,
    }) as unknown as ReturnType<typeof geoPath>;
    const feature = loadEuropeFeatures()[0];

    if (feature === undefined) {
      throw new Error('Expected at least one Europe feature.');
    }

    expect(createSafeMapPath(pathGenerator, feature)).toBe(expected);
    expect(pathCall).toHaveBeenCalledTimes(1);
    expect(boundsCall).not.toHaveBeenCalled();
  });

  it('contains a thrown generator call without attempting bounds', (): void => {
    const pathCall = vi.fn((_feature: GeoFeature): string | null => {
      throw new Error('Malformed geometry');
    });
    const boundsCall = vi.fn((): [[number, number], [number, number]] => [
      [0, 0],
      [1, 1],
    ]);
    const pathGenerator = Object.assign(pathCall, {
      bounds: boundsCall,
    }) as unknown as ReturnType<typeof geoPath>;
    const feature = loadEuropeFeatures()[0];

    if (feature === undefined) {
      throw new Error('Expected at least one Europe feature.');
    }

    expect(createSafeMapPath(pathGenerator, feature)).toBe('');
    expect(pathCall).toHaveBeenCalledTimes(1);
    expect(boundsCall).not.toHaveBeenCalled();
  });
});

describe('createFixedEuropeProjection', (): void => {
  it('traverses each feature exactly once while aggregating projected bounds', (): void => {
    const western = createTrackedFeature('WESTERN', 0);
    const eastern = createTrackedFeature('EASTERN', 20);

    createFixedEuropeProjection([western.feature, eastern.feature]);

    expect(western.getCoordinateReadCount()).toBe(COORDINATES_PER_TRAVERSAL);
    expect(eastern.getCoordinateReadCount()).toBe(COORDINATES_PER_TRAVERSAL);
  });

  it('uses one final path traversal and performs no final bounds traversal', (): void => {
    const tracked = createTrackedFeature('TRACKED', 0);
    const projection = createFixedEuropeProjection([tracked.feature]);
    const readsAfterCentering = tracked.getCoordinateReadCount();
    const pathGenerator = geoPath(projection);

    expect(createSafeMapPath(pathGenerator, tracked.feature)).not.toBe('');
    expect(tracked.getCoordinateReadCount() - readsAfterCentering).toBe(
      COORDINATES_PER_TRAVERSAL,
    );
  });

  it('preserves the legacy translation and ordered path bytes for all 57 countries', (): void => {
    const features = loadEuropeFeatures();
    const legacyProjection = createLegacyFixedEuropeProjection(features);
    const optimizedProjection = createFixedEuropeProjection(features);
    const legacyPathGenerator = geoPath(legacyProjection);
    const optimizedPathGenerator = geoPath(optimizedProjection);
    const legacyPaths = features.map(
      (feature): string => legacySafeMapPath(legacyPathGenerator, feature),
    );
    const optimizedPaths = features.map(
      (feature): string => createSafeMapPath(optimizedPathGenerator, feature),
    );

    expect(features).toHaveLength(EXPECTED_COUNTRY_COUNT);
    expect(optimizedProjection.translate()).toEqual(legacyProjection.translate());
    expect(optimizedProjection.translate()).toEqual(EXPECTED_DATASET_TRANSLATION);
    expect(optimizedPaths).toEqual(legacyPaths);
    expect(optimizedPaths.filter((path): boolean => path.length > 0)).toHaveLength(
      EXPECTED_COUNTRY_COUNT,
    );
  });

  it('skips thrown and non-finite bounds without changing valid geometry', (): void => {
    const features = loadEuropeFeatures();
    const firstFeature = features[0];

    if (firstFeature === undefined) {
      throw new Error('Expected at least one Europe feature.');
    }

    const malformedFeatures = [
      createMalformedFeature(firstFeature, 'NAN', Number.NaN),
      createMalformedFeature(firstFeature, 'INFINITY', Number.POSITIVE_INFINITY),
      createThrowingFeature(firstFeature),
      {
        ...firstFeature,
        id: 'NULL',
        properties: { name: 'Null' },
        geometry: null,
      } as unknown as GeoFeature,
    ];
    const validProjection = createFixedEuropeProjection(features);
    const mixedProjection = createFixedEuropeProjection([
      ...features,
      ...malformedFeatures,
    ]);
    const validPathGenerator = geoPath(validProjection);
    const mixedPathGenerator = geoPath(mixedProjection);
    const validPaths = features.map(
      (feature): string => createSafeMapPath(validPathGenerator, feature),
    );
    const mixedValidPaths = features.map(
      (feature): string => createSafeMapPath(mixedPathGenerator, feature),
    );

    expect(hasFiniteProjectedBounds([[Number.NaN, 0], [1, 1]])).toBe(false);
    expect(hasFiniteProjectedBounds([[0, 0], [Number.POSITIVE_INFINITY, 1]])).toBe(
      false,
    );
    expect(mixedProjection.translate()).toEqual(validProjection.translate());
    expect(mixedValidPaths).toEqual(validPaths);
    expect(validPaths.filter((path): boolean => path.length > 0)).toHaveLength(
      EXPECTED_COUNTRY_COUNT,
    );
    malformedFeatures.forEach((feature): void => {
      expect(createSafeMapPath(mixedPathGenerator, feature)).toBe('');
    });
  });

  it('leaves the fixed projection unchanged when every candidate is invalid', (): void => {
    const firstFeature = loadEuropeFeatures()[0];

    if (firstFeature === undefined) {
      throw new Error('Expected at least one Europe feature.');
    }

    const fixedProjection = createLegacyFixedEuropeProjection([]);
    const invalidProjection = createFixedEuropeProjection([
      createMalformedFeature(firstFeature, 'NAN', Number.NaN),
      createThrowingFeature(firstFeature),
    ]);

    expect(invalidProjection.translate()).toEqual(fixedProjection.translate());
  });

  it('centers all 57 non-empty paths in the shared 540px preview/export frame', (): void => {
    const features = loadEuropeFeatures();
    const projection = createFixedEuropeProjection(features);
    const pathGenerator = geoPath(projection);
    const pathData = features.map(
      (feature): string => createSafeMapPath(pathGenerator, feature),
    );
    const bounds = pathGenerator.bounds(createFeatureCollection(features));
    const frameScale = EXPORT_FRAME_SIZE / MAP_VIEWBOX_SIZE;
    const left = bounds[0][0] * frameScale;
    const top = bounds[0][1] * frameScale;
    const right = EXPORT_FRAME_SIZE - bounds[1][0] * frameScale;
    const bottom = EXPORT_FRAME_SIZE - bounds[1][1] * frameScale;
    const centerX = ((bounds[0][0] + bounds[1][0]) * frameScale) / 2;
    const centerY = ((bounds[0][1] + bounds[1][1]) * frameScale) / 2;

    expect(features).toHaveLength(EXPECTED_COUNTRY_COUNT);
    expect(pathData.filter((path): boolean => path.length > 0)).toHaveLength(
      EXPECTED_COUNTRY_COUNT,
    );
    expect(centerX).toBeCloseTo(EXPORT_FRAME_SIZE / 2, 6);
    expect(centerY).toBeCloseTo(EXPORT_FRAME_SIZE / 2, 6);
    expect(Math.abs(centerX - EXPORT_FRAME_SIZE / 2)).toBeLessThanOrEqual(
      CENTER_TOLERANCE,
    );
    expect(Math.abs(centerY - EXPORT_FRAME_SIZE / 2)).toBeLessThanOrEqual(
      CENTER_TOLERANCE,
    );

    [left, top, right, bottom].forEach((margin): void => {
      expect(margin).toBeGreaterThanOrEqual(MINIMUM_FRAME_MARGIN);
      expect(margin).toBeLessThanOrEqual(MAXIMUM_FRAME_MARGIN);
    });
    expect(Math.abs(left - right)).toBeLessThanOrEqual(
      MARGIN_BALANCE_TOLERANCE,
    );
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(
      MARGIN_BALANCE_TOLERANCE,
    );
  });
});
