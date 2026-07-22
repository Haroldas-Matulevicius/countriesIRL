import { describe, expect, it } from 'vitest';

import { normalizeGeoJson } from './geojson';

const polygonCoordinates = [
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ],
];

const multiPolygonCoordinates = [polygonCoordinates];

function createFeature(
  id: unknown,
  name: unknown,
  geometry: unknown = {
    type: 'Polygon',
    coordinates: polygonCoordinates,
  },
): unknown {
  return {
    type: 'Feature',
    id,
    properties: { name },
    geometry,
  };
}

function createCollection(features: ReadonlyArray<unknown>): unknown {
  return {
    type: 'FeatureCollection',
    features,
  };
}

describe('normalizeGeoJson', (): void => {
  it('rejects values that are not GeoJSON feature collections', (): void => {
    expect(normalizeGeoJson({ type: 'Feature', features: [] })).toEqual({
      ok: false,
      reason: 'invalid-collection',
      warnings: [],
    });
  });

  it('accepts Polygon and MultiPolygon features and trims IDs and names', (): void => {
    const input = createCollection([
      createFeature(' FRA ', ' France '),
      createFeature('DEU', 'Germany', {
        type: 'MultiPolygon',
        coordinates: multiPolygonCoordinates,
      }),
    ]);

    expect(normalizeGeoJson(input)).toEqual({
      ok: true,
      features: [
        {
          type: 'Feature',
          id: 'FRA',
          properties: { name: 'France' },
          geometry: {
            type: 'Polygon',
            coordinates: polygonCoordinates,
          },
        },
        {
          type: 'Feature',
          id: 'DEU',
          properties: { name: 'Germany' },
          geometry: {
            type: 'MultiPolygon',
            coordinates: multiPolygonCoordinates,
          },
        },
      ],
      warnings: [],
    });
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects reserved stable ID %s during normalization',
    (reservedId): void => {
      const result = normalizeGeoJson(
        createCollection([
          createFeature('ESP', 'Spain'),
          createFeature(reservedId, 'Reserved'),
        ]),
      );

      expect(result).toMatchObject({
        ok: true,
        features: [{ id: 'ESP' }],
        warnings: [{ featureIndex: 1, code: 'sentinel-id' }],
      });
    },
  );

  it.each([
    {
      label: 'non-feature values',
      feature: null,
      code: 'invalid-feature',
    },
    {
      label: 'missing IDs',
      feature: createFeature(undefined, 'France'),
      code: 'missing-id',
    },
    {
      label: 'non-string IDs',
      feature: createFeature(250, 'France'),
      code: 'missing-id',
    },
    {
      label: 'sentinel IDs',
      feature: createFeature('-99', 'France'),
      code: 'sentinel-id',
    },
    {
      label: 'blank names',
      feature: createFeature('FRA', '   '),
      code: 'missing-name',
    },
    {
      label: 'unsupported geometry',
      feature: createFeature('FRA', 'France', {
        type: 'Point',
        coordinates: [2, 48],
      }),
      code: 'unsupported-geometry',
    },
    {
      label: 'invalid Polygon coordinates',
      feature: createFeature('FRA', 'France', {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1]]],
      }),
      code: 'invalid-geometry',
    },
    {
      label: 'non-finite coordinates',
      feature: createFeature('FRA', 'France', {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [Number.NaN, 1], [0, 0]]],
      }),
      code: 'invalid-geometry',
    },
  ])('omits $label with a warning', ({ feature, code }): void => {
    const result = normalizeGeoJson(
      createCollection([createFeature('ESP', 'Spain'), feature]),
    );

    expect(result).toMatchObject({
      ok: true,
      features: [{ id: 'ESP' }],
      warnings: [{ featureIndex: 1, code }],
    });
  });

  it.each([
    ['north pole', 0, 90],
    ['south pole', 0, -90],
    ['longitude above range', 181, 0],
    ['longitude below range', -181, 0],
    ['latitude above range', 0, 91],
    ['latitude below range', 0, -91],
  ] as const)(
    'rejects %s coordinates as invalid geometry',
    (_label, longitude, latitude): void => {
      const coordinates = [
        [
          [longitude, latitude],
          [1, 0],
          [1, 1],
          [longitude, latitude],
        ],
      ];
      const result = normalizeGeoJson(
        createCollection([
          createFeature('ESP', 'Spain'),
          createFeature('BAD', 'Malformed', {
            type: 'Polygon',
            coordinates,
          }),
        ]),
      );

      expect(result).toMatchObject({
        ok: true,
        features: [{ id: 'ESP' }],
        warnings: [{ featureIndex: 1, code: 'invalid-geometry' }],
      });
    },
  );

  it('keeps the first feature and warns when a normalized ID is duplicated', (): void => {
    const result = normalizeGeoJson(
      createCollection([
        createFeature('FRA', 'France'),
        createFeature(' FRA ', 'Duplicate France'),
      ]),
    );

    expect(result).toMatchObject({
      ok: true,
      features: [{ id: 'FRA', properties: { name: 'France' } }],
      warnings: [{ featureIndex: 1, code: 'duplicate-id' }],
    });
  });

  it('returns usable features with warnings for a partially valid collection', (): void => {
    const result = normalizeGeoJson(
      createCollection([
        createFeature('PRT', 'Portugal'),
        createFeature('', 'Missing identifier'),
        createFeature('ESP', undefined),
      ]),
    );

    expect(result).toEqual({
      ok: true,
      features: [
        {
          type: 'Feature',
          id: 'PRT',
          properties: { name: 'Portugal' },
          geometry: {
            type: 'Polygon',
            coordinates: polygonCoordinates,
          },
        },
      ],
      warnings: [
        { featureIndex: 1, code: 'missing-id' },
        { featureIndex: 2, code: 'missing-name' },
      ],
    });
  });

  it('fails explicitly when no valid features remain', (): void => {
    expect(
      normalizeGeoJson(
        createCollection([
          createFeature('-99', 'Sentinel'),
          createFeature('FRA', '', null),
        ]),
      ),
    ).toEqual({
      ok: false,
      reason: 'no-valid-features',
      warnings: [
        { featureIndex: 0, code: 'sentinel-id' },
        { featureIndex: 1, code: 'missing-name' },
      ],
    });
  });

  it('builds a lookup with exactly one entry per accepted feature ID', (): void => {
    const result = normalizeGeoJson(
      createCollection([
        createFeature('FRA', 'France'),
        createFeature('DEU', 'Germany'),
        createFeature('FRA', 'Duplicate France'),
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const lookup = new Map(result.features.map((feature) => [feature.id, feature]));
    expect(lookup.size).toBe(result.features.length);
    expect([...lookup.keys()]).toEqual(['FRA', 'DEU']);
  });
});
