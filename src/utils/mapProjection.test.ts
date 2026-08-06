import { geoPath } from 'd3';
import type { FeatureCollection } from 'geojson';
import { describe, expect, it, vi } from 'vitest';

import europeGeoJson from '../../public/data/europe-modern.geojson?raw';
import { WORLD_SIZE } from '../constants/camera';
import type { GeoFeature } from '../types/map';
import { normalizeGeoJson } from './geojson';
import {
  createSafeMapPath,
  createWorldProjection,
  hasFiniteProjectedBounds,
} from './mapProjection';

const EXPECTED_COUNTRY_COUNT = 57;
const INVALID_PATH_DATA_PATTERN = /(?:NaN|Infinity)/u;
const NUMBER_TOLERANCE = 7;

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

describe('createSafeMapPath', (): void => {
  it.each([
    { label: 'valid path data', result: 'M0,0L1,1Z', expected: 'M0,0L1,1Z' },
    { label: 'null path data', result: null, expected: '' },
    { label: 'NaN path data', result: 'MNaN,0Z', expected: '' },
    { label: 'Infinity path data', result: 'MInfinity,0Z', expected: '' },
  ])(
    'calls the generator once for $label without a bounds pass',
    ({ result, expected }): void => {
      const pathCall = vi.fn((): string | null => result);
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
    },
  );

  it('contains a thrown generator call without attempting bounds', (): void => {
    const pathCall = vi.fn((): string | null => {
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

describe('createWorldProjection', (): void => {
  it('creates one fixed square Mercator world in canonical coordinates', (): void => {
    const projection = createWorldProjection();
    const center = projection([0, 0]);
    const northWest = projection([-180, 85.05112878]);
    const southEast = projection([180, -85.05112878]);

    expect(projection.scale()).toBeCloseTo(
      WORLD_SIZE / (2 * Math.PI),
      NUMBER_TOLERANCE,
    );
    expect(projection.translate()).toEqual([WORLD_SIZE / 2, WORLD_SIZE / 2]);
    expect(projection.center()).toEqual([0, 0]);
    expect(projection.rotate()).toEqual([0, 0, 0]);
    expect(projection.clipExtent()).toEqual([
      [0, 0],
      [WORLD_SIZE, WORLD_SIZE],
    ]);
    expect(center?.[0]).toBeCloseTo(WORLD_SIZE / 2, NUMBER_TOLERANCE);
    expect(center?.[1]).toBeCloseTo(WORLD_SIZE / 2, NUMBER_TOLERANCE);
    expect(northWest?.[0]).toBeCloseTo(0, NUMBER_TOLERANCE);
    expect(northWest?.[1]).toBeCloseTo(0, NUMBER_TOLERANCE);
    expect(southEast?.[0]).toBeCloseTo(WORLD_SIZE, NUMBER_TOLERANCE);
    expect(southEast?.[1]).toBeCloseTo(WORLD_SIZE, NUMBER_TOLERANCE);
  });

  it('renders every accepted feature with finite path data in the fixed projection', (): void => {
    const features = loadEuropeFeatures();
    const projection = createWorldProjection();
    const pathGenerator = geoPath(projection);
    const paths = features.map(
      (feature): string => createSafeMapPath(pathGenerator, feature),
    );
    const bounds = pathGenerator.bounds(createFeatureCollection(features));

    expect(features).toHaveLength(EXPECTED_COUNTRY_COUNT);
    expect(paths.filter((path): boolean => path.length > 0)).toHaveLength(
      EXPECTED_COUNTRY_COUNT,
    );
    paths.forEach((path): void => {
      expect(path).not.toMatch(INVALID_PATH_DATA_PATTERN);
    });
    expect(hasFiniteProjectedBounds(bounds)).toBe(true);
    expect(bounds[0][0]).toBeGreaterThanOrEqual(0);
    expect(bounds[0][1]).toBeGreaterThanOrEqual(0);
    expect(bounds[1][0]).toBeLessThanOrEqual(WORLD_SIZE);
    expect(bounds[1][1]).toBeLessThanOrEqual(WORLD_SIZE);
  });

  it('contains date-line geometry without non-finite path output', (): void => {
    const feature: GeoFeature = {
      type: 'Feature',
      id: 'DATE_LINE',
      properties: { name: 'Date line' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [170, -10],
            [170, 10],
            [-170, 10],
            [-170, -10],
            [170, -10],
          ],
        ],
      },
    };
    const projection = createWorldProjection();
    const pathGenerator = geoPath(projection);
    const path = createSafeMapPath(pathGenerator, feature);
    const bounds = pathGenerator.bounds(feature);

    expect(path).not.toBe('');
    expect(path).not.toMatch(INVALID_PATH_DATA_PATTERN);
    expect(hasFiniteProjectedBounds(bounds)).toBe(true);
  });

  it('rejects non-finite projected bounds', (): void => {
    expect(hasFiniteProjectedBounds([[Number.NaN, 0], [1, 1]])).toBe(false);
    expect(
      hasFiniteProjectedBounds([[0, 0], [Number.POSITIVE_INFINITY, 1]]),
    ).toBe(false);
  });
});
