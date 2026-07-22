import { geoPath } from 'd3';
import type { FeatureCollection } from 'geojson';
import { describe, expect, it } from 'vitest';

import europeGeoJson from '../../public/data/europe-modern.geojson?raw';
import { EXPORT_FRAME_SIZE, MAP_VIEWBOX_SIZE } from '../constants/config';
import type { GeoFeature } from '../types/map';
import { normalizeGeoJson } from './geojson';
import { createFixedEuropeProjection } from './mapProjection';

const EXPECTED_COUNTRY_COUNT = 57;
const MINIMUM_FRAME_MARGIN = 32;
const MAXIMUM_FRAME_MARGIN = 128;
const CENTER_TOLERANCE = 0.01;
const MARGIN_BALANCE_TOLERANCE = 1;

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

describe('createFixedEuropeProjection', (): void => {
  it('centers all 57 non-empty paths in the shared 540px preview/export frame', (): void => {
    const features = loadEuropeFeatures();
    const projection = createFixedEuropeProjection(features);
    const pathGenerator = geoPath(projection);
    const pathData = features.map((feature): string => pathGenerator(feature) ?? '');
    const bounds = pathGenerator.bounds(createFeatureCollection(features));
    const frameScale = EXPORT_FRAME_SIZE / MAP_VIEWBOX_SIZE;
    const left = bounds[0][0] * frameScale;
    const top = bounds[0][1] * frameScale;
    const right = EXPORT_FRAME_SIZE - bounds[1][0] * frameScale;
    const bottom = EXPORT_FRAME_SIZE - bounds[1][1] * frameScale;
    const centerX = (bounds[0][0] + bounds[1][0]) * frameScale / 2;
    const centerY = (bounds[0][1] + bounds[1][1]) * frameScale / 2;

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
