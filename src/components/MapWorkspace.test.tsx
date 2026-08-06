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
        snapshotId="modern"
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
        snapshotId="modern"
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
        snapshotId="modern"
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

/**
 * Index of the `</div>` that closes the `<div>` opening at `openIndex`.
 *
 * The navigation slot's whole job is to be outside two things at once - outside
 * the export source (or it lands in every PNG) and outside the square (or it
 * lands on top of the legend). A bare "slot index is greater than square index"
 * check proves only the first, and passed for the entire time the cluster sat on
 * the square, so the second one is measured properly here.
 */
function findClosingDivIndex(markup: string, attributeIndex: number): number {
  // `attributeIndex` points at the class attribute, which is inside the tag, so
  // walk back to the `<div` that owns it before counting depth.
  const openIndex = markup.lastIndexOf('<div', attributeIndex);
  if (openIndex === -1) {
    throw new Error('The square has no opening tag.');
  }

  let depth = 0;
  let cursor = openIndex;

  while (cursor < markup.length) {
    const nextOpen = markup.indexOf('<div', cursor);
    const nextClose = markup.indexOf('</div>', cursor);

    if (nextClose === -1) {
      throw new Error('The square is never closed.');
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + '<div'.length;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return nextClose;
    }
    cursor = nextClose + '</div>'.length;
  }

  throw new Error('The square is never closed.');
}

describe('MapWorkspace navigation placement', (): void => {
  it('renders the navigation slot after the square, outside the export source', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        compositionBar={createCompositionBar()}
        snapshotId="modern"
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={[]}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        navigationSlot={<div data-navigation-slot="true" />}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    const squareIndex = markup.indexOf('class="map-workspace__canvas"');
    const slotIndex = markup.indexOf('data-navigation-slot="true"');
    // The export source holds exactly one child, the canonical SVG, so
    // `</svg></div>` is where it closes. Anything after that point cannot be
    // cloned into the PNG - which is the whole reason the slot exists here
    // instead of inside MapCanvas (UI-SPEC 10 + 14).
    const exportSourceEnd = markup.indexOf('</svg></div>');

    expect(squareIndex).toBeGreaterThanOrEqual(0);
    expect(exportSourceEnd).toBeGreaterThan(squareIndex);
    expect(slotIndex).toBeGreaterThan(exportSourceEnd);

    /*
     * And outside the square itself. As an overlay at the square's top-left the
     * cluster rendered on top of a `top-left` legend, which is the default
     * legend position. That collision cannot be fixed by moving the legend: the
     * cluster is measured in screen pixels and the legend is placed in
     * 1080-unit canvas space, so its canvas-space footprint changes with the
     * square's width and no fixed rectangle in the export's coordinate system
     * can reserve room for it.
     */
    expect(slotIndex).toBeGreaterThan(
      findClosingDivIndex(markup, squareIndex),
    );
  });

  it('renders no navigation overlay while the scene is unavailable', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        compositionBar={createCompositionBar()}
        snapshotId="modern"
        periodLabel={MODERN_PERIOD_OPTION.label}
        features={null}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        navigationSlot={<div data-navigation-slot="true" />}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    // Camera controls with no camera to drive would be controls that lie.
    expect(markup).not.toContain('data-navigation-slot="true"');
  });
});

/**
 * The declarations, byte for byte. D-24 preserves the typed slot contract
 * VERBATIM through the D-32 restructure, and "verbatim" is a claim about the
 * text - a slot quietly widened to `ReactNode | ((props) => ReactNode)` would
 * satisfy every behavioural assertion in this file.
 */
const SLOT_DECLARATIONS = [
  'legendSlot?: ReactNode;',
  'navigationSlot?: ReactNode;',
] as const;

function readSource(fileName: string): string {
  const nodeProcess = Reflect.get(globalThis, 'process') as
    | {
        getBuiltinModule: (name: 'fs') => {
          readFileSync: (path: URL, encoding: 'utf8') => string;
        };
      }
    | undefined;

  if (nodeProcess === undefined) {
    throw new Error('Expected the Vitest Node process.');
  }

  return nodeProcess
    .getBuiltinModule('fs')
    .readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8');
}

