import { describe, expect, it, vi } from 'vitest';

import { HISTORICAL_REGION_IDS } from '../constants/snapshots';
import type { SnapshotManifestEntry } from '../types/composition';
import type { SceneFeature } from '../types/map';
import {
  SnapshotLoadError,
  clearSnapshotDataCache,
  resolveEffectiveSnapshotScene,
  type SnapshotFetch,
} from './snapshotScene';

const encoder = new TextEncoder();
const TEST_RING = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

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

function responseFromBytes(bytes: Uint8Array, status = 200): Response {
  return new Response(Uint8Array.from(bytes), { status });
}

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

function createManifestFetcher(
  entries: ReadonlyArray<SnapshotManifestEntry | typeof MODERN_MANIFEST_ENTRY>,
  assetBytes: Uint8Array,
): SnapshotFetch {
  return async (input) =>
    String(input).endsWith('index.json')
      ? new Response(
          JSON.stringify({ version: 1, snapshots: entries }),
          { status: 200 },
        )
      : responseFromBytes(assetBytes);
}

async function resolveReason(
  fetcher: SnapshotFetch,
): Promise<string | null> {
  try {
    await resolveEffectiveSnapshotScene(
      '1700',
      [createModernFeature()],
      new AbortController().signal,
      fetcher,
    );
    return null;
  } catch (error) {
    return error instanceof SnapshotLoadError ? error.reason : 'unexpected';
  }
}

describe('resolveEffectiveSnapshotScene refusal paths', (): void => {
  it('refuses a manifest without the requested snapshot as not-approved', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const fetcher = createManifestFetcher([MODERN_MANIFEST_ENTRY], bytes);
    expect(await resolveReason(fetcher)).toBe('not-approved');
  });

  it.each(['draft', 'source-reviewed'] as const)(
    'refuses a %s entry before fetching its asset',
    async (reviewStatus): Promise<void> => {
      clearSnapshotDataCache();
      const bytes = createAsset('1700');
      const entry = await createEntry('1700', bytes, reviewStatus);
      const assetFetch = vi.fn<SnapshotFetch>();
      const fetcher: SnapshotFetch = async (input, init) =>
        String(input).endsWith('index.json')
          ? new Response(
              JSON.stringify({
                version: 1,
                snapshots: [MODERN_MANIFEST_ENTRY, entry],
              }),
              { status: 200 },
            )
          : assetFetch(input, init);

      expect(await resolveReason(fetcher)).toBe('not-approved');
      expect(assetFetch).not.toHaveBeenCalled();
    },
  );

  it('refuses a stale manifest hash without committing data', async (): Promise<void> => {
    clearSnapshotDataCache();
    const bytes = createAsset('1700');
    const entry = {
      ...(await createEntry('1700', bytes)),
      sha256: 'a'.repeat(64),
    };
    const fetcher = createManifestFetcher(
      [MODERN_MANIFEST_ENTRY, entry],
      bytes,
    );
    expect(await resolveReason(fetcher)).toBe('hash-mismatch');
  });

  it('composes the modern scene without touching the network', async (): Promise<void> => {
    const fetcher = vi.fn<SnapshotFetch>();
    const scene = await resolveEffectiveSnapshotScene(
      'modern',
      [createModernFeature()],
      new AbortController().signal,
      fetcher,
    );
    expect(scene.snapshotId).toBe('modern');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('resolveEffectiveSnapshotScene warning propagation', (): void => {
  it('carries dropped historical entries onto the scene instead of discarding them', async (): Promise<void> => {
    clearSnapshotDataCache();
    const warn = vi
      .spyOn(globalThis.console, 'warn')
      .mockImplementation(() => undefined);
    const bytes = createAsset('1700', true);
    const entry = await createEntry('1700', bytes);
    const fetcher = createManifestFetcher(
      [MODERN_MANIFEST_ENTRY, entry],
      bytes,
    );

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
    const fetcher = createManifestFetcher(
      [MODERN_MANIFEST_ENTRY, entry],
      bytes,
    );

    const scene = await resolveEffectiveSnapshotScene(
      '1700',
      [createModernFeature()],
      new AbortController().signal,
      fetcher,
    );

    expect(scene.assetWarnings).toBeUndefined();
  });
});
