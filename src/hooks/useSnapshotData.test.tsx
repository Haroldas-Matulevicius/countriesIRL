import { describe, expect, it, vi } from 'vitest';

import { HISTORICAL_REGION_IDS } from '../constants/snapshots';
import type { SnapshotManifestEntry } from '../types/composition';
import type { SceneFeature } from '../types/map';
import {
  SNAPSHOT_READY_MEASURE_PREFIX,
  SnapshotDataLoader,
  clearSnapshotDataCache,
  resolveEffectiveSnapshotScene,
  type SnapshotDataState,
  type SnapshotFetch,
} from './useSnapshotData';

const encoder = new TextEncoder();
const TEST_RING = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

interface DeferredResponse {
  readonly response: Promise<Response>;
  resolve(response: Response): void;
  reject(error: Error): void;
}

function createDeferredResponse(): DeferredResponse {
  let resolvePromise: ((response: Response) => void) | undefined;
  let rejectPromise: ((error: Error) => void) | undefined;
  const response = new Promise<Response>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    response,
    resolve(value): void {
      resolvePromise?.(value);
    },
    reject(error): void {
      rejectPromise?.(error);
    },
  };
}

function createAsset(snapshotId: '1700' | '1815', includeMalformed = false): Uint8Array {
  return encoder.encode(
    JSON.stringify({
      type: 'FeatureCollection',
      snapshotId,
      asOf: snapshotId === '1700' ? '1700-01-01' : '1815-12-31',
      replacedModernSourceFeatureIds: [`modern-${snapshotId}`],
      features: [
        {
          type: 'Feature',
          id: `historical-${snapshotId}`,
          properties: { name: `Historical ${snapshotId}` },
          geometry: { type: 'Polygon', coordinates: [TEST_RING] },
          sourceFeatureId: `historical-${snapshotId}`,
          entityId: `HIST-${snapshotId}`,
          colorOwnerId: `HIST-${snapshotId}`,
          isSelectable: true,
          interactionMode: 'historical-entity',
          provenanceId: `${snapshotId}-fixture`,
        },
        ...(includeMalformed
          ? [
              {
                type: 'Feature',
                id: '',
                properties: { name: '' },
                geometry: null,
              },
            ]
          : []),
      ],
    }),
  );
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

async function createEntry(
  snapshotId: '1700' | '1815',
  assetBytes: Uint8Array,
  reviewStatus: SnapshotManifestEntry['reviewStatus'] = 'historian-reviewed',
): Promise<SnapshotManifestEntry> {
  return {
    id: snapshotId,
    label: `${snapshotId} reviewed snapshot`,
    asOf: snapshotId === '1700' ? '1700-01-01' : '1815-12-31',
    assetPath: `/data/snapshots/${snapshotId}.geojson`,
    sha256: await sha256(assetBytes),
    coverageRegions: [...HISTORICAL_REGION_IDS],
    sourceRecords: [
      {
        url: 'https://example.test/licensed-source',
        license: 'CC0-1.0',
        accessedOn: '2026-07-24',
        attribution: null,
      },
    ],
    reviewStatus,
    fallbackLabel: 'Modern boundaries elsewhere',
  };
}

async function waitForState(
  loader: SnapshotDataLoader,
  predicate: (state: SnapshotDataState) => boolean,
): Promise<SnapshotDataState> {
  const current = loader.getState();
  if (predicate(current)) {
    return current;
  }
  return new Promise((resolve) => {
    const unsubscribe = loader.subscribe((state): void => {
      if (predicate(state)) {
        unsubscribe();
        resolve(state);
      }
    });
  });
}

function responseFromBytes(bytes: Uint8Array, status = 200): Response {
  return new Response(Uint8Array.from(bytes), { status });
}

describe('SnapshotDataLoader', (): void => {
  it('caches approved same-origin assets by ID and marks warm readiness', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const entry = await createEntry('1700', bytes);
    const fetcher = vi.fn<SnapshotFetch>(async () => responseFromBytes(bytes));
    const measure = vi.spyOn(globalThis.performance, 'measure');
    const first = new SnapshotDataLoader(fetcher);
    first.load('1700', [entry]);
    expect((await waitForState(first, ({ status }) => status === 'ready')).status).toBe(
      'ready',
    );

    const second = new SnapshotDataLoader(fetcher);
    second.load('1700', [entry]);
    const warmState = await waitForState(second, ({ status }) => status === 'ready');

    expect(fetcher).toHaveBeenCalledOnce();
    expect(warmState.status).toBe('ready');
    expect(measure).toHaveBeenCalledWith(
      `${SNAPSHOT_READY_MEASURE_PREFIX}1700-warm`,
      expect.any(Object),
    );
    measure.mockRestore();
  });

  it('aborts superseded loads and suppresses stale completion', async (): Promise<void> => {
    clearSnapshotDataCache();
    const firstBytes = createAsset('1700');
    const secondBytes = createAsset('1815');
    const firstEntry = await createEntry('1700', firstBytes);
    const secondEntry = await createEntry('1815', secondBytes);
    const firstResponse = createDeferredResponse();
    const secondResponse = createDeferredResponse();
    const signals: AbortSignal[] = [];
    const fetcher: SnapshotFetch = (input, init) => {
      signals.push(init.signal);
      return input.toString().includes('1700')
        ? firstResponse.response
        : secondResponse.response;
    };
    const loader = new SnapshotDataLoader(fetcher);

    loader.load('1700', [firstEntry, secondEntry]);
    loader.load('1815', [firstEntry, secondEntry]);
    expect(signals[0]?.aborted).toBe(true);
    secondResponse.resolve(responseFromBytes(secondBytes));
    const ready = await waitForState(
      loader,
      (state) => state.status === 'ready' && state.current?.snapshotId === '1815',
    );
    firstResponse.resolve(responseFromBytes(firstBytes));
    await Promise.resolve();

    expect(ready.current?.snapshotId).toBe('1815');
    expect(loader.getState().current?.snapshotId).toBe('1815');
  });

  it('aborts on dispose and never commits after unmount-equivalent cleanup', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const entry = await createEntry('1700', bytes);
    const deferred = createDeferredResponse();
    let signal: AbortSignal | undefined;
    const fetcher: SnapshotFetch = (_input, init) => {
      signal = init.signal;
      return deferred.response;
    };
    const listener = vi.fn();
    const loader = new SnapshotDataLoader(fetcher);
    loader.subscribe(listener);
    loader.load('1700', [entry]);

    loader.dispose();
    deferred.resolve(responseFromBytes(bytes));
    await Promise.resolve();
    await Promise.resolve();

    expect(signal?.aborted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(loader.getState().status).toBe('loading');
  });

  it('retains the previous completed scene through failure and retry', async (): Promise<void> => {
    clearSnapshotDataCache();
    const firstBytes = createAsset('1700');
    const secondBytes = createAsset('1815');
    const firstEntry = await createEntry('1700', firstBytes);
    const secondEntry = await createEntry('1815', secondBytes);
    let secondAttempt = 0;
    const fetcher: SnapshotFetch = async (input) => {
      if (input.toString().includes('1700')) {
        return responseFromBytes(firstBytes);
      }
      secondAttempt += 1;
      if (secondAttempt === 1) {
        throw new Error('offline');
      }
      return responseFromBytes(secondBytes);
    };
    const loader = new SnapshotDataLoader(fetcher);
    loader.load('1700', [firstEntry, secondEntry]);
    await waitForState(loader, ({ status }) => status === 'ready');

    loader.load('1815', [firstEntry, secondEntry]);
    expect(loader.getState().current?.snapshotId).toBe('1700');
    const failed = await waitForState(loader, ({ status }) => status === 'error');
    expect(failed.current?.snapshotId).toBe('1700');
    expect(failed.status).toBe('error');

    loader.retry();
    expect(loader.getState().current?.snapshotId).toBe('1700');
    const recovered = await waitForState(
      loader,
      (state) => state.status === 'ready' && state.current?.snapshotId === '1815',
    );
    expect(recovered.current?.snapshotId).toBe('1815');
  });

  it.each(['draft', 'source-reviewed'] as const)(
    'rejects %s entries before asset fetch',
    async (reviewStatus): Promise<void> => {
      clearSnapshotDataCache();
      const bytes = createAsset('1700');
      const entry = await createEntry('1700', bytes, reviewStatus);
      const fetcher = vi.fn<SnapshotFetch>();
      const loader = new SnapshotDataLoader(fetcher);

      loader.load('1700', [entry]);
      const rejected = await waitForState(loader, ({ status }) => status === 'error');

      expect(rejected).toEqual(
        expect.objectContaining({ status: 'error', reason: 'not-approved' }),
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('rejects unknown, blocked-shape, and stale-hash entries before committing data', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const entry = await createEntry('1700', bytes);
    const fetcher = vi.fn<SnapshotFetch>(async () => responseFromBytes(bytes));
    const loader = new SnapshotDataLoader(fetcher);

    loader.load('1914', [entry]);
    const unknown = await waitForState(loader, ({ status }) => status === 'error');
    expect(unknown.status === 'error' ? unknown.reason : null).toBe('not-found');
    expect(fetcher).not.toHaveBeenCalled();

    loader.load('1700', [{ ...entry, coverageRegions: ['poland'] }]);
    const blocked = await waitForState(loader, ({ status }) => status === 'error');
    expect(blocked.status === 'error' ? blocked.reason : null).toBe('not-approved');
    expect(fetcher).not.toHaveBeenCalled();

    loader.load('1700', [{ ...entry, sha256: 'a'.repeat(64) }]);
    const stale = await waitForState(loader, ({ status }) => status === 'error');
    expect(stale.status === 'error' ? stale.reason : null).toBe('hash-mismatch');
    expect(loader.getState().current).toBeNull();
  });

  it('preserves coverage, fallback, source, and validation warning metadata', async (): Promise<void> => {
    clearSnapshotDataCache();
    const warn = vi.spyOn(globalThis.console, 'warn').mockImplementation(() => undefined);
    const bytes = createAsset('1700', true);
    const entry = await createEntry('1700', bytes);
    const loader = new SnapshotDataLoader(async () => responseFromBytes(bytes));

    loader.load('1700', [entry]);
    const ready = await waitForState(loader, ({ status }) => status === 'ready');

    expect(ready.current).toEqual(
      expect.objectContaining({
        snapshotId: '1700',
        coverageRegions: HISTORICAL_REGION_IDS,
        fallbackLabel: 'Modern boundaries elsewhere',
        sourceRecords: entry.sourceRecords,
        warnings: ['Historical feature 1 is malformed and was skipped.'],
      }),
    );
    expect(ready.current?.features).toHaveLength(1);
    warn.mockRestore();
  });
});

const MODERN_MANIFEST_ENTRY = {
  id: 'modern',
  label: 'Modern — current borders',
  asOf: 'Current',
  assetPath: '/data/world-modern.geojson',
  sha256: 'a'.repeat(64),
  coverageRegions: [],
  sourceRecords: [],
  reviewStatus: 'source-reviewed',
  fallbackLabel: 'Modern boundaries',
};

function createModernFeature(): SceneFeature {
  return {
    type: 'Feature',
    id: 'modern-FRA',
    properties: { name: 'France' },
    geometry: { type: 'Polygon', coordinates: [TEST_RING] },
    sourceFeatureId: 'modern-FRA',
    entityId: 'FRA',
    colorOwnerId: 'FRA',
    isSelectable: true,
    interactionMode: 'modern-core',
    boundaryMode: 'modern',
    provenanceId: 'world-modern',
  };
}

describe('resolveEffectiveSnapshotScene warning propagation', (): void => {
  it('carries dropped historical entries onto the scene instead of discarding them', async (): Promise<void> => {
    clearSnapshotDataCache();
    const warn = vi
      .spyOn(globalThis.console, 'warn')
      .mockImplementation(() => undefined);
    const bytes = createAsset('1700', true);
    const entry = await createEntry('1700', bytes);
    const fetcher: SnapshotFetch = async (input) =>
      String(input).endsWith('index.json')
        ? new Response(
            JSON.stringify({
              version: 1,
              snapshots: [MODERN_MANIFEST_ENTRY, entry],
            }),
            { status: 200 },
          )
        : responseFromBytes(bytes);

    const scene = await resolveEffectiveSnapshotScene(
      '1700',
      [createModernFeature()],
      new AbortController().signal,
      fetcher,
    );

    expect(scene.assetWarnings).toEqual([
      'Historical feature 1 is malformed and was skipped.',
    ]);
    warn.mockRestore();
  });

  it('leaves the scene unannotated when nothing was dropped', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const entry = await createEntry('1700', bytes);
    const fetcher: SnapshotFetch = async (input) =>
      String(input).endsWith('index.json')
        ? new Response(
            JSON.stringify({
              version: 1,
              snapshots: [MODERN_MANIFEST_ENTRY, entry],
            }),
            { status: 200 },
          )
        : responseFromBytes(bytes);

    const scene = await resolveEffectiveSnapshotScene(
      '1700',
      [createModernFeature()],
      new AbortController().signal,
      fetcher,
    );

    expect(scene.assetWarnings).toBeUndefined();
  });
});
