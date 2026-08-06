import { geoMercator, geoPath } from 'd3';

import { WORLD_SIZE } from '../constants/camera';
import type { GeoFeature } from '../types/map';

type ProjectedBounds = [[number, number], [number, number]];

const INVALID_PATH_DATA_PATTERN = /(?:NaN|Infinity)/u;
const WORLD_PROJECTION_SCALE = WORLD_SIZE / (2 * Math.PI);
const WORLD_CENTER = WORLD_SIZE / 2;

export function hasFiniteProjectedBounds(bounds: ProjectedBounds): boolean {
  return bounds.every((point) => point.every(Number.isFinite));
}

export function createSafeMapPath(
  pathGenerator: ReturnType<typeof geoPath>,
  feature: GeoFeature,
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