function readWorkspaceSource(): string {
  return readSource('MapWorkspace.tsx');
}

/**
 * The legend slot is modelled by the element `LegendOverlay` actually renders,
 * not by a bare marker: the composition contract is that the legend layer lands
 * inside the canonical SVG, and a fixture that drops the layer attribute would
 * be asserting about the fixture. `LegendOverlay.tsx` is read below so the
 * fixture cannot drift away from the component it stands in for.
 */
function renderReadyWorkspace(): string {
  return renderToStaticMarkup(
    <MapWorkspace
      geoData={READY_GEO_DATA}
      compositionBar={createCompositionBar()}
      snapshotId="modern"
      periodLabel={MODERN_PERIOD_OPTION.label}
      features={[]}
      colors={{}}
      selectedIds={new Set()}
      exportSourceRef={{ current: null }}
      legendSlot={<g data-layer="legend" data-legend-slot="true" />}
      navigationSlot={<div data-navigation-slot="true" />}
      onSelectCountry={vi.fn()}
      onClearSelection={vi.fn()}
      onReload={vi.fn()}
    />,
  );
}

describe('MapWorkspace export frame (D-32)', (): void => {
  it('renders the frame as a sibling of the export source, never inside it', (): void => {
    const markup = renderReadyWorkspace();

    expect(markup.match(/class="map-frame"/gu)).toHaveLength(1);

    const canvasRegionIndex = markup.indexOf('class="map-workspace__canvas"');
    const exportSourceIndex = markup.indexOf('class="map-export-source"');
    const frameIndex = markup.indexOf('class="map-frame"');

    /*
     * Depth-walked rather than keyed on `</svg></div>`. That marker only works
     * while the export source holds exactly one child, so moving the frame
     * *into* the export source would make the marker vanish and the assertion
     * fail for the wrong reason - or, with a second child, not fail at all.
     * The clone starts at `svg.map-canvas`, so where the frame sits relative to
     * this closing tag is the whole contract.
     */
    const exportSourceEnd = findClosingDivIndex(markup, exportSourceIndex);
    const canvasRegionEnd = findClosingDivIndex(markup, canvasRegionIndex);

    expect(canvasRegionIndex).toBeGreaterThanOrEqual(0);
    expect(exportSourceIndex).toBeGreaterThan(canvasRegionIndex);
    expect(frameIndex).toBeGreaterThan(exportSourceEnd);
    expect(frameIndex).toBeLessThan(canvasRegionEnd);
    expect(markup.indexOf('class="map-canvas"')).toBeLessThan(exportSourceEnd);
  });

  it('marks the frame editor-only and hides it from assistive technology', (): void => {
    const markup = renderReadyWorkspace();
    const frameTag = /<div class="map-frame"[^>]*>/u.exec(markup)?.[0] ?? '';

    expect(frameTag).toContain('data-editor-only="true"');
    expect(frameTag).toContain('aria-hidden="true"');
  });

  it('keeps the typed slot contract byte-unchanged and adds no third slot', (): void => {
    const source = readWorkspaceSource();

    SLOT_DECLARATIONS.forEach((declaration): void => {
      expect(source).toContain(declaration);
    });

    /*
     * The frame is structural chrome, not composable content. A caller that
     * could replace it could remove the creator's only signal of what the PNG
     * crops to, so it is not a slot and the slot set stays at two.
     */
    expect(
      [...source.matchAll(/^\s{2}(\w+Slot)\??:/gmu)].map(
        (match): string => match[1],
      ),
    ).toStrictEqual(['legendSlot', 'navigationSlot']);
    expect(source).not.toContain('frameSlot');
  });

  it('still renders both slots into their documented positions', (): void => {
    const markup = renderReadyWorkspace();
    const svgStart = markup.indexOf('class="map-canvas"');
    const svgEnd = markup.indexOf('</svg>', svgStart);

    // The legend renders INSIDE the canonical SVG (D-24) - a sibling is
    // silently dropped by the export clone with nothing failing.
    const legendIndex = markup.indexOf('data-legend-slot="true"');
    expect(legendIndex).toBeGreaterThan(svgStart);
    expect(legendIndex).toBeLessThan(svgEnd);

    // The navigation cluster renders outside the export source, after the
    // canvas region, so it can never reach the PNG.
    expect(markup.indexOf('data-navigation-slot="true"')).toBeGreaterThan(
      findClosingDivIndex(markup, markup.indexOf('class="map-workspace__canvas"')),
    );
  });
});

