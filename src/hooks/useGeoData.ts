import { useEffect, useState } from 'react';

import type {
  CountryId,
  GeoJsonWarning,
  SceneFeature,
} from '../types/map';
import {
  DEFAULT_EDITOR_ASSET_URLS,
  type EditorAssetUrls,
} from '../config/editorConfig';
import { useEditorConfig } from '../providers/EditorConfigProvider';
import {
  normalizeBorderMesh,
  normalizeSceneGeoJson,
  type BorderMesh,
} from '../utils/geojson';
import { normalizeStableCountryId } from '../utils/countryIds';

/**
 * The standalone app's asset URLs, derived in `config/editorConfig.ts` - the
 * single production home for the base path. These two exports stay for the
 * callers that name them; the loader below takes the URLs as a parameter, so a
 * host that mounts `MapEditor` with its own base path is fetched from there.
 */
export const WORLD_MANIFEST_URL = DEFAULT_EDITOR_ASSET_URLS.worldManifestUrl;
export const WORLD_DATA_URL = DEFAULT_EDITOR_ASSET_URLS.worldDataUrl;
export const WORLD_BORDERS_URL = DEFAULT_EDITOR_ASSET_URLS.worldBordersUrl;

const MAP_LOAD_START_MARK = 'countriesirl-map-load-start';
const EXPECTED_MANIFEST_SCHEMA_VERSION = 1;
const EXPECTED_NATURAL_EARTH_VERSION = '5.1.1';
const EXPECTED_CORE_COUNT = 195;
/**
 * D4-10: two counts that mean different things and are never interchangeable.
 * 195 is core states - 193 UN member states plus the Holy See and the State of
 * Palestine - and that definition did not move. 207 is how many units a creator
 * can paint: the 195 plus the twelve that own their own color.
 */
const EXPECTED_SELF_COLORABLE_COUNT = 12;
const EXPECTED_SELECTABLE_COUNT =
  EXPECTED_CORE_COUNT + EXPECTED_SELF_COLORABLE_COUNT;
const SELF_COLORABLE_POLICY = 'self-colorable';
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
  /**
   * `interiorBorderMesh.geometryCount` (`04-06`). Carried from the manifest
   * rather than declared here so the mesh artifact and its provenance record
   * are checked AGAINST EACH OTHER at load time: editing one to agree with a
   * constant in this file would not be enough.
   */
  readonly borderMeshGeometryCount: number;
}

type ManifestValidationResult =
  | { readonly ok: true; readonly value: ValidWorldManifest }
  | { readonly ok: false };

type WorldGeoDataErrorSource = 'manifest' | 'world-asset';

/**
 * The mesh is a THIRD payload with its own source tag, and it is deliberately
 * NOT a member of `WorldGeoDataErrorSource`: a mesh that fails to arrive or
 * fails validation leaves the map fully usable minus its interior lines, so it
 * can never produce the fatal error state. Typing it separately is what keeps
 * that non-fatality visible in the types rather than only in a comment.
 */
type BorderMeshPayloadSource = 'border-mesh';

export type WorldGeoDataState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly features: ReadonlyArray<SceneFeature>;
      readonly coreFeatures: ReadonlyArray<SceneFeature>;
      readonly lookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly coreLookup: ReadonlyMap<CountryId, SceneFeature>;
      /**
       * The 207 units a creator can paint (D4-10) - the 195 in `coreLookup`
       * plus the twelve self-colorable ones. `coreLookup` still means core
       * states and is still 195; Locate reads this one so the twelve are
       * findable by name.
       */
      readonly colorableLookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly entityLookup: ReadonlyMap<CountryId, SceneFeature>;
      readonly countryMetadata: ReadonlyArray<WorldCountryMetadata>;
      readonly warnings: ReadonlyArray<GeoJsonWarning>;
      /**
       * `04-06`'s derived interior-border mesh, validated against the count the
       * manifest declares. `null` when it did not arrive or did not validate:
       * the map still renders, without the lines BETWEEN countries.
       */
      readonly borderMesh: BorderMesh | null;
      readonly borderMeshWarnings: ReadonlyArray<GeoJsonWarning>;
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

type PayloadLoadResult<
  Source extends WorldGeoDataErrorSource | BorderMeshPayloadSource,
> =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly reason: 'fetch-failed' | 'invalid-data';
      readonly source: Source;
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
    policy.selfColorableCount !== EXPECTED_SELF_COLORABLE_COUNT ||
    policy.selectableCount !== EXPECTED_SELECTABLE_COUNT ||
    policy.runtimeUnitCount !== EXPECTED_RUNTIME_UNIT_COUNT ||
    policy.coreSelectable !== true ||
    policy.selfColorableSelectable !== true ||
    policy.inheritParentSelectable !== false ||
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

/**
 * `interiorBorderMesh.geometryCount` from the manifest (`04-06`).
 *
 * It is REQUIRED, not optional: `04-09` renders the mesh, so a manifest without
 * the record is not the approved manifest for this build and the pair should be
 * refused rather than silently rendered without interior borders.
 *
 * The `rootType` is checked here too, because `04-RESEARCH` called the artifact
 * a collection of `LineString`s and it is not one — the manifest states
 * `GeometryCollection` and `normalizeBorderMesh` refuses anything else, so the
 * two ends of the contract are asserted rather than assumed to agree.
 */
