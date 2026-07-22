import { geoMercator, geoPath } from 'd3';
import type { Feature, Polygon } from 'geojson';

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

export function hasFiniteProjectedBounds(bounds: ProjectedBounds): boolean {
  return bounds.every((point) => point.every(Number.isFinite));
}

function aggregateFiniteProjectedBounds(
  pathGenerator: ReturnType<typeof geoPath>,
  features: ReadonlyArray<GeoFeature>,
): ProjectedBounds | null {
  let aggregateBounds: ProjectedBounds | null = null;

  features.forEach((feature): void => {
    try {
      const featureBounds = pathGenerator.bounds(feature);

      if (!hasFiniteProjectedBounds(featureBounds)) {
        return;
      }

      if (aggregateBounds === null) {
        aggregateBounds = [
          [featureBounds[0][0], featureBounds[0][1]],
          [featureBounds[1][0], featureBounds[1][1]],
        ];
        return;
      }

      aggregateBounds[0][0] = Math.min(
        aggregateBounds[0][0],
        featureBounds[0][0],
      );
      aggregateBounds[0][1] = Math.min(
        aggregateBounds[0][1],
        featureBounds[0][1],
      );
      aggregateBounds[1][0] = Math.max(
        aggregateBounds[1][0],
        featureBounds[1][0],
      );
      aggregateBounds[1][1] = Math.max(
        aggregateBounds[1][1],
        featureBounds[1][1],
      );
    } catch {
      return;
    }
  });

  return aggregateBounds;
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
    const projectedBounds = aggregateFiniteProjectedBounds(
      geoPath(projection),
      features,
    );

    if (projectedBounds !== null) {
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

  return projection.clipExtent([
    [0, 0],
    [MAP_VIEWBOX_SIZE, MAP_VIEWBOX_SIZE],
  ]);
}
