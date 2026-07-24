import {
  geoBounds,
  geoCentroid,
  zoomIdentity,
  type GeoProjection,
  type ZoomTransform,
} from 'd3';

import {
  INITIAL_WORLD_CAMERA,
  LOCATE_MIN_ZOOM,
  LOCATE_PADDING,
  MAX_ZOOM,
  MERCATOR_MAX_LATITUDE,
  MIN_ZOOM,
  PAN_FRACTION,
  WORLD_SIZE,
} from '../constants/camera';
import type { CameraPanDirection, CameraState } from '../types/composition';
import type { GeoFeature } from '../types/map';
import { createWorldProjection } from './mapProjection';

type Point = readonly [number, number];
type SphericalBounds = [[number, number], [number, number]];

const FULL_LONGITUDE_RANGE = 360;
const HALF_WORLD_SIZE = WORLD_SIZE / 2;
const LOCATE_AVAILABLE_HALF_SIZE =
  HALF_WORLD_SIZE * (1 - LOCATE_PADDING * 2);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    return INITIAL_WORLD_CAMERA.centerLongitude;
  }

  const normalized =
    positiveModulo(longitude + 180, FULL_LONGITUDE_RANGE) - 180;

  return Object.is(normalized, -0) ? 0 : normalized;
}

function clampLatitude(latitude: number): number {
  if (!Number.isFinite(latitude)) {
    return INITIAL_WORLD_CAMERA.centerLatitude;
  }

  return clamp(latitude, -MERCATOR_MAX_LATITUDE, MERCATOR_MAX_LATITUDE);
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return INITIAL_WORLD_CAMERA.zoom;
  }

  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

function isFinitePoint(point: Point | null): point is Point {
  return point !== null && point.every(Number.isFinite);
}

function isFiniteBounds(bounds: SphericalBounds): boolean {
  return bounds.every((point): boolean => point.every(Number.isFinite));
}

function getProjectedLatitudeY(
  projection: GeoProjection,
  latitude: number,
): number | null {
  const projected = projection([0, clampLatitude(latitude)]);

  return isFinitePoint(projected) ? projected[1] : null;
}

function getUnwrappedLongitudeBounds(
  bounds: SphericalBounds,
  wrappedCenterLongitude: number,
): readonly [number, number] {
  const west = bounds[0][0];
  const east = bounds[1][0];
  const unwrappedEast = east < west ? east + FULL_LONGITUDE_RANGE : east;
  const midpoint = (west + unwrappedEast) / 2;
  const worldOffset =
    FULL_LONGITUDE_RANGE *
    Math.round((wrappedCenterLongitude - midpoint) / FULL_LONGITUDE_RANGE);

  return [west + worldOffset, unwrappedEast + worldOffset];
}

function longitudeToWorldX(longitude: number): number {
  return ((longitude + 180) / FULL_LONGITUDE_RANGE) * WORLD_SIZE;
}

function getFitZoom(halfExtent: number): number {
  if (!Number.isFinite(halfExtent) || halfExtent <= 0) {
    return MAX_ZOOM;
  }

  return LOCATE_AVAILABLE_HALF_SIZE / halfExtent;
}

export function repairCameraState(camera: CameraState): CameraState {
  return {
    zoom: clampZoom(camera.zoom),
    centerLongitude: normalizeLongitude(camera.centerLongitude),
    centerLatitude: clampLatitude(camera.centerLatitude),
  };
}

export function constrainCameraTransform(
  transform: ZoomTransform,
): ZoomTransform {
  const zoom = clampZoom(transform.k);
  const worldSpan = WORLD_SIZE * zoom;
  const sourceX = Number.isFinite(transform.x) ? transform.x : 0;
  const sourceY = Number.isFinite(transform.y) ? transform.y : 0;
  const normalizedX = -positiveModulo(-sourceX, worldSpan);
  const minimumY = WORLD_SIZE - worldSpan;
  const clampedY = clamp(sourceY, minimumY, 0);

  return zoomIdentity.translate(normalizedX, clampedY).scale(zoom);
}

export function cameraToTransform(
  camera: CameraState,
  projection: GeoProjection = createWorldProjection(),
): ZoomTransform {
  const repaired = repairCameraState(camera);
  const projectedCenter = projection([
    repaired.centerLongitude,
    repaired.centerLatitude,
  ]);

  if (!isFinitePoint(projectedCenter)) {
    return constrainCameraTransform(zoomIdentity);
  }

  return constrainCameraTransform(
    zoomIdentity
      .translate(HALF_WORLD_SIZE, HALF_WORLD_SIZE)
      .scale(repaired.zoom)
      .translate(-projectedCenter[0], -projectedCenter[1]),
  );
}

export function transformToCamera(
  transform: ZoomTransform,
  projection: GeoProjection = createWorldProjection(),
): CameraState {
  const constrained = constrainCameraTransform(transform);
  const projectedCenter = constrained.invert([
    HALF_WORLD_SIZE,
    HALF_WORLD_SIZE,
  ]);
  const geographicCenter = projection.invert?.(projectedCenter) ?? null;

  if (!isFinitePoint(geographicCenter)) {
    return INITIAL_WORLD_CAMERA;
  }

  return repairCameraState({
    zoom: constrained.k,
    centerLongitude: geographicCenter[0],
    centerLatitude: geographicCenter[1],
  });
}

