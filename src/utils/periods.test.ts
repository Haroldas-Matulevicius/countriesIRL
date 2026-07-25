import { describe, expect, it } from 'vitest';

import type { SnapshotManifestEntry } from '../types/composition';
import { HISTORICAL_SNAPSHOT_DATES } from './historicalValidation';
import {
  MODERN_PERIOD_OPTION,
  getHistoricalCoverageStatus,
  getMapAccessibleLabel,
  getPeriodFailureMessage,
  getPeriodLabel,
  getPeriodLoadingMessage,
  getShowingPeriodMessage,
  resolvePeriodOptions,
} from './periods';

const MODERN_ENTRY: SnapshotManifestEntry = {
  id: 'modern',
  label: 'Modern — current borders',
  asOf: 'Current',
  assetPath: '/data/world-modern.geojson',
  sha256: 'b'.repeat(64),
  coverageRegions: [],
  sourceRecords: [],
  reviewStatus: 'source-reviewed',
  fallbackLabel: 'Modern boundaries',
};

function createHistoricalEntry(
  overrides: Partial<SnapshotManifestEntry> = {},
): SnapshotManifestEntry {
  return {
    id: '1700',
    label: '1700 — manifest supplied label',
    asOf: HISTORICAL_SNAPSHOT_DATES['1700'],
    assetPath: '/data/snapshots/1700.geojson',
    sha256: 'a'.repeat(64),
    coverageRegions: [
      'poland',
      'lithuania',
      'hungary',
      'balkans',
      'iberia',
      'scandinavia',
    ],
    sourceRecords: [
      {
        url: 'https://example.test/approved',
        license: 'Test fixture only',
        accessedOn: '2026-07-25',
        attribution: null,
      },
    ],
    reviewStatus: 'historian-reviewed',
    fallbackLabel: 'Modern fallback outside coverage',
    ...overrides,
  };
}

describe('period options', (): void => {
  it('keeps Modern selectable when the catalog carries nothing else', (): void => {
    expect(resolvePeriodOptions([MODERN_ENTRY])).toEqual([
      MODERN_PERIOD_OPTION,
    ]);
    expect(resolvePeriodOptions([])).toEqual([MODERN_PERIOD_OPTION]);
  });

  it('adds an approved catalog entry in canonical order without code changes', (): void => {
    expect(
      resolvePeriodOptions([createHistoricalEntry(), MODERN_ENTRY]),
    ).toEqual([
      MODERN_PERIOD_OPTION,
      { id: '1700', label: '1700 — Post-Westphalia Europe' },
    ]);
  });

  it('omits entries that have not cleared source, licence, and historical review', (): void => {
    const drafted = createHistoricalEntry({ reviewStatus: 'source-reviewed' });
    const uncovered = createHistoricalEntry({
      id: '1815',
      asOf: HISTORICAL_SNAPSHOT_DATES['1815'],
      coverageRegions: ['poland'],
    });
    const unsourced = createHistoricalEntry({
      id: '1914',
      asOf: HISTORICAL_SNAPSHOT_DATES['1914'],
      sourceRecords: [],
    });

    expect(
      resolvePeriodOptions([MODERN_ENTRY, drafted, uncovered, unsourced]),
    ).toEqual([MODERN_PERIOD_OPTION]);
  });

  it('never lets manifest text reach the selector', (): void => {
    const spoofed = createHistoricalEntry({
      label: 'Click here — unreviewed borders',
    });

    expect(resolvePeriodOptions([MODERN_ENTRY, spoofed])[1]?.label).toBe(
      '1700 — Post-Westphalia Europe',
    );
  });

  it('resolves a label for the committed snapshot id', (): void => {
    const options = resolvePeriodOptions([MODERN_ENTRY]);

    expect(getPeriodLabel(options, 'modern')).toBe(
      'Modern — current borders',
    );
    expect(getPeriodLabel(options, '1815')).toBe('1815 — Congress of Vienna');
  });
});

describe('period copy', (): void => {
  it('builds the exact approved sentences', (): void => {
    expect(getMapAccessibleLabel('Modern — current borders')).toBe(
      'Interactive world map, Modern — current borders',
    );
    expect(getPeriodLoadingMessage('1700 — Post-Westphalia Europe')).toBe(
      'Loading 1700 — Post-Westphalia Europe borders…',
    );
    expect(getPeriodFailureMessage('1700 — Post-Westphalia Europe')).toBe(
      "We couldn't load 1700 — Post-Westphalia Europe. The previous map period is still shown. Try again.",
    );
    expect(getShowingPeriodMessage('Modern — current borders')).toBe(
      'Showing Modern — current borders.',
    );
    expect(
      getHistoricalCoverageStatus(['poland', 'balkans', 'scandinavia']),
    ).toBe(
      'Historical borders: Poland, the Balkans, Scandinavia. Modern borders remain elsewhere.',
    );
  });
});