function readBorderMeshGeometryCount(
  manifest: Record<string, unknown>,
): number | null {
  const record = manifest.interiorBorderMesh;
  if (
    !isRecord(record) ||
    hasReservedObjectKey(record) ||
    record.rootType !== 'GeometryCollection'
  ) {
    return null;
  }

  const count = record.geometryCount;
  return typeof count === 'number' && Number.isInteger(count) && count > 0
    ? count
    : null;
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
  if (
    id === null ||
    name === null ||
    sourceFeatureId === null ||
    sourceType === null
  ) {
    return null;
  }

  // D4-10, the third branch. It reaches this point through the same
  // `hasReservedObjectKey` guard as every other record, and its owner is its
  // own id - never a core id - so it can never borrow a core state's color.
  if (candidate.colorPolicy === SELF_COLORABLE_POLICY) {
    const selfOwnerId = readStableId(candidate.parentCoreId);
    if (selfOwnerId !== id || candidate.isSelectable !== true) {
      return null;
    }

    return {
      sceneId: id,
      sourceFeatureId,
      entityId: id,
      colorOwnerId: id,
      isSelectable: true,
      interactionMode: SELF_COLORABLE_POLICY,
      boundaryMode: 'modern',
      provenanceId,
      name,
    };
  }

  const hasNeutralParent = candidate.parentCoreId === null;
  const colorOwnerId = hasNeutralParent
    ? null
    : readStableId(candidate.parentCoreId);
  const expectedColorPolicy = hasNeutralParent ? 'neutral' : 'inherit-parent';
  if (
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

  const borderMeshGeometryCount = readBorderMeshGeometryCount(input);
  if (borderMeshGeometryCount === null) {
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

  // The browsable catalog is the colorable set, not the core set (D4-10):
  // 195 core states plus the twelve that own their own color. Counted here so
  // a manifest that declares 207 but yields a different number is refused
  // rather than quietly shipping a shorter country list.
  const colorableUnits = allUnits.filter((unit) => unit.isSelectable);
  if (colorableUnits.length !== EXPECTED_SELECTABLE_COUNT) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      unitsById,
      coreIds,
      borderMeshGeometryCount,
      countryMetadata: colorableUnits.map((unit) => ({
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

async function fetchPayload<
  Source extends WorldGeoDataErrorSource | BorderMeshPayloadSource,
>(
  url: string,
  signal: AbortSignal,
  source: Source,
): Promise<PayloadLoadResult<Source>> {
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
  assetUrls: EditorAssetUrls = DEFAULT_EDITOR_ASSET_URLS,
): Promise<WorldGeoDataState> {
  globalThis.performance.mark(MAP_LOAD_START_MARK);
  const [manifestPayload, worldPayload, borderMeshPayload] = await Promise.all([
    fetchPayload(assetUrls.worldManifestUrl, signal, 'manifest'),
    fetchPayload(assetUrls.worldDataUrl, signal, 'world-asset'),
    // Same-origin, same `dataBasePath` prop, no new fetch surface and no
    // absolute URL. Fetched in parallel because it is independent of the other
    // two; validated below, once the manifest has yielded its declared count.
    fetchPayload(assetUrls.worldBordersUrl, signal, 'border-mesh'),
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

  /*
   * NON-FATAL by design, and the map is the reason: a missing or malformed mesh
   * costs the creator the lines BETWEEN countries, not the map. Refusing the
   * whole load would turn a decorative degradation into a blank editor. The
   * malformed members are skipped with warnings rather than throwing, matching
   * the feature loader's contract exactly.
   */
  const borderMeshResult = borderMeshPayload.ok
    ? normalizeBorderMesh(
        borderMeshPayload.value,
        manifestResult.value.borderMeshGeometryCount,
      )
    : null;

  const coreFeatures = normalizationResult.features.filter(
    (feature) => feature.interactionMode === 'modern-core',
  );
  const entityLookup = new Map<CountryId, SceneFeature>();
  const coreLookup = new Map<CountryId, SceneFeature>();
  const colorableLookup = new Map<CountryId, SceneFeature>();
  for (const feature of normalizationResult.features) {
    entityLookup.set(feature.entityId, feature);
    if (feature.interactionMode === 'modern-core') {
      coreLookup.set(feature.entityId, feature);
    }
    if (
      feature.interactionMode === 'modern-core' ||
      feature.interactionMode === SELF_COLORABLE_POLICY
    ) {
      colorableLookup.set(feature.entityId, feature);
    }
  }

  return {
    status: 'ready',
    features: normalizationResult.features,
    coreFeatures,
    lookup: coreLookup,
    coreLookup,
    colorableLookup,
    entityLookup,
    countryMetadata: manifestResult.value.countryMetadata,
    warnings: normalizationResult.warnings,
    borderMesh:
      borderMeshResult !== null && borderMeshResult.ok
        ? borderMeshResult.mesh
        : null,
    borderMeshWarnings: borderMeshResult === null ? [] : borderMeshResult.warnings,
  };
}

export function startWorldGeoDataLoad(
  assetUrls: EditorAssetUrls = DEFAULT_EDITOR_ASSET_URLS,
): WorldGeoDataRequest {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    promise: loadWorldGeoData(controller.signal, assetUrls),
    abort: (): void => controller.abort(),
  };
}

export function useGeoData(): WorldGeoDataState {
  // Transition-readiness (c): where the world asset lives arrives through
  // `MapEditor`'s props boundary. The default is the standalone app's path, so
  // nothing changes for the app that shipped.
  const { assetUrls } = useEditorConfig();
  const [loadState, setLoadState] = useState<WorldGeoDataState>({
    status: 'loading',
  });

  useEffect((): (() => void) => {
    const request = startWorldGeoDataLoad(assetUrls);

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
  }, [assetUrls]);

  return loadState;
}