export function zoomCameraTransform(
  transform: ZoomTransform,
  targetZoom: number,
  anchor: Point = [HALF_WORLD_SIZE, HALF_WORLD_SIZE],
): ZoomTransform {
  const constrained = constrainCameraTransform(transform);
  const safeAnchor: Point = anchor.every(Number.isFinite)
    ? anchor
    : [HALF_WORLD_SIZE, HALF_WORLD_SIZE];
  const worldAnchor = constrained.invert([safeAnchor[0], safeAnchor[1]]);

  return constrainCameraTransform(
    zoomIdentity
      .translate(safeAnchor[0], safeAnchor[1])
      .scale(clampZoom(targetZoom))
      .translate(-worldAnchor[0], -worldAnchor[1]),
  );
}

export function panCameraTransform(
  transform: ZoomTransform,
  direction: CameraPanDirection,
  viewportFraction: number = PAN_FRACTION,
): ZoomTransform {
  const constrained = constrainCameraTransform(transform);
  const safeViewportFraction =
    Number.isFinite(viewportFraction) && viewportFraction > 0
      ? viewportFraction
      : PAN_FRACTION;
  const screenStep = WORLD_SIZE * safeViewportFraction;
  const translationByDirection: Readonly<
    Record<CameraPanDirection, Point>
  > = {
    up: [0, screenStep],
    right: [-screenStep, 0],
    down: [0, -screenStep],
    left: [screenStep, 0],
  };
  const [deltaX, deltaY] = translationByDirection[direction];

  return constrainCameraTransform(
    zoomIdentity
      .translate(constrained.x + deltaX, constrained.y + deltaY)
      .scale(constrained.k),
  );
}

export function getNearestWrappedLongitude(
  longitude: number,
  referenceLongitude: number,
): number {
  const canonicalLongitude = normalizeLongitude(longitude);
  const safeReference = Number.isFinite(referenceLongitude)
    ? referenceLongitude
    : INITIAL_WORLD_CAMERA.centerLongitude;
  const worldOffset = Math.round(
    (safeReference - canonicalLongitude) / FULL_LONGITUDE_RANGE,
  );

  return canonicalLongitude + worldOffset * FULL_LONGITUDE_RANGE;
}

export function createLocateCamera(
  feature: GeoFeature,
  currentCamera: CameraState,
): CameraState {
  const repairedCurrent = repairCameraState(currentCamera);
  let bounds: SphericalBounds;
  let centroid: [number, number];

  try {
    bounds = geoBounds(feature);
    centroid = geoCentroid(feature);
  } catch {
    return repairedCurrent;
  }

  if (!isFiniteBounds(bounds) || !isFinitePoint(centroid)) {
    return repairedCurrent;
  }

  const projection = createWorldProjection();
  const wrappedCenterLongitude = getNearestWrappedLongitude(
    centroid[0],
    repairedCurrent.centerLongitude,
  );
  const centerLatitude = clampLatitude(centroid[1]);
  const [west, east] = getUnwrappedLongitudeBounds(
    bounds,
    wrappedCenterLongitude,
  );
  const centerX = longitudeToWorldX(wrappedCenterLongitude);
  const westX = longitudeToWorldX(west);
  const eastX = longitudeToWorldX(east);
  const centerY = getProjectedLatitudeY(projection, centerLatitude);
  const northY = getProjectedLatitudeY(projection, bounds[1][1]);
  const southY = getProjectedLatitudeY(projection, bounds[0][1]);

  if (centerY === null || northY === null || southY === null) {
    return repairedCurrent;
  }

  const horizontalHalfExtent = Math.max(
    Math.abs(centerX - westX),
    Math.abs(eastX - centerX),
  );
  const verticalHalfExtent = Math.max(
    Math.abs(centerY - northY),
    Math.abs(southY - centerY),
  );
  const zoom = clamp(
    Math.min(
      getFitZoom(horizontalHalfExtent),
      getFitZoom(verticalHalfExtent),
    ),
    LOCATE_MIN_ZOOM,
    MAX_ZOOM,
  );
  const targetCamera = repairCameraState({
    zoom,
    centerLongitude: wrappedCenterLongitude,
    centerLatitude,
  });

  return transformToCamera(cameraToTransform(targetCamera, projection), projection);
}

export function createLocateTransform(
  feature: GeoFeature,
  currentCamera: CameraState,
  projection: GeoProjection = createWorldProjection(),
): ZoomTransform {
  return cameraToTransform(createLocateCamera(feature, currentCamera), projection);
}

export function createResetTransform(
  projection: GeoProjection = createWorldProjection(),
): ZoomTransform {
  return cameraToTransform(INITIAL_WORLD_CAMERA, projection);
}
