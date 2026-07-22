import { geoMercator, geoPath } from 'd3';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

import { MAP_EXTENT, MAP_VIEWBOX_SIZE } from '../constants/config';
import type { GeoFeature } from '../types/map';

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
    const projectedBounds = geoPath(projection).bounds(
      createFeatureCollection(features),
    );
    const projectedCenter = [
      (projectedBounds[0][0] + projectedBounds[1][0]) / 2,
      (projectedBounds[0][1] + projectedBounds[1][1]) / 2,
    ] as const;
    const extentCenter = [
      (MAP_EXTENT[0][0] + MAP_EXTENT[1][0]) / 2,
      (MAP_EXTENT[0][1] + MAP_EXTENT[1][1]) / 2,
    ] as const;
    const translation = projection.translate();

    projection.translate([
      translation[0] + extentCenter[0] - projectedCenter[0],
      translation[1] + extentCenter[1] - projectedCenter[1],
    ]);
  }

  return projection.clipExtent([
    [0, 0],
    [MAP_VIEWBOX_SIZE, MAP_VIEWBOX_SIZE],
  ]);
}
