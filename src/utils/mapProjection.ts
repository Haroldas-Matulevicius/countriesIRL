import { geoMercator, geoPath } from 'd3';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

import { MAP_EXTENT, MAP_VIEWBOX_SIZE } from '../constants/config';
import type { GeoFeature } from '../types/map';

type ProjectedBounds = [[number, number], [number, number]];

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

function createFeatureCollection(
  features: ReadonlyArray<GeoFeature>,
): FeatureCollection<GeoFeature['geometry'], GeoFeature['properties']> {
  return {
    type: 'FeatureCollection',
    features: [...features],
  };
}

export function hasFiniteProjectedBounds(bounds: ProjectedBounds): boolean {
  return bounds.every((point) => point.every(Number.isFinite));
}

export function createSafeMapPath(
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

export function createFixedEuropeProjection(
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
      (feature): boolean => createSafeMapPath(pathGenerator, feature).length > 0,
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
