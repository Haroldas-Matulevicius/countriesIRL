import type {
  EffectiveScene,
  HistoricalRegionId,
  HistoricalSnapshotId,
  SnapshotId,
  SnapshotManifestEntry,
  SnapshotSourceRecord,
} from '../types/composition';
import type { SceneFeature } from '../types/map';
import { SNAPSHOT_MANIFEST_URL } from '../constants/snapshots';
import {
  calculateSha256,
  HISTORICAL_SNAPSHOT_DATES,
  isProductionSelectableSnapshot,
  validateHistoricalAsset,
  validateSnapshotManifest,
} from './historicalValidation';
import { composeEffectiveScene } from './scene';

export type SnapshotFetch = (
  input: RequestInfo | URL,
  init: { readonly signal: AbortSignal },
) => Promise<Response>;

export interface ReviewedSnapshotData {
  readonly snapshotId: HistoricalSnapshotId;
  readonly asOf: string;
  readonly label: string;
  readonly features: ReadonlyArray<SceneFeature>;
  readonly replacedModernSourceFeatureIds: ReadonlySet<string>;
  readonly coverageRegions: ReadonlyArray<HistoricalRegionId>;
  readonly fallbackLabel: string;
  readonly sourceRecords: ReadonlyArray<SnapshotSourceRecord>;
  readonly warnings: ReadonlyArray<string>;
  readonly sha256: string;
}

export type SnapshotDataErrorReason =
  | 'not-found'
  | 'not-approved'
  | 'fetch-failed'
  | 'hash-mismatch'
  | 'invalid-data';

interface SnapshotCacheEntry {
  readonly sha256: string;
  readonly data: ReviewedSnapshotData;
}

interface SnapshotAssetEnvelope {
  readonly snapshotId?: unknown;
  readonly asOf?: unknown;
}

export class SnapshotLoadError extends Error {
  readonly reason: SnapshotDataErrorReason;

  constructor(reason: SnapshotDataErrorReason) {
    super(reason);
    this.reason = reason;
  }
}

const snapshotCache = new Map<HistoricalSnapshotId, SnapshotCacheEntry>();

function defaultSnapshotFetch(
  input: RequestInfo | URL,
  init: { readonly signal: AbortSignal },
): Promise<Response> {
  return globalThis.fetch(input, init);
}

function readAssetEnvelope(value: unknown): SnapshotAssetEnvelope | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : null;
}

async function loadReviewedSnapshot(
  entry: SnapshotManifestEntry & { readonly id: HistoricalSnapshotId },
  fetcher: SnapshotFetch,
  signal: AbortSignal,
): Promise<ReviewedSnapshotData> {
  let response: Response;
  try {
    response = await fetcher(entry.assetPath, { signal });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new SnapshotLoadError('fetch-failed');
  }
  if (!response.ok) {
    throw new SnapshotLoadError('fetch-failed');
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if ((await calculateSha256(bytes)) !== entry.sha256) {
    throw new SnapshotLoadError('hash-mismatch');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SnapshotLoadError('invalid-data');
  }
  const envelope = readAssetEnvelope(payload);
  if (
    envelope === null ||
    envelope.snapshotId !== entry.id ||
    envelope.asOf !== HISTORICAL_SNAPSHOT_DATES[entry.id]
  ) {
    throw new SnapshotLoadError('invalid-data');
  }

  const validation = validateHistoricalAsset(payload);
  if (!validation.ok) {
    throw new SnapshotLoadError('invalid-data');
  }

  return {
    snapshotId: entry.id,
    asOf: entry.asOf,
    label: entry.label,
    features: validation.value.features,
    replacedModernSourceFeatureIds:
      validation.value.replacedModernSourceFeatureIds,
    coverageRegions: [...entry.coverageRegions],
    fallbackLabel: entry.fallbackLabel,
    sourceRecords: [...entry.sourceRecords],
    warnings: validation.value.warnings,
    sha256: entry.sha256,
  };
}

export async function resolveEffectiveSnapshotScene(
  snapshotId: SnapshotId,
  modernFeatures: ReadonlyArray<SceneFeature>,
  signal: AbortSignal,
  fetcher: SnapshotFetch = defaultSnapshotFetch,
): Promise<EffectiveScene> {
  if (snapshotId === 'modern') {
    return composeEffectiveScene({ snapshotId, modernFeatures });
  }

  const manifestResponse = await fetcher(SNAPSHOT_MANIFEST_URL, { signal });
  if (!manifestResponse.ok) {
    throw new SnapshotLoadError('fetch-failed');
  }

  let manifestPayload: unknown;
  try {
    manifestPayload = (await manifestResponse.json()) as unknown;
  } catch {
    throw new SnapshotLoadError('invalid-data');
  }
  const manifestResult = validateSnapshotManifest(manifestPayload);
  if (!manifestResult.ok) {
    throw new SnapshotLoadError('invalid-data');
  }

  const entry = manifestResult.value.snapshots.find(
    (candidate): boolean => candidate.id === snapshotId,
  );
  if (
    entry === undefined ||
    entry.id === 'modern' ||
    !isProductionSelectableSnapshot(entry)
  ) {
    throw new SnapshotLoadError('not-approved');
  }

  const reviewedEntry = entry as SnapshotManifestEntry & {
    readonly id: HistoricalSnapshotId;
  };
  const cached = snapshotCache.get(reviewedEntry.id);
  const historicalData =
    cached?.sha256 === reviewedEntry.sha256
      ? cached.data
      : await loadReviewedSnapshot(reviewedEntry, fetcher, signal);
  snapshotCache.set(reviewedEntry.id, {
    sha256: reviewedEntry.sha256,
    data: historicalData,
  });

  const scene = composeEffectiveScene({
    snapshotId,
    modernFeatures,
    historicalFeatures: historicalData.features,
    replacedModernSourceFeatureIds:
      historicalData.replacedModernSourceFeatureIds,
  });

  // `validateHistoricalAsset` skips duplicate/malformed entries and continues.
  // Keep those warnings attached to the scene so the load path can tell the
  // user the map was repaired rather than discarding them here.
  return historicalData.warnings.length === 0
    ? scene
    : { ...scene, assetWarnings: historicalData.warnings };
}

// Test support only: the module-level cache would otherwise leak between tests.
export function clearSnapshotDataCache(): void {
  snapshotCache.clear();
}
