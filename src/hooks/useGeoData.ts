import { useEffect, useState } from 'react';

import type {
  CountryId,
  GeoJsonWarning,
  SceneFeature,
} from '../types/map';
import { normalizeSceneGeoJson } from '../utils/geojson';
import { normalizeStableCountryId } from '../utils/countryIds';

export const WORLD_MANIFEST_URL = '/data/world-manifest.json';
export const WORLD_DATA_URL = '/data/world-modern.geojson';

const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';
const EXPECTED_MANIFEST_SCHEMA_VERSION = 1;
const EXPECTED_NATURAL_EARTH_VERSION = '5.1.1';
const EXPECTED_CORE_COUNT = 195;
const EXPECTED_NON_CORE_COUNT = 47;
const EXPECTED_SUPPLEMENT_COUNT = 6;
const EXPECTED_RUNTIME_UNIT_COUNT = 248;
const BASE_PROVENANCE_ID = 'natural-earth-admin-0-50m';
const SUPPLEMENT_PROVENANCE_ID = 'natural-earth-admin-0-10m';
const EXPECTED_SOURCE_DEFINITIONS = [
  {
    id: BASE_PROVENANCE_ID,
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson',
    sha256: '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb',
  },
  {
    id: SUPPLEMENT_PROVENANCE_ID,
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson',
    sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
  },
] as const;
const RESERVED_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface WorldCountryMetadata {
  readonly id: CountryId;
  readonly name: string;
}

interface WorldUnitMetadata {
  readonly sceneId: string;
  readonly sourceFeatureId: string;
  readonly entityId: CountryId;
  readonly colorOwnerId: CountryId | null;
  readonly isSelectable: boolean;
  readonly interactionMode: SceneFeature['interactionMode'];
  readonly boundaryMode: 'modern';
  readonly provenanceId: string;
  readonly name: string;
}

interface ValidWorldManifest {
  readonly unitsById: ReadonlyMap<string, WorldUnitMetadata>;
  readonly coreIds: ReadonlySet<CountryId>;
  readonly countryMetadata: ReadonlyArray<WorldCountryMetadata>;
}

type ManifestValidationResult =
  | { readonly ok: true; readonly value: ValidWorldManifest }
  | { readonly ok: false };

type WorldGeoDataErrorSource = 'manifest' | 'world-asset';

export type WorldGeoDataState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly features: ReadonlyArray<SceneFeature>;
      readonly coreFeatures: ReadonlyArray<SceneFeature>;
      readonly lookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly coreLookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly entityLookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly countryMetadata: ReadonlyArray<WorldCountryMetadata>;
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
    }
  | {
      readonly status: 'error';
      readonly reason: 'fetch-failed' | 'invalid-data';
      readonly source: WorldGeoDataErrorSource;
    };

interface WorldGeoDataRequest {
  readonly signal: AbortSignal;
  readonly promise: Promise<WorldGeoDataState>;
  abort(): void;
}

type PayloadLoadResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly reason: 'fetch-failed' | 'invalid-data';
      readonly source: WorldGeoDataErrorSource;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasReservedObjectKey(record: Record<string, unknown>): boolean {
  return Object.keys(record).some((key) => RESERVED_OBJECT_KEYS.has(key));
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readStableId(value: unknown): string | null {
  return normalizeStableCountryId(value);
}

function readRecordArray(
  record: Record<string, unknown>,
  key: string,
  expectedLength: number,
): ReadonlyArray<unknown> | null {
  const value = record[key];
  return Array.isArray(value) && value.length === expectedLength ? value : null;
}

function hasExpectedManifestHeader(manifest: Record<string, unknown>): boolean {
  const policy = manifest.policy;
  const naturalEarth = manifest.naturalEarth;
  if (
    manifest.schemaVersion !== EXPECTED_MANIFEST_SCHEMA_VERSION ||
    !isRecord(policy) ||
    hasReservedObjectKey(policy) ||
    policy.coreStateCount !== EXPECTED_CORE_COUNT ||
    policy.runtimeUnitCount !== EXPECTED_RUNTIME_UNIT_COUNT ||
    policy.coreSelectable !== true ||
    policy.nonCoreSelectable !== false ||
    !isRecord(naturalEarth) ||
    hasReservedObjectKey(naturalEarth) ||
    naturalEarth.version !== EXPECTED_NATURAL_EARTH_VERSION ||
    !Array.isArray(naturalEarth.sources)
  ) {
    return false;
  }

  const sources = naturalEarth.sources;
  if (sources.length !== EXPECTED_SOURCE_DEFINITIONS.length) {
    return false;
  }

  return EXPECTED_SOURCE_DEFINITIONS.every((expectedSource, index) => {
    const source = sources[index];
    return (
      isRecord(source) &&
      !hasReservedObjectKey(source) &&
      source.id === expectedSource.id &&
      source.url === expectedSource.url &&
      source.sha256 === expectedSource.sha256
    );
  });
}

function readCoreUnit(candidate: unknown): WorldUnitMetadata | null {
  if (!isRecord(candidate) || hasReservedObjectKey(candidate)) {
    return null;
  }

  const id = readStableId(candidate.id);
  const name = readNonEmptyString(candidate.name);
  const sourceFeatureId = readStableId(candidate.sourceId);
  const sourceMatchField = candidate.sourceMatchField;
  const sourceMatchValue = readStableId(candidate.sourceMatchValue);
  if (
    id === null ||
    name === null ||
    sourceFeatureId === null ||
    (sourceMatchField !== 'ADM0_A3' && sourceMatchField !== 'ISO_A3') ||
    sourceMatchValue === null
  ) {
    return null;
  }

  return {
    sceneId: id,
    sourceFeatureId,
    entityId: id,
    colorOwnerId: id,
    isSelectable: true,
    interactionMode: 'modern-core',
    boundaryMode: 'modern',
    provenanceId: BASE_PROVENANCE_ID,
    name,
  };
}

function readNonCoreUnit(
  candidate: unknown,
  provenanceId: string,
  coreIds: ReadonlySet<CountryId>,
): WorldUnitMetadata | null {
  if (!isRecord(candidate) || hasReservedObjectKey(candidate)) {
    return null;
  }

  const id = readStableId(candidate.id);
  const name = readNonEmptyString(candidate.name);
  const sourceFeatureId = readStableId(candidate.sourceId);
  const sourceType = readNonEmptyString(candidate.sourceType);
  const hasNeutralParent = candidate.parentCoreId === null;
  const colorOwnerId = hasNeutralParent
    ? null
    : readStableId(candidate.parentCoreId);
  const expectedColorPolicy = hasNeutralParent ? 'neutral' : 'inherit-parent';
  if (
    id === null ||
    name === null ||
    sourceFeatureId === null ||
    sourceType === null ||
    (!hasNeutralParent && colorOwnerId === null) ||
    candidate.isSelectable !== false ||
    candidate.colorPolicy !== expectedColorPolicy ||
    (colorOwnerId !== null && !coreIds.has(colorOwnerId))
  ) {
    return null;
  }

  return {
    sceneId: id,
    sourceFeatureId,
    entityId: id,
    colorOwnerId,
    isSelectable: false,
    interactionMode:
      colorOwnerId !== null
        ? 'inherited-dependency'
        : sourceType === 'Disputed'
          ? 'disputed'
          : 'neutral',
    boundaryMode: 'modern',
    provenanceId,
    name,
  };
}

function validateWorldManifest(input: unknown): ManifestValidationResult {
  if (
    !isRecord(input) ||
    hasReservedObjectKey(input) ||
    !hasExpectedManifestHeader(input)
  ) {
    return { ok: false };
  }

  const coreRecords = readRecordArray(input, 'coreStates', EXPECTED_CORE_COUNT);
  const nonCoreRecords = readRecordArray(
    input,
    'nonCoreUnits',
    EXPECTED_NON_CORE_COUNT,
  );
  const supplementRecords = readRecordArray(
    input,
    'supplements',
    EXPECTED_SUPPLEMENT_COUNT,
  );
  if (
    coreRecords === null ||
    nonCoreRecords === null ||
    supplementRecords === null
  ) {
    return { ok: false };
  }

  const coreUnits = coreRecords.map(readCoreUnit);
  if (coreUnits.some((unit) => unit === null)) {
    return { ok: false };
  }

  const narrowedCoreUnits = coreUnits.filter(
    (unit): unit is WorldUnitMetadata => unit !== null,
  );
  const coreIds = new Set(narrowedCoreUnits.map((unit) => unit.entityId));
  if (coreIds.size !== EXPECTED_CORE_COUNT) {
    return { ok: false };
  }

  const nonCoreUnits = nonCoreRecords.map((record) =>
    readNonCoreUnit(record, BASE_PROVENANCE_ID, coreIds),
  );
  const supplementUnits = supplementRecords.map((record) =>
    readNonCoreUnit(record, SUPPLEMENT_PROVENANCE_ID, coreIds),
  );
  if (
    nonCoreUnits.some((unit) => unit === null) ||
    supplementUnits.some((unit) => unit === null)
  ) {
    return { ok: false };
  }

  const allUnits = [
    ...narrowedCoreUnits,
    ...nonCoreUnits.filter((unit): unit is WorldUnitMetadata => unit !== null),
    ...supplementUnits.filter((unit): unit is WorldUnitMetadata => unit !== null),
  ];
  const unitsById = new Map<string, WorldUnitMetadata>();
  for (const unit of allUnits) {
    if (unitsById.has(unit.sceneId)) {
      return { ok: false };
    }
    unitsById.set(unit.sceneId, unit);
  }
  if (unitsById.size !== EXPECTED_RUNTIME_UNIT_COUNT) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      unitsById,
      coreIds,
      countryMetadata: narrowedCoreUnits.map((unit) => ({
        id: unit.entityId,
        name: unit.name,
      })),
    },
  };
}

