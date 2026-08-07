import { geoMercator, geoPath } from 'd3';
import type { GeometryCollection } from 'geojson';

import { WORLD_SIZE } from '../constants/camera';
import type { GeoFeature } from '../types/map';

type ProjectedBounds = [[number, number], [number, number]];

const INVALID_PATH_DATA_PATTERN = /(?:NaN|Infinity)/u;
const WORLD_PROJECTION_SCALE = WORLD_SIZE / (2 * Math.PI);
const WORLD_CENTER = WORLD_SIZE / 2;

export function hasFiniteProjectedBounds(bounds: ProjectedBounds): boolean {
  return bounds.every((point) => point.every(Number.isFinite));
}

/**
 * `GeometryCollection` joined the signature for `04-09`'s interior-border mesh,
 * whose root is a collection rather than a feature. The NaN/Infinity screen and
 * the try/catch are the reason it is widened here instead of a second helper
 * being written beside it: two copies is how one of them stops screening.
 */
export function createSafeMapPath(
  pathGenerator: ReturnType<typeof geoPath>,
  feature: GeoFeature | GeometryCollection,
): string {
  try {
    const pathData = pathGenerator(feature);

    if (pathData === null || INVALID_PATH_DATA_PATTERN.test(pathData)) {
      return '';
    }

    return pathData;
  } catch {
    return '';
  }
}

export function createWorldProjection(): ReturnType<typeof geoMercator> {
  return geoMercator()
    .scale(WORLD_PROJECTION_SCALE)
    .translate([WORLD_CENTER, WORLD_CENTER])
    .center([0, 0])
    .rotate([0, 0])
    .clipExtent([
      [0, 0],
      [WORLD_SIZE, WORLD_SIZE],
    ]);
}
