import { describe, expect, it } from 'vitest';

import {
  normalizeBorderMesh,
  normalizeGeoJson,
  normalizeSceneGeoJson,
} from './geojson';

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

interface SceneFeatureInput {
  readonly id: unknown;
  readonly name?: unknown;
  readonly sourceFeatureId?: unknown;
  readonly entityId?: unknown;
  readonly colorOwnerId?: unknown;
  readonly isSelectable?: unknown;
  readonly interactionMode?: unknown;
  readonly boundaryMode?: unknown;
  readonly provenanceId?: unknown;
  readonly geometry?: unknown;
}

function createSceneFeature({
  id,
  name = 'France',
  sourceFeatureId = 'FRA',
  entityId = 'FRA',
  colorOwnerId = entityId,
  isSelectable = true,
  interactionMode = 'modern-core',
  boundaryMode = 'modern',
  provenanceId = 'natural-earth-admin-0-50m',
  geometry = {
    type: 'Polygon',
    coordinates: polygonCoordinates,
  },
}: SceneFeatureInput): unknown {
  return {
    type: 'Feature',
    id,
    sourceFeatureId,
    entityId,
    colorOwnerId,
    isSelectable,
    interactionMode,
    boundaryMode,
    provenanceId,
    properties: {
      name,
      ignored: '<script>not trusted</script>',
    },
    geometry,
    ignored: { constructor: 'not trusted' },
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
  ] as const)(
    'accepts %s coordinates',
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
          createFeature('POLAR', 'Polar boundary', {
            type: 'Polygon',
            coordinates,
          }),
        ]),
      );

      expect(result).toMatchObject({
        ok: true,
        features: [{ id: 'POLAR' }],
        warnings: [],
      });
    },
  );

  it.each([
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

describe('normalizeSceneGeoJson', (): void => {
  it('rebuilds trusted scene metadata without retaining unknown properties', (): void => {
    const result = normalizeSceneGeoJson(
      createCollection([createSceneFeature({ id: 'modern-FRA' })]),
    );

    expect(result).toEqual({
      ok: true,
      features: [
        {
          type: 'Feature',
          id: 'modern-FRA',
          sourceFeatureId: 'FRA',
          entityId: 'FRA',
          colorOwnerId: 'FRA',
          isSelectable: true,
          interactionMode: 'modern-core',
          boundaryMode: 'modern',
          provenanceId: 'natural-earth-admin-0-50m',
          properties: { name: 'France' },
          geometry: {
            type: 'Polygon',
            coordinates: polygonCoordinates,
          },
        },
      ],
      warnings: [],
    });
  });

  it.each([
    {
      label: 'selectable core with a different color owner',
      feature: createSceneFeature({ id: 'modern-FRA', colorOwnerId: 'DEU' }),
    },
    {
      label: 'selectable inherited dependency',
      feature: createSceneFeature({
        id: 'modern-ABW',
        entityId: 'ABW',
        colorOwnerId: 'NLD',
        interactionMode: 'inherited-dependency',
      }),
    },
    {
      label: 'neutral feature with a color owner',
      feature: createSceneFeature({
        id: 'modern-ATA',
        entityId: 'ATA',
        colorOwnerId: 'AUS',
        isSelectable: false,
        interactionMode: 'neutral',
      }),
    },
    {
      label: 'reserved scene ID',
      feature: createSceneFeature({ id: '__proto__' }),
    },
    {
      label: 'reserved entity ID',
      feature: createSceneFeature({ id: 'bad-entity', entityId: 'constructor' }),
    },
    {
      label: 'reserved color-owner ID',
      feature: createSceneFeature({
        id: 'bad-owner',
        colorOwnerId: 'prototype',
      }),
    },
    {
      label: 'unsupported boundary mode',
      feature: createSceneFeature({ id: 'bad-boundary', boundaryMode: 'future' }),
    },
    {
      label: 'blank provenance',
      feature: createSceneFeature({ id: 'bad-provenance', provenanceId: ' ' }),
    },
  ])('skips $label while preserving a valid neighbor', ({ feature }): void => {
    const result = normalizeSceneGeoJson(
      createCollection([createSceneFeature({ id: 'modern-ESP', entityId: 'ESP' }), feature]),
    );

    expect(result).toMatchObject({
      ok: true,
      features: [{ id: 'modern-ESP', entityId: 'ESP' }],
      warnings: [{ featureIndex: 1 }],
    });
  });

  it('accepts inherited, neutral, disputed, and historical scene policies', (): void => {
    const result = normalizeSceneGeoJson(
      createCollection([
        createSceneFeature({
          id: 'modern-ABW',
          name: 'Aruba',
          sourceFeatureId: 'ABW',
          entityId: 'ABW',
          colorOwnerId: 'NLD',
          isSelectable: false,
          interactionMode: 'inherited-dependency',
        }),
        createSceneFeature({
          id: 'modern-ATA',
          name: 'Antarctica',
          sourceFeatureId: 'ATA',
          entityId: 'ATA',
          colorOwnerId: null,
          isSelectable: false,
          interactionMode: 'neutral',
        }),
        createSceneFeature({
          id: 'modern-FLK',
          name: 'Falkland Islands / Malvinas',
          sourceFeatureId: 'FLK',
          entityId: 'FLK',
          colorOwnerId: null,
          isSelectable: false,
          interactionMode: 'disputed',
        }),
        createSceneFeature({
          id: '1914-HIST-HRE',
          name: 'Historical entity',
          sourceFeatureId: '1914-HRE-1',
          entityId: 'HIST-HRE',
          colorOwnerId: 'HIST-HRE',
          isSelectable: true,
          interactionMode: 'historical-entity',
          boundaryMode: 'historical',
          provenanceId: 'snapshot-1914-source-1',
        }),
      ]),
    );

    expect(result).toMatchObject({
      ok: true,
      features: [
        { interactionMode: 'inherited-dependency', isSelectable: false },
        { interactionMode: 'neutral', colorOwnerId: null },
        { interactionMode: 'disputed', colorOwnerId: null },
        { interactionMode: 'historical-entity', isSelectable: true },
      ],
      warnings: [],
    });
  });

  it('rejects duplicate logical scene IDs without discarding valid neighbors', (): void => {
    const result = normalizeSceneGeoJson(
      createCollection([
        createSceneFeature({ id: 'modern-FRA' }),
        createSceneFeature({ id: ' modern-FRA ', name: 'Duplicate France' }),
        createSceneFeature({ id: 'modern-DEU', name: 'Germany', entityId: 'DEU' }),
      ]),
    );

    expect(result).toMatchObject({
      ok: true,
      features: [{ id: 'modern-FRA' }, { id: 'modern-DEU' }],
      warnings: [{ featureIndex: 1, code: 'duplicate-id' }],
    });
  });
});

/* ------------------------------------------------------------------ *
 * 04-09 - the interior-border mesh
 * ------------------------------------------------------------------ */

const lineStringCoordinates = [
  [0, 0],
  [1, 1],
];

const multiLineStringCoordinates = [lineStringCoordinates, lineStringCoordinates];

function createMesh(geometries: ReadonlyArray<unknown>): unknown {
  return { type: 'GeometryCollection', geometries };
}

const lineString = { type: 'LineString', coordinates: lineStringCoordinates };
const multiLineString = {
  type: 'MultiLineString',
  coordinates: multiLineStringCoordinates,
};

describe('normalizeBorderMesh', (): void => {
  /*
   * The measured shape of the shipped asset: 301 LineString + 26
   * MultiLineString. A validator that admitted only LineStrings would agree
   * happily with a mesh that had lost all 26 MultiLineStrings, which is the
   * exact correction `coding-rules/data.md` records against 04-RESEARCH.
   */
  it('admits both LineString and MultiLineString members', (): void => {
    const result = normalizeBorderMesh(
      createMesh([lineString, multiLineString]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.mesh.type).toBe('GeometryCollection');
    // A literal, never `inputs.length`: a product or a length read from the
    // input is green at zero geometries.
    expect(result.mesh.geometries).toHaveLength(2);
    expect(
      result.mesh.geometries.map((geometry): string => geometry.type),
    ).toStrictEqual(['LineString', 'MultiLineString']);
    expect(result.warnings).toStrictEqual([]);
  });

  it('refuses a FeatureCollection root rather than crashing on it', (): void => {
    const result = normalizeBorderMesh({
      type: 'FeatureCollection',
      features: [createFeature('FRA', 'France')],
    });

    expect(result).toStrictEqual({
      ok: false,
      reason: 'invalid-collection',
      warnings: [],
    });
  });

  it('refuses a root whose geometries are not an array', (): void => {
    expect(
      normalizeBorderMesh({ type: 'GeometryCollection', geometries: null }),
    ).toStrictEqual({
      ok: false,
      reason: 'invalid-collection',
      warnings: [],
    });
    expect(normalizeBorderMesh(null)).toStrictEqual({
      ok: false,
      reason: 'invalid-collection',
      warnings: [],
    });
  });

  it('skips a malformed geometry with a warning and keeps its neighbours', (): void => {
    const result = normalizeBorderMesh(
      createMesh([
        lineString,
        // A single position is not a line: two is the minimum.
        { type: 'LineString', coordinates: [[0, 0]] },
        // Off-planet coordinates are what a truncated or re-projected file
        // looks like, and `isPosition` is what catches them.
        { type: 'LineString', coordinates: [[0, 0], [500, 0]] },
        { type: 'Polygon', coordinates: polygonCoordinates },
        'not a geometry at all',
        multiLineString,
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.mesh.geometries).toHaveLength(2);
    expect(result.warnings).toStrictEqual([
      { featureIndex: 1, code: 'invalid-geometry' },
      { featureIndex: 2, code: 'invalid-geometry' },
      { featureIndex: 3, code: 'unsupported-geometry' },
      { featureIndex: 4, code: 'invalid-geometry' },
    ]);
  });

  it('refuses a mesh with no usable geometry at all', (): void => {
    expect(normalizeBorderMesh(createMesh([]))).toStrictEqual({
      ok: false,
      reason: 'no-valid-geometries',
      warnings: [],
    });
    expect(
      normalizeBorderMesh(createMesh([{ type: 'Point', coordinates: [0, 0] }])),
    ).toStrictEqual({
      ok: false,
      reason: 'no-valid-geometries',
      warnings: [{ featureIndex: 0, code: 'unsupported-geometry' }],
    });
  });

  /*
   * The count is checked against the manifest's declared `geometryCount`, and
   * it counts GEOMETRIES rather than LineStrings. Both directions are asserted:
   * the declared count accepts the matching mesh and refuses the short one, so
   * the check cannot be satisfied by a validator that ignores the parameter.
   */
  it('holds the mesh to the geometry count the manifest declares', (): void => {
    expect(normalizeBorderMesh(createMesh([lineString, multiLineString]), 2).ok).toBe(
      true,
    );

    expect(
      normalizeBorderMesh(createMesh([lineString, multiLineString]), 3),
    ).toStrictEqual({
      ok: false,
      reason: 'geometry-count-mismatch',
      warnings: [],
    });

    // A dropped MultiLineString moves the count. A LineString-only tally would
    // read 1 both before and after and never notice.
    expect(
      normalizeBorderMesh(createMesh([lineString]), 2),
    ).toStrictEqual({
      ok: false,
      reason: 'geometry-count-mismatch',
      warnings: [],
    });
  });

  it('counts a skipped geometry against the declared count', (): void => {
    const result = normalizeBorderMesh(
      createMesh([lineString, { type: 'LineString', coordinates: [[0, 0]] }]),
      2,
    );

    expect(result).toStrictEqual({
      ok: false,
      reason: 'geometry-count-mismatch',
      warnings: [{ featureIndex: 1, code: 'invalid-geometry' }],
    });
  });
});
