import { geoBounds, ZoomTransform, zoomIdentity } from 'd3';
import type { MultiPolygon, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';

import {
  INITIAL_WORLD_CAMERA,
  MAX_ZOOM,
  MERCATOR_MAX_LATITUDE,
  MIN_ZOOM,
  PAN_FRACTION,
  WORLD_SIZE,
} from '../constants/camera';
import type { CameraState } from '../types/composition';
import type { GeoFeature } from '../types/map';
import {
  cameraToTransform,
  constrainCameraTransform,
  createLocateCamera,
  createLocateTransform,
  createResetTransform,
  getNearestWrappedLongitude,
  panCameraTransform,
  repairCameraState,
  transformToCamera,
  zoomCameraTransform,
} from './camera';
import { createWorldProjection } from './mapProjection';

const VIEWPORT_CENTER = [WORLD_SIZE / 2, WORLD_SIZE / 2] as const;
const NUMBER_TOLERANCE = 8;

function createPolygonFeature(
  id: string,
  coordinates: Polygon['coordinates'],
): GeoFeature {
  return {
    type: 'Feature',
    id,
    properties: { name: id },
    geometry: { type: 'Polygon', coordinates },
  };
}

function createMultiPolygonFeature(
  id: string,
  coordinates: MultiPolygon['coordinates'],
): GeoFeature {
  return {
    type: 'Feature',
    id,
    properties: { name: id },
    geometry: { type: 'MultiPolygon', coordinates },
  };
}

const DATE_LINE_FEATURE = createPolygonFeature('DATE_LINE', [
  [
    [170, -10],
    [170, 10],
    [-170, 10],
    [-170, -10],
    [170, -10],
  ],
]);

const FIJI_FEATURE = createMultiPolygonFeature('FJI', [
  [
    [
      [177, -20],
      [177, -15],
      [179.5, -15],
      [179.5, -20],
      [177, -20],
    ],
  ],
  [
    [
      [-179.5, -19],
      [-179.5, -16],
      [-178, -16],
      [-178, -19],
      [-179.5, -19],
    ],
  ],
]);

const RUSSIA_FEATURE = createMultiPolygonFeature('RUS', [
  [
    [
      [30, 50],
      [30, 70],
      [179, 70],
      [179, 50],
      [30, 50],
    ],
  ],
  [
    [
      [-179.5, 60],
      [-179.5, 70],
      [-170, 70],
      [-170, 60],
      [-179.5, 60],
    ],
  ],
]);

function expectCanonicalTransform(transform: ZoomTransform): void {
  const transformedWorldWidth = WORLD_SIZE * transform.k;

  expect(transform.k).toBeGreaterThanOrEqual(MIN_ZOOM);
  expect(transform.k).toBeLessThanOrEqual(MAX_ZOOM);
  expect(transform.x).toBeLessThanOrEqual(0);
  expect(transform.x).toBeGreaterThan(-transformedWorldWidth);
  expect(transform.y).toBeGreaterThanOrEqual(WORLD_SIZE - transformedWorldWidth);
  expect(transform.y).toBeLessThanOrEqual(0);
  expect([transform.k, transform.x, transform.y].every(Number.isFinite)).toBe(true);
}

describe('constrainCameraTransform', (): void => {
  it.each([
    { label: 'below minimum', input: 0.25, expected: MIN_ZOOM },
    { label: 'at minimum', input: MIN_ZOOM, expected: MIN_ZOOM },
    { label: 'at maximum', input: MAX_ZOOM, expected: MAX_ZOOM },
    { label: 'above maximum', input: 100, expected: MAX_ZOOM },
    { label: 'not finite', input: Number.NaN, expected: MIN_ZOOM },
  ])('clamps $label zoom to the supported range', ({ input, expected }): void => {
    const constrained = constrainCameraTransform(new ZoomTransform(input, 0, 0));

    expect(constrained.k).toBe(expected);
    expectCanonicalTransform(constrained);
    expect(WORLD_SIZE * constrained.k).toBeGreaterThanOrEqual(WORLD_SIZE);
  });

  it('normalizes equivalent horizontal translations modulo transformed world width', (): void => {
    const zoom = 3;
    const worldSpan = WORLD_SIZE * zoom;
    const base = constrainCameraTransform(new ZoomTransform(zoom, -315, -540));

    [-4, -1, 0, 1, 5].forEach((worldOffset): void => {
      const equivalent = constrainCameraTransform(
        new ZoomTransform(zoom, -315 + worldSpan * worldOffset, -540),
      );

      expect(equivalent.x).toBeCloseTo(base.x, NUMBER_TOLERANCE);
      expect(equivalent.y).toBeCloseTo(base.y, NUMBER_TOLERANCE);
    });
  });

  it.each([
    { zoom: 1, inputY: -500, expectedY: 0 },
    { zoom: 2, inputY: 200, expectedY: 0 },
    { zoom: 2, inputY: -1500, expectedY: -1080 },
    { zoom: 5, inputY: -2160, expectedY: -2160 },
  ])(
    'clamps vertical translation for zoom $zoom to the projected world',
    ({ zoom, inputY, expectedY }): void => {
      const constrained = constrainCameraTransform(
        new ZoomTransform(zoom, -100, inputY),
      );

      expect(constrained.y).toBe(expectedY);
      expectCanonicalTransform(constrained);
    },
  );

  it('repairs non-finite translations to the safe initial transform', (): void => {
    const constrained = constrainCameraTransform(
      new ZoomTransform(2, Number.POSITIVE_INFINITY, Number.NaN),
    );

    expect(constrained).toMatchObject({ k: 2, x: 0, y: 0 });
    expectCanonicalTransform(constrained);
  });
});

describe('semantic camera conversion', (): void => {
  const projection = createWorldProjection();

  it.each([
    INITIAL_WORLD_CAMERA,
    { zoom: 2, centerLongitude: 45, centerLatitude: 30 },
    { zoom: 8, centerLongitude: -170, centerLatitude: -70 },
    { zoom: 24, centerLongitude: 179.5, centerLatitude: 84 },
    { zoom: 4, centerLongitude: 540, centerLatitude: 20 },
  ] satisfies ReadonlyArray<CameraState>)(
    'round-trips a canonical semantic camera for %#',
    (camera): void => {
      const expected = repairCameraState(camera);
      const transform = cameraToTransform(camera, projection);
      const roundTrip = transformToCamera(transform, projection);

      expect(roundTrip.zoom).toBeCloseTo(expected.zoom, NUMBER_TOLERANCE);
      expect(roundTrip.centerLongitude).toBeCloseTo(
        expected.centerLongitude,
        NUMBER_TOLERANCE,
      );
      expect(roundTrip.centerLatitude).toBeCloseTo(
        expected.centerLatitude,
        NUMBER_TOLERANCE,
      );
      expectCanonicalTransform(transform);
    },
  );

  it('repairs invalid persisted values to finite canonical bounds', (): void => {
    const repaired = repairCameraState({
      zoom: Number.POSITIVE_INFINITY,
      centerLongitude: Number.NaN,
      centerLatitude: Number.NEGATIVE_INFINITY,
    });

    expect(repaired).toEqual(INITIAL_WORLD_CAMERA);

    const extreme = repairCameraState({
      zoom: -100,
      centerLongitude: 725,
      centerLatitude: 1000,
    });

    expect(extreme).toEqual({
      zoom: MIN_ZOOM,
      centerLongitude: 5,
      centerLatitude: MERCATOR_MAX_LATITUDE,
    });
  });
});

describe('camera zoom and pan helpers', (): void => {
  const projection = createWorldProjection();

  it('preserves the center anchor while zooming', (): void => {
    const initialCamera: CameraState = {
      zoom: 3,
      centerLongitude: 35,
      centerLatitude: 20,
    };
    const initialTransform = cameraToTransform(initialCamera, projection);
    const zoomedTransform = zoomCameraTransform(
      initialTransform,
      6,
      VIEWPORT_CENTER,
    );
    const zoomedCamera = transformToCamera(zoomedTransform, projection);

    expect(zoomedCamera.zoom).toBe(6);
    expect(zoomedCamera.centerLongitude).toBeCloseTo(
      initialCamera.centerLongitude,
      NUMBER_TOLERANCE,
    );
    expect(zoomedCamera.centerLatitude).toBeCloseTo(
      initialCamera.centerLatitude,
      NUMBER_TOLERANCE,
    );
    expectCanonicalTransform(zoomedTransform);
  });

  it.each([
    { direction: 'right' as const, axis: 'x' as const, transformSign: -1 },
    { direction: 'left' as const, axis: 'x' as const, transformSign: 1 },
    { direction: 'up' as const, axis: 'y' as const, transformSign: 1 },
    { direction: 'down' as const, axis: 'y' as const, transformSign: -1 },
  ])(
    'moves the visible camera one pan step $direction',
    ({ direction, axis, transformSign }): void => {
      const initialTransform = cameraToTransform(
        { zoom: 4, centerLongitude: 0, centerLatitude: 0 },
        projection,
      );
      const pannedTransform = panCameraTransform(initialTransform, direction);
      const expectedScreenStep = WORLD_SIZE * PAN_FRACTION;
      const actualTransformDelta =
        axis === 'x'
          ? pannedTransform.x - initialTransform.x
          : pannedTransform.y - initialTransform.y;

      expect(actualTransformDelta).toBeCloseTo(
        transformSign * expectedScreenStep,
        NUMBER_TOLERANCE,
      );
      expectCanonicalTransform(pannedTransform);
    },
  );
});

describe('wrapped Locate targets', (): void => {
  const projection = createWorldProjection();

  it.each([
    { longitude: -179, reference: 179, expected: 181 },
    { longitude: 179, reference: -179, expected: -181 },
    { longitude: 5, reference: 725, expected: 725 },
    { longitude: 190, reference: 0, expected: -170 },
  ])(
    'chooses the nearest wrapped copy of $longitude from $reference',
    ({ longitude, reference, expected }): void => {
      expect(getNearestWrappedLongitude(longitude, reference)).toBe(expected);
    },
  );

  it.each([
    { label: 'Fiji', feature: FIJI_FEATURE, currentLongitude: 170 },
    { label: 'Russia', feature: RUSSIA_FEATURE, currentLongitude: -160 },
    { label: 'a date-line polygon', feature: DATE_LINE_FEATURE, currentLongitude: 175 },
  ])(
    'creates an antimeridian-safe nearest target for $label',
    ({ feature, currentLongitude }): void => {
      const bounds = geoBounds(feature);
      const currentCamera: CameraState = {
        zoom: 3,
        centerLongitude: currentLongitude,
        centerLatitude: 0,
      };
      const target = createLocateCamera(feature, currentCamera);
      const targetTransform = createLocateTransform(
        feature,
        currentCamera,
        projection,
      );
      const nearestCenter = getNearestWrappedLongitude(
        target.centerLongitude,
        currentLongitude,
      );

      expect(bounds[0][0]).toBeGreaterThan(bounds[1][0]);
      expect(Math.abs(nearestCenter - currentLongitude)).toBeLessThanOrEqual(180);
      expect(target.zoom).toBeGreaterThanOrEqual(2);
      expect(target.zoom).toBeLessThanOrEqual(MAX_ZOOM);
      expect(Math.abs(target.centerLatitude)).toBeLessThanOrEqual(
        MERCATOR_MAX_LATITUDE,
      );
      expectCanonicalTransform(targetTransform);
    },
  );

  it('routes Reset and malformed Locate targets through the canonical constraint', (): void => {
    const reset = createResetTransform(projection);
    const malformed = createPolygonFeature('MALFORMED', [
      [
        [Number.NaN, 0],
        [Number.NaN, 1],
        [Number.NaN, 0],
        [Number.NaN, 0],
      ],
    ]);
    const locate = createLocateTransform(
      malformed,
      {
        zoom: Number.NaN,
        centerLongitude: Number.POSITIVE_INFINITY,
        centerLatitude: Number.NEGATIVE_INFINITY,
      },
      projection,
    );

    expect(reset).toMatchObject(zoomIdentity);
    expect(locate).toMatchObject(zoomIdentity);
    expectCanonicalTransform(reset);
    expectCanonicalTransform(locate);
  });
});
