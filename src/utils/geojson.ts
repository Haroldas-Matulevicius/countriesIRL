import type { MultiPolygon, Polygon, Position } from 'geojson';

import type {
  GeoFeature,
  GeoJsonNormalizationResult,
  GeoJsonWarning,
  GeoJsonWarningCode,
} from '../types/map';
import { normalizeStableCountryId } from './countryIds';

const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !value.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  ) {
    return false;
  }

  const [longitude, latitude] = value;
  return (
    longitude >= MIN_LONGITUDE &&
    longitude <= MAX_LONGITUDE &&
    latitude > MIN_LATITUDE &&
    latitude < MAX_LATITUDE
  );
}

function positionsMatch(first: Position, last: Position): boolean {
  return (
    first.length === last.length &&
    first.every((coordinate, index) => coordinate === last[index])
  );
}

function isLinearRing(value: unknown): value is Position[] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) {
    return false;
  }

  const first = value[0];
  const last = value[value.length - 1];
  return first !== undefined && last !== undefined && positionsMatch(first, last);
}

function isPolygonCoordinates(
  value: unknown,
): value is Polygon['coordinates'] {
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing);
}

function isMultiPolygonCoordinates(
  value: unknown,
): value is MultiPolygon['coordinates'] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isPolygonCoordinates)
  );
}

function createWarning(
  featureIndex: number,
  code: GeoJsonWarningCode,
): GeoJsonWarning {
  return { featureIndex, code };
}

function readFeatureId(
  feature: Record<string, unknown>,
): { ok: true; id: string } | { ok: false; code: 'missing-id' | 'sentinel-id' } {
  if (typeof feature.id !== 'string' || feature.id.trim().length === 0) {
    return { ok: false, code: 'missing-id' };
  }

  const id = normalizeStableCountryId(feature.id);
  return id === null
    ? { ok: false, code: 'sentinel-id' }
    : { ok: true, id };
}

function readFeatureName(
  feature: Record<string, unknown>,
): { ok: true; name: string } | { ok: false } {
  if (!isRecord(feature.properties) || typeof feature.properties.name !== 'string') {
    return { ok: false };
  }

  const name = feature.properties.name.trim();
  return name.length > 0 ? { ok: true, name } : { ok: false };
}

function readFeatureGeometry(
  feature: Record<string, unknown>,
):
  | { ok: true; geometry: Polygon | MultiPolygon }
  | { ok: false; code: 'unsupported-geometry' | 'invalid-geometry' } {
  if (!isRecord(feature.geometry)) {
    return { ok: false, code: 'invalid-geometry' };
  }

  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') {
    return isPolygonCoordinates(coordinates)
      ? { ok: true, geometry: { type, coordinates } }
      : { ok: false, code: 'invalid-geometry' };
  }

  if (type === 'MultiPolygon') {
    return isMultiPolygonCoordinates(coordinates)
      ? { ok: true, geometry: { type, coordinates } }
      : { ok: false, code: 'invalid-geometry' };
  }

  return { ok: false, code: 'unsupported-geometry' };
}

export function normalizeGeoJson(input: unknown): GeoJsonNormalizationResult {
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    !Array.isArray(input.features)
  ) {
    return { ok: false, reason: 'invalid-collection', warnings: [] };
  }

  const features: GeoFeature[] = [];
  const warnings: GeoJsonWarning[] = [];
  const acceptedIds = new Set<string>();

  input.features.forEach((candidate, featureIndex): void => {
    if (!isRecord(candidate) || candidate.type !== 'Feature') {
      warnings.push(createWarning(featureIndex, 'invalid-feature'));
      return;
    }

    const idResult = readFeatureId(candidate);
    if (!idResult.ok) {
      warnings.push(createWarning(featureIndex, idResult.code));
      return;
    }

    if (acceptedIds.has(idResult.id)) {
      warnings.push(createWarning(featureIndex, 'duplicate-id'));
      return;
    }

    const nameResult = readFeatureName(candidate);
    if (!nameResult.ok) {
      warnings.push(createWarning(featureIndex, 'missing-name'));
      return;
    }

    const geometryResult = readFeatureGeometry(candidate);
    if (!geometryResult.ok) {
      warnings.push(createWarning(featureIndex, geometryResult.code));
      return;
    }

    acceptedIds.add(idResult.id);
    features.push({
      type: 'Feature',
      id: idResult.id,
      properties: { name: nameResult.name },
      geometry: geometryResult.geometry,
    });
  });

  return features.length > 0
    ? { ok: true, features, warnings }
    : { ok: false, reason: 'no-valid-features', warnings };
}