/**
 * D-24, as a regression guard rather than a description.
 *
 * The restructure in `03-05` moves containers around the canvas. Placement in
 * these two typed slots is what decides export membership - `data-editor-only`
 * is the second line of defence, not the first - so a control that drifted
 * across the boundary would keep working, keep looking right, and start
 * appearing in (or vanishing from) every exported PNG with nothing failing.
 */
describe('MapWorkspace slot contract regression guard (D-24)', (): void => {
  it('puts the legend layer inside the canonical SVG, after the camera layer', (): void => {
    const markup = renderReadyWorkspace();

    const svgStart = markup.indexOf('<svg class="map-canvas"');
    const svgEnd = markup.indexOf('</svg>', svgStart);
    const cameraLayerIndex = markup.indexOf('data-layer="camera"');
    const legendLayerIndex = markup.indexOf('data-layer="legend"');

    expect(svgStart).toBeGreaterThanOrEqual(0);
    expect(cameraLayerIndex).toBeGreaterThan(svgStart);
    expect(cameraLayerIndex).toBeLessThan(svgEnd);

    expect(
      legendLayerIndex > svgStart && legendLayerIndex < svgEnd,
      'the legend layer has to be inside the canonical SVG. The export clones ' +
        'that SVG, so a legend beside it is a silently legend-less PNG - or, ' +
        'once the refusal fires, a permanently blocked export.',
    ).toBe(true);

    /*
     * Order, not just membership. `isPreservedComposition` in `export.ts`
     * depends on the camera layer coming first, so a legend hoisted above it
     * survives every containment check above and still fails the export.
     */
    expect(
      cameraLayerIndex,
      'the camera layer precedes the legend layer; that order is the shape ' +
        'the export refusal check reads.',
    ).toBeLessThan(legendLayerIndex);
  });

  it('binds the legend fixture back to the component it stands in for', (): void => {
    // A fixture that re-implements the wiring under test can only make claims
    // about the fixture. This is the one line that ties the marker above to the
    // real overlay.
    expect(readSource('LegendOverlay.tsx')).toContain('data-layer="legend"');
  });

  it('keeps the navigation slot outside the canonical SVG entirely', (): void => {
    const markup = renderReadyWorkspace();

    const svgStart = markup.indexOf('<svg class="map-canvas"');
    const svgEnd = markup.indexOf('</svg>', svgStart);
    const navigationIndex = markup.indexOf('data-navigation-slot="true"');

    expect(navigationIndex).toBeGreaterThanOrEqual(0);
    expect(
      navigationIndex > svgStart && navigationIndex < svgEnd,
      'the camera cluster is editor-only chrome. Inside the canonical SVG it ' +
        'is cloned into every exported PNG, on top of a top-left legend.',
    ).toBe(false);
    expect(navigationIndex).toBeGreaterThan(svgEnd);
  });

  it('keeps the frame a sibling, editor-only, and not a slot', (): void => {
    const markup = renderReadyWorkspace();
    const source = readWorkspaceSource();

    const exportSourceEnd = findClosingDivIndex(
      markup,
      markup.indexOf('class="map-export-source"'),
    );
    const frameIndex = markup.indexOf('class="map-frame"');

    expect(frameIndex).toBeGreaterThan(exportSourceEnd);
    expect(/<div class="map-frame"[^>]*data-editor-only="true"/u.test(markup)).toBe(
      true,
    );
    // The frame is rendered by this component, not handed in - a caller that
    // could replace it could remove the only signal of what the PNG crops to.
    expect(source).toContain('className="map-frame"');
    expect(source).not.toContain('frameSlot');
  });
});

describe('composed workspace composition bar', (): void => {
  it('owns the only Reset View control and the exact preview and period copy', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        compositionBar={createCompositionBar()}
        snapshotId="modern"
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
