import { useCallback, useEffect, useState } from 'react';

import type {
  HistoricalRegionId,
  HistoricalSnapshotId,
  SnapshotId,
  SnapshotManifestEntry,
  SnapshotSourceRecord,
} from '../types/composition';
import type { SceneFeature } from '../types/map';
import {
  calculateSha256,
  HISTORICAL_SNAPSHOT_DATES,
  isProductionSelectableSnapshot,
  validateHistoricalAsset,
} from '../utils/historicalValidation';

const SNAPSHOT_LOAD_START_PREFIX = 'countriesirl-snapshot-load-start-';
const SNAPSHOT_READY_MARK_PREFIX = 'countriesirl-snapshot-ready-mark-';
export const SNAPSHOT_READY_MEASURE_PREFIX = 'countriesirl-snapshot-ready-';

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

export type SnapshotDataState =
  | {
      readonly status: 'idle';
      readonly current: null;
    }
  | {
      readonly status: 'loading';
      readonly requestedSnapshotId: HistoricalSnapshotId;
      readonly current: ReviewedSnapshotData | null;
    }
  | {
      readonly status: 'ready';
      readonly current: ReviewedSnapshotData;
    }
  | {
      readonly status: 'error';
      readonly requestedSnapshotId: HistoricalSnapshotId;
      readonly reason: SnapshotDataErrorReason;
      readonly current: ReviewedSnapshotData | null;
    };

export interface UseSnapshotDataResult {
  readonly state: SnapshotDataState;
  retry(): void;
}

interface SnapshotCacheEntry {
  readonly sha256: string;
  readonly data: ReviewedSnapshotData;
}

interface SnapshotRequest {
  readonly snapshotId: SnapshotId;
  readonly entries: ReadonlyArray<SnapshotManifestEntry>;
}

interface SnapshotAssetEnvelope {
  readonly snapshotId?: unknown;
  readonly asOf?: unknown;
}

class SnapshotLoadError extends Error {
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

function markSnapshotStart(snapshotId: HistoricalSnapshotId): string {
  const markName = `${SNAPSHOT_LOAD_START_PREFIX}${snapshotId}`;
  globalThis.performance.clearMarks(markName);
  globalThis.performance.mark(markName);
  return markName;
}

function markSnapshotReady(
  snapshotId: HistoricalSnapshotId,
  startMark: string,
  isWarm: boolean,
): void {
  const readyMark = `${SNAPSHOT_READY_MARK_PREFIX}${snapshotId}`;
  const measureName = `${SNAPSHOT_READY_MEASURE_PREFIX}${snapshotId}${
    isWarm ? '-warm' : '-network'
  }`;
  globalThis.performance.clearMarks(readyMark);
  globalThis.performance.clearMeasures(measureName);
  globalThis.performance.mark(readyMark);
  globalThis.performance.measure(measureName, {
    start: startMark,
    end: readyMark,
  });
}

function isHistoricalSnapshotId(value: SnapshotId): value is HistoricalSnapshotId {
  return value !== 'modern';
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

export function clearSnapshotDataCache(): void {
  snapshotCache.clear();
}

export class SnapshotDataLoader {
  private state: SnapshotDataState = { status: 'idle', current: null };
  private readonly listeners = new Set<(state: SnapshotDataState) => void>();
  private activeController: AbortController | null = null;
  private requestVersion = 0;
  private disposed = false;
  private lastRequest: SnapshotRequest | null = null;

  constructor(private readonly fetcher: SnapshotFetch = defaultSnapshotFetch) {}

  getState(): SnapshotDataState {
    return this.state;
  }

  subscribe(listener: (state: SnapshotDataState) => void): () => void {
    if (this.disposed) {
      return (): void => undefined;
    }
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  load(
    snapshotId: SnapshotId,
    entries: ReadonlyArray<SnapshotManifestEntry>,
  ): void {
    if (this.disposed) {
      return;
    }
    this.lastRequest = { snapshotId, entries };
    this.requestVersion += 1;
    const version = this.requestVersion;
    this.activeController?.abort();
    this.activeController = null;

    if (!isHistoricalSnapshotId(snapshotId)) {
      this.updateState({ status: 'idle', current: null });
      return;
    }

    const entry = entries.find((candidate) => candidate.id === snapshotId);
    if (entry === undefined) {
      this.updateState({
        status: 'error',
        requestedSnapshotId: snapshotId,
        reason: 'not-found',
        current: this.currentData(),
      });
      return;
    }
    if (!isProductionSelectableSnapshot(entry)) {
      this.updateState({
        status: 'error',
        requestedSnapshotId: snapshotId,
        reason: 'not-approved',
        current: this.currentData(),
      });
      return;
    }

    const reviewedEntry = entry as SnapshotManifestEntry & {
      readonly id: HistoricalSnapshotId;
    };
    const startMark = markSnapshotStart(snapshotId);
    const cached = snapshotCache.get(snapshotId);
    if (cached?.sha256 === reviewedEntry.sha256) {
      this.updateState({ status: 'ready', current: cached.data });
      markSnapshotReady(snapshotId, startMark, true);
      return;
    }
    if (cached !== undefined) {
      snapshotCache.delete(snapshotId);
    }

    const controller = new AbortController();
    this.activeController = controller;
    this.updateState({
      status: 'loading',
      requestedSnapshotId: snapshotId,
      current: this.currentData(),
    });

    void loadReviewedSnapshot(reviewedEntry, this.fetcher, controller.signal)
      .then((data): void => {
        if (
          this.disposed ||
          controller.signal.aborted ||
          version !== this.requestVersion
        ) {
          return;
        }
        snapshotCache.set(snapshotId, {
          sha256: reviewedEntry.sha256,
          data,
        });
        this.activeController = null;
        this.updateState({ status: 'ready', current: data });
        markSnapshotReady(snapshotId, startMark, false);
      })
      .catch((error: unknown): void => {
        if (
          this.disposed ||
          controller.signal.aborted ||
          version !== this.requestVersion
        ) {
          return;
        }
        this.activeController = null;
        this.updateState({
          status: 'error',
          requestedSnapshotId: snapshotId,
          reason:
            error instanceof SnapshotLoadError ? error.reason : 'fetch-failed',
          current: this.currentData(),
        });
      });
  }

  retry(): void {
    if (this.lastRequest !== null && !this.disposed) {
      this.load(this.lastRequest.snapshotId, this.lastRequest.entries);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.requestVersion += 1;
    this.activeController?.abort();
    this.activeController = null;
    this.listeners.clear();
  }

  private currentData(): ReviewedSnapshotData | null {
    return this.state.current;
  }

  private updateState(state: SnapshotDataState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export function useSnapshotData(
  snapshotId: SnapshotId,
  entries: ReadonlyArray<SnapshotManifestEntry>,
): UseSnapshotDataResult {
  const [loader] = useState(() => new SnapshotDataLoader());
  const [state, setState] = useState<SnapshotDataState>({
    status: 'idle',
    current: null,
  });

  useEffect(() => loader.subscribe(setState), [loader]);
  useEffect((): void => {
    loader.load(snapshotId, entries);
  }, [entries, loader, snapshotId]);
  useEffect(
    () => (): void => {
      loader.dispose();
    },
    [loader],
  );

  const retry = useCallback((): void => loader.retry(), [loader]);
  return { state, retry };
}
