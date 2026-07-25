import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SnapshotManifestEntry } from '../types/composition';
import { HISTORICAL_SNAPSHOT_DATES } from '../utils/historicalValidation';
import {
  MODERN_PERIOD_OPTION,
  resolvePeriodOptions,
  type PeriodOption,
} from '../utils/periods';
import { CompositionBar } from './CompositionBar';
import { MapWorkspace } from './MapWorkspace';

const READY_GEO_DATA = {
  status: 'ready',
  features: [],
  coreFeatures: [],
  lookup: new Map(),
  coreLookup: new Map(),
  entityLookup: new Map(),
  countryMetadata: [],
  warnings: [],
} as const;

const MODERN_ONLY_PERIODS: ReadonlyArray<PeriodOption> = [
  MODERN_PERIOD_OPTION,
];

function createCompositionBar(
  periods: ReadonlyArray<PeriodOption> = MODERN_ONLY_PERIODS,
): JSX.Element {
  return (
    <CompositionBar
      periods={periods}
      selectedPeriodId="modern"
      statusMessage="Modern borders worldwide."
      isPeriodDisabled={false}
      isResetViewDisabled={false}
      onPeriodChange={vi.fn()}
      onResetView={vi.fn()}
    />
  );
}

function createApprovedHistoricalEntry(
  id: '1492' | '1700' | '1815' | '1914',
): SnapshotManifestEntry {
  return {
    id,
    label: `${id} — catalog supplied label that must not be shown`,
    asOf: HISTORICAL_SNAPSHOT_DATES[id],
    assetPath: `/data/snapshots/${id}.geojson`,
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
  };
}

const MODERN_MANIFEST_ENTRY: SnapshotManifestEntry = {
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

describe('MapWorkspace loading state', (): void => {
  it('renders a recognizable static map skeleton instead of generic bars', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={{ status: 'loading' }}
        compositionBar={createCompositionBar()}
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={null}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(markup).toContain('Loading world map…');
    expect(markup).not.toContain('Loading Europe map…');
    expect(markup).toContain('class="map-workspace__skeleton"');
    expect(markup).toContain('viewBox="0 0 360 240"');
    expect(markup.match(/<path\b/gu)).toHaveLength(7);
    expect(markup.match(/<circle\b/gu)).toHaveLength(2);
    expect(markup).not.toContain('<span></span>');
  });
});

describe('MapWorkspace unavailable scene', (): void => {
  it('fails closed instead of rendering the modern world for an unavailable scene', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        compositionBar={createCompositionBar()}
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={null}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Reload Map');
    expect(markup).not.toContain('svg class="map-canvas"');
  });

  it('uses the exact world recovery copy, not the Phase 1 Europe copy', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={{
          status: 'error',
          reason: 'fetch-failed',
          source: 'world-asset',
        }}
        compositionBar={createCompositionBar()}
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={null}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(markup).toContain('We couldn&#x27;t load the world map');
    expect(markup).not.toContain('Europe map');
    expect(markup).toContain(
      'Refresh the page to try the bundled map data again. Your saved maps will stay in this browser.',
    );
    expect(markup).toContain('Reload Map');
  });
});

describe('composed workspace composition bar', (): void => {
  it('owns the only Reset View control and the exact preview and period copy', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        compositionBar={createCompositionBar()}
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={[]}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(markup.match(/Reset View/gu)).toHaveLength(1);
    expect(markup).toContain('1080 × 1080 composition preview');
    expect(markup).not.toContain('1080 × 1080 PNG preview');
    expect(markup).toContain('>Map period</label>');
    expect(markup).toContain('id="map-preview-label"');
    expect(markup).toContain(
      'aria-label="Interactive world map, Modern — current borders"',
    );
  });

  it('renders exactly the live catalog options and never a deferred teaser', (): void => {
    const markup = renderToStaticMarkup(createCompositionBar());

    expect(markup.match(/<option\b/gu)).toHaveLength(1);
    expect(markup).toContain('Modern — current borders');
    ['1492', '1700', '1815', '1914'].forEach((deferredId): void => {
      expect(markup).not.toContain(`value="${deferredId}"`);
    });
    expect(markup).not.toContain('Coming soon');
  });

  it('surfaces every approved catalog entry with no component change', (): void => {
    const options = resolvePeriodOptions([
      MODERN_MANIFEST_ENTRY,
      createApprovedHistoricalEntry('1914'),
      createApprovedHistoricalEntry('1492'),
      createApprovedHistoricalEntry('1700'),
      createApprovedHistoricalEntry('1815'),
    ]);
    const markup = renderToStaticMarkup(createCompositionBar(options));

    expect(markup.match(/<option\b/gu)).toHaveLength(5);
    expect(
      Array.from(markup.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)</gu)).map(
        (match): [string, string] => [match[1] ?? '', match[2] ?? ''],
      ),
    ).toEqual([
      ['modern', 'Modern — current borders'],
      ['1492', '1492 — Early modern Europe'],
      ['1700', '1700 — Post-Westphalia Europe'],
      ['1815', '1815 — Congress of Vienna'],
      ['1914', '1914 — Before World War I'],
    ]);
    expect(markup).not.toContain('catalog supplied label');
  });

  it('offers Try Period Again only while a period load has failed', (): void => {
    const failedMarkup = renderToStaticMarkup(
      <CompositionBar
        periods={MODERN_ONLY_PERIODS}
        selectedPeriodId="modern"
        statusMessage="We couldn't load 1700 — Post-Westphalia Europe. The previous map period is still shown. Try again."
        isPeriodDisabled={false}
        isResetViewDisabled={false}
        onPeriodChange={vi.fn()}
        onResetView={vi.fn()}
        onRetryPeriod={vi.fn()}
      />,
    );

    expect(failedMarkup).toContain('Try Period Again');
    expect(failedMarkup).toContain('The previous map period is still shown.');
    expect(renderToStaticMarkup(createCompositionBar())).not.toContain(
      'Try Period Again',
    );
  });

  it('disables the period control and Reset View while the world is loading', (): void => {
    const markup = renderToStaticMarkup(
      <CompositionBar
        periods={MODERN_ONLY_PERIODS}
        selectedPeriodId="modern"
        statusMessage="Modern borders worldwide."
        isPeriodDisabled
        isResetViewDisabled
        onPeriodChange={vi.fn()}
        onResetView={vi.fn()}
      />,
    );

    expect(markup.match(/disabled=""/gu)).toHaveLength(2);
  });
});
