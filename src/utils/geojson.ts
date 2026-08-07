import type {
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';

import type {
  GeoFeature,
  GeoJsonNormalizationResult,
  GeoJsonWarning,
  GeoJsonWarningCode,
  SceneFeature,
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
    latitude >= MIN_LATITUDE &&
    latitude <= MAX_LATITUDE
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

function isLineStringCoordinates(
  value: unknown,
): value is LineString['coordinates'] {
  return Array.isArray(value) && value.length >= 2 && value.every(isPosition);
}

function isMultiLineStringCoordinates(
  value: unknown,
): value is MultiLineString['coordinates'] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isLineStringCoordinates)
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

type SceneFeatureMetadata =
  | {
      readonly sourceFeatureId: string;
      readonly entityId: string;
      readonly boundaryMode: SceneFeature['boundaryMode'];
      readonly provenanceId: string;
      readonly interactionMode: 'modern-core' | 'historical-entity';
      readonly colorOwnerId: string;
      readonly isSelectable: true;
    }
  | {
      readonly sourceFeatureId: string;
      readonly entityId: string;
      readonly boundaryMode: SceneFeature['boundaryMode'];
      readonly provenanceId: string;
      readonly interactionMode: 'self-colorable';
      readonly colorOwnerId: string;
      readonly isSelectable: true;
    }
  | {
      readonly sourceFeatureId: string;
      readonly entityId: string;
      readonly boundaryMode: SceneFeature['boundaryMode'];
      readonly provenanceId: string;
      readonly interactionMode: 'inherited-dependency';
      readonly colorOwnerId: string;
      readonly isSelectable: false;
    }
  | {
      readonly sourceFeatureId: string;
      readonly entityId: string;
      readonly boundaryMode: SceneFeature['boundaryMode'];
      readonly provenanceId: string;
      readonly interactionMode: 'disputed' | 'neutral';
      readonly colorOwnerId: null;
      readonly isSelectable: false;
    };

export type SceneGeoJsonNormalizationResult =
  | {
      readonly ok: true;
      readonly features: ReadonlyArray<SceneFeature>;
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      readonly ok: false;
      readonly reason: 'invalid-collection' | 'no-valid-features';
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
    };

function readRequiredIdentifier(value: unknown): string | null {
  return normalizeStableCountryId(value);
}

function readBoundaryMode(value: unknown): SceneFeature['boundaryMode'] | null {
  return value === 'modern' ||
    value === 'historical' ||
    value === 'modern-fallback'
    ? value
    : null;
}

function readSceneFeatureMetadata(
  feature: Record<string, unknown>,
): SceneFeatureMetadata | null {
  const sourceFeatureId = readRequiredIdentifier(feature.sourceFeatureId);
  const entityId = readRequiredIdentifier(feature.entityId);
  const boundaryMode = readBoundaryMode(feature.boundaryMode);
  const provenanceId = readRequiredIdentifier(feature.provenanceId);
  const colorOwnerId =
    feature.colorOwnerId === null
      ? null
      : readRequiredIdentifier(feature.colorOwnerId);

  if (
    sourceFeatureId === null ||
    entityId === null ||
    boundaryMode === null ||
    provenanceId === null ||
    typeof feature.isSelectable !== 'boolean'
  ) {
    return null;
  }

  if (
    feature.interactionMode === 'modern-core' &&
    feature.isSelectable &&
    colorOwnerId === entityId &&
    boundaryMode !== 'historical'
  ) {
    return {
      sourceFeatureId,
      entityId,
      colorOwnerId,
      isSelectable: true,
      interactionMode: 'modern-core',
      boundaryMode,
      provenanceId,
    };
  }

  // D4-10. Held to the same three conditions as `modern-core` - selectable,
  // owns its own color, not a historical boundary - so this branch cannot
  // admit a record the core branch would have rejected.
  if (
    feature.interactionMode === 'self-colorable' &&
    feature.isSelectable &&
    colorOwnerId === entityId &&
    boundaryMode !== 'historical'
  ) {
    return {
      sourceFeatureId,
      entityId,
      colorOwnerId,
      isSelectable: true,
      interactionMode: 'self-colorable',
      boundaryMode,
      provenanceId,
    };
  }

  if (
    feature.interactionMode === 'historical-entity' &&
    feature.isSelectable &&
    colorOwnerId === entityId &&
    boundaryMode === 'historical'
  ) {
    return {
      sourceFeatureId,
      entityId,
      colorOwnerId,
      isSelectable: true,
      interactionMode: 'historical-entity',
      boundaryMode,
      provenanceId,
    };
  }

  if (
    feature.interactionMode === 'inherited-dependency' &&
    !feature.isSelectable &&
    colorOwnerId !== null
  ) {
    return {
      sourceFeatureId,
      entityId,
      colorOwnerId,
      isSelectable: false,
      interactionMode: 'inherited-dependency',
      boundaryMode,
      provenanceId,
    };
  }

  if (
    (feature.interactionMode === 'disputed' ||
      feature.interactionMode === 'neutral') &&
    !feature.isSelectable &&
    feature.colorOwnerId === null
  ) {
    return {
      sourceFeatureId,
      entityId,
      colorOwnerId: null,
      isSelectable: false,
      interactionMode: feature.interactionMode,
      boundaryMode,
      provenanceId,
    };
  }

  return null;
}

/**
 * The interior-border mesh (`public/data/world-borders-modern.geojson`, derived
 * by `04-06`).
 *
 * **Its root is a `GeometryCollection`, not a `FeatureCollection`, and its
 * members are NOT all `LineString`s.** `04-06` measured 327 geometries — 301
 * `LineString` plus 26 `MultiLineString` — and `coding-rules/data.md` records
 * the corollary in bold: *anything that counts only `LineString`s will agree
 * happily with a mesh that has lost all 26 `MultiLineString`s.* Both member
 * types are admitted here and the count below counts GEOMETRIES.
 */
export type BorderMeshGeometry = LineString | MultiLineString;

export type BorderMesh = GeometryCollection<BorderMeshGeometry>;

export type BorderMeshRefusal =
  | 'invalid-collection'
  | 'no-valid-geometries'
  | 'geometry-count-mismatch';

export type BorderMeshNormalizationResult =
  | {
      readonly ok: true;
      readonly mesh: BorderMesh;
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      readonly ok: false;
      readonly reason: BorderMeshRefusal;
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
    };

function readMeshGeometry(
  candidate: unknown,
):
  | { ok: true; geometry: BorderMeshGeometry }
  | { ok: false; code: 'unsupported-geometry' | 'invalid-geometry' } {
  if (!isRecord(candidate)) {
    return { ok: false, code: 'invalid-geometry' };
  }

  const { type, coordinates } = candidate;
  if (type === 'LineString') {
    return isLineStringCoordinates(coordinates)
      ? { ok: true, geometry: { type, coordinates } }
      : { ok: false, code: 'invalid-geometry' };
  }

  if (type === 'MultiLineString') {
    return isMultiLineStringCoordinates(coordinates)
      ? { ok: true, geometry: { type, coordinates } }
      : { ok: false, code: 'invalid-geometry' };
  }

  return { ok: false, code: 'unsupported-geometry' };
}

/**
 * Validate the mesh before it is handed to `geoPath`, on the same contract the
 * feature loader follows: **a malformed member is skipped with a warning, never
 * a crash.** `warnings[].featureIndex` is the index in `geometries` here; the
 * field keeps its name because the warning type is shared.
 *
 * `expectedGeometryCount` is the manifest's `interiorBorderMesh.geometryCount`,
 * cross-checked against the artifact rather than against a constant this module
 * declares — two files that have to agree, which is the same discipline
 * `worldDataAsset.test.ts` uses offline. The comparison is made against the
 * ACCEPTED count, so a skipped member trips it too: the mesh is a hash-recorded
 * asset, and any deviation from the recorded shape means this is not the
 * approved artifact.
 */
export function normalizeBorderMesh(
  input: unknown,
  expectedGeometryCount?: number,
): BorderMeshNormalizationResult {
  if (
    !isRecord(input) ||
    input.type !== 'GeometryCollection' ||
    !Array.isArray(input.geometries)
  ) {
    return { ok: false, reason: 'invalid-collection', warnings: [] };
  }

  const geometries: BorderMeshGeometry[] = [];
  const warnings: GeoJsonWarning[] = [];

  input.geometries.forEach((candidate, geometryIndex): void => {
    const result = readMeshGeometry(candidate);
    if (!result.ok) {
      warnings.push(createWarning(geometryIndex, result.code));
      return;
    }
    geometries.push(result.geometry);
  });

  if (geometries.length === 0) {
    return { ok: false, reason: 'no-valid-geometries', warnings };
  }

  if (
    expectedGeometryCount !== undefined &&
    geometries.length !== expectedGeometryCount
  ) {
    return { ok: false, reason: 'geometry-count-mismatch', warnings };
  }

  return {
    ok: true,
    mesh: { type: 'GeometryCollection', geometries },
    warnings,
  };
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

export function normalizeSceneGeoJson(
  input: unknown,
): SceneGeoJsonNormalizationResult {
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    !Array.isArray(input.features)
  ) {
    return { ok: false, reason: 'invalid-collection', warnings: [] };
  }

  const features: SceneFeature[] = [];
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

    const metadata = readSceneFeatureMetadata(candidate);
    if (metadata === null) {
      warnings.push(createWarning(featureIndex, 'invalid-feature'));
      return;
    }

    acceptedIds.add(idResult.id);
    features.push({
      type: 'Feature',
      id: idResult.id,
      ...metadata,
      properties: { name: nameResult.name },
      geometry: geometryResult.geometry,
    });
  });

  return features.length > 0
    ? { ok: true, features, warnings }
    : { ok: false, reason: 'no-valid-features', warnings };
}
