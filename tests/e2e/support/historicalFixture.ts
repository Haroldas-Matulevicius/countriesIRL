import { createHash } from 'node:crypto';

/**
 * The in-memory approved-historical snapshot the browser suites round-trip.
 *
 * It lives here, not in a spec file, because two specs drive the same scene and
 * a second hand-maintained copy of this asset could drift into asserting a
 * different snapshot than the one the app validates. No historical geometry is
 * promoted by this fixture: it is served by a Playwright route, never written to
 * `public/data`, and the catalog on disk stays Modern-only.
 */
export const HISTORICAL_ENTITY_ID = 'HIST-HRE';
export const HISTORICAL_LABEL = 'Holy Roman Empire';
export const HISTORICAL_ASSET_PATH = '/data/snapshots/1700.geojson';
export const HISTORICAL_REGIONS = [
  'poland',
  'lithuania',
  'hungary',
  'balkans',
  'iberia',
  'scandinavia',
] as const;

export interface HistoricalBrowserFixture {
  readonly assetBody: string;
  readonly manifest: Record<string, unknown>;
}

export function createHistoricalBrowserFixture(): HistoricalBrowserFixture {
  const assetBody = JSON.stringify({
    type: 'FeatureCollection',
    snapshotId: '1700',
    asOf: '1700-01-01',
    replacedModernSourceFeatureIds: ['FRA'],
    features: [
      {
        type: 'Feature',
        id: 'historical-hre-1700',
        properties: { name: HISTORICAL_LABEL },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [5, 45],
              [5, 55],
              [18, 55],
              [18, 45],
              [5, 45],
            ],
          ],
        },
        sourceFeatureId: 'historical-hre-1700',
        entityId: HISTORICAL_ENTITY_ID,
        colorOwnerId: HISTORICAL_ENTITY_ID,
        isSelectable: true,
        interactionMode: 'historical-entity',
        boundaryMode: 'historical',
        provenanceId: 'browser-fixture-1700',
      },
    ],
  });
  const sha256 = createHash('sha256').update(assetBody).digest('hex');
  return {
    assetBody,
    manifest: {
      version: 1,
      snapshots: [
        {
          id: 'modern',
          label: 'Modern — current borders',
          asOf: 'Current',
          assetPath: '/data/world-modern.geojson',
          sha256: 'a'.repeat(64),
          coverageRegions: [],
          sourceRecords: [],
          reviewStatus: 'source-reviewed',
          fallbackLabel: 'Modern boundaries',
        },
        {
          id: '1700',
          label: '1700 — Browser integration fixture',
          asOf: '1700-01-01',
          assetPath: HISTORICAL_ASSET_PATH,
          sha256,
          coverageRegions: [...HISTORICAL_REGIONS],
          sourceRecords: [
            {
              url: 'https://example.test/historical-browser-fixture',
              license: 'Test fixture only',
              accessedOn: '2026-07-24',
              attribution: null,
            },
          ],
          reviewStatus: 'historian-reviewed',
          fallbackLabel: 'Modern fallback outside fixture coverage',
        },
      ],
    },
  };
}

export function createHistoricalSavedRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Historical composition',
    timestamp: 1_700_000_000_000,
    composition: {
      colors: { [HISTORICAL_ENTITY_ID]: '#DC2626' },
      camera: {
        zoom: 2,
        centerLongitude: 11,
        centerLatitude: 50,
      },
      snapshotId: '1700',
      legend: {
        entries: [{ color: '#DC2626', label: 'Imperial lands', order: 0 }],
        position: { x: 64, y: 720, preset: null },
        theme: 'dark',
        textSize: 'large',
        backgroundOpacity: 85,
        borderStyle: 'strong',
      },
      settings: { backgroundColor: '#FFFFFF' },
    },
  };
}