function joinAssetFeature(
  candidate: unknown,
  unitsById: ReadonlyMap<string, WorldUnitMetadata>,
): unknown {
  if (!isRecord(candidate)) {
    return candidate;
  }

  const sceneId = readStableId(candidate.id);
  const metadata = sceneId === null ? undefined : unitsById.get(sceneId);
  if (
    metadata === undefined ||
    !isRecord(candidate.properties) ||
    hasReservedObjectKey(candidate.properties) ||
    candidate.properties.name !== metadata.name ||
    candidate.properties.sourceFeatureId !== metadata.sourceFeatureId ||
    candidate.properties.colorOwnerId !== metadata.colorOwnerId ||
    candidate.properties.isSelectable !== metadata.isSelectable
  ) {
    return candidate;
  }

  return {
    type: candidate.type,
    id: candidate.id,
    sourceFeatureId: metadata.sourceFeatureId,
    entityId: metadata.entityId,
    colorOwnerId: metadata.colorOwnerId,
    isSelectable: metadata.isSelectable,
    interactionMode: metadata.interactionMode,
    boundaryMode: metadata.boundaryMode,
    provenanceId: metadata.provenanceId,
    properties: { name: metadata.name },
    geometry: candidate.geometry,
  };
}

function joinWorldAsset(input: unknown, manifest: ValidWorldManifest): unknown {
  if (
    !isRecord(input) ||
    input.type !== 'FeatureCollection' ||
    !Array.isArray(input.features)
  ) {
    return input;
  }
  if (input.features.length > EXPECTED_RUNTIME_UNIT_COUNT) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: input.features.map((candidate) =>
      joinAssetFeature(candidate, manifest.unitsById),
    ),
  };
}

async function fetchPayload(
  url: string,
  signal: AbortSignal,
  source: WorldGeoDataErrorSource,
): Promise<PayloadLoadResult> {
  let response: Response;
  try {
    response = await globalThis.fetch(url, { signal });
  } catch (error: unknown) {
    if (signal.aborted) {
      throw error;
    }
    return { ok: false, reason: 'fetch-failed', source };
  }

  if (!response.ok) {
    return { ok: false, reason: 'fetch-failed', source };
  }

  try {
    return { ok: true, value: (await response.json()) as unknown };
  } catch {
    return { ok: false, reason: 'invalid-data', source };
  }
}

export async function loadWorldGeoData(
  signal: AbortSignal,
): Promise<WorldGeoDataState> {
  globalThis.performance.mark(MAP_LOAD_START_MARK);
  const [manifestPayload, worldPayload] = await Promise.all([
    fetchPayload(WORLD_MANIFEST_URL, signal, 'manifest'),
    fetchPayload(WORLD_DATA_URL, signal, 'world-asset'),
  ]);

  if (!manifestPayload.ok) {
    return {
      status: 'error',
      reason: manifestPayload.reason,
      source: manifestPayload.source,
    };
  }
  if (!worldPayload.ok) {
    return {
      status: 'error',
      reason: worldPayload.reason,
      source: worldPayload.source,
    };
  }

  const manifestResult = validateWorldManifest(manifestPayload.value);
  if (!manifestResult.ok) {
    return { status: 'error', reason: 'invalid-data', source: 'manifest' };
  }

  const normalizationResult = normalizeSceneGeoJson(
    joinWorldAsset(worldPayload.value, manifestResult.value),
  );
  if (!normalizationResult.ok) {
    return { status: 'error', reason: 'invalid-data', source: 'world-asset' };
  }

  const coreFeatures = normalizationResult.features.filter(
    (feature) => feature.interactionMode === 'modern-core',
  );
  const entityLookup = new Map<CountryId, SceneFeature>();
  const coreLookup = new Map<CountryId, SceneFeature>();
  for (const feature of normalizationResult.features) {
    entityLookup.set(feature.entityId, feature);
    if (feature.interactionMode === 'modern-core') {
      coreLookup.set(feature.entityId, feature);
    }
  }

  return {
    status: 'ready',
    features: normalizationResult.features,
    coreFeatures,
    lookup: coreLookup,
    coreLookup,
    entityLookup,
    countryMetadata: manifestResult.value.countryMetadata,
    warnings: normalizationResult.warnings,
  };
}

export function startWorldGeoDataLoad(): WorldGeoDataRequest {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    promise: loadWorldGeoData(controller.signal),
    abort: (): void => controller.abort(),
  };
}

export function useGeoData(): WorldGeoDataState {
  const [loadState, setLoadState] = useState<WorldGeoDataState>({
    status: 'loading',
  });

  useEffect((): (() => void) => {
    const request = startWorldGeoDataLoad();

    void request.promise
      .then((nextState): void => {
        if (!request.signal.aborted) {
          setLoadState(nextState);
        }
      })
      .catch((): void => {
        if (!request.signal.aborted) {
          setLoadState({
            status: 'error',
            reason: 'fetch-failed',
            source: 'world-asset',
          });
        }
      });

    return request.abort;
  }, []);

  return loadState;
}
