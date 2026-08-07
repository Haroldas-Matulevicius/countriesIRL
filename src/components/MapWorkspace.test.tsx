import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SnapshotManifestEntry } from '../types/composition';
import { HISTORICAL_SNAPSHOT_DATES } from '../utils/historicalValidation';
import {
  MODERN_PERIOD_OPTION,
  resolvePeriodOptions,
  type PeriodOption,
} from '../utils/periods';
import { PeriodHud } from './editor/PeriodHud';
import { MapNavigation } from './MapNavigation';
import { MapWorkspace } from './MapWorkspace';

const READY_GEO_DATA = {
  status: 'ready',
  features: [],
  coreFeatures: [],
  lookup: new Map(),
  coreLookup: new Map(),
  colorableLookup: new Map(),
  entityLookup: new Map(),
  countryMetadata: [],
  warnings: [],
  // 04-09: the mesh is a third payload, and it is non-fatal. A fixture with
  // none renders the map without interior lines rather than failing.
  borderMesh: null,
  borderMeshWarnings: [],
} as const;

const MODERN_ONLY_PERIODS: ReadonlyArray<PeriodOption> = [
  MODERN_PERIOD_OPTION,
];

function createPeriodHud(
  periods: ReadonlyArray<PeriodOption> = MODERN_ONLY_PERIODS,
): JSX.Element {
  return (
    <PeriodHud
      periods={periods}
      selectedPeriodId="modern"
      statusMessage="Modern borders worldwide."
      isPeriodDisabled={false}
      onPeriodChange={vi.fn()}
    />
  );
}

function createNavigationSlot(): JSX.Element {
  return (
    <MapNavigation
      currentZoom={1}
      isMoveMapOpen={false}
      onMoveMapOpenChange={vi.fn()}
      onZoomIn={vi.fn()}
      onZoomOut={vi.fn()}
      onPan={vi.fn()}
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
        periodHud={createPeriodHud()}
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
        periodHud={createPeriodHud()}
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
        periodHud={createPeriodHud()}
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
        periodHud={createPeriodHud()}
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
     * And INSIDE the canvas region, which `03-08` requires: the region is the
     * `container-type: size` box `.map-frame` measures itself against, so the
     * cluster's inset math and the frame's `min(100cqw, 100cqh)` are one shared
     * container query rather than two that happen to agree. A cluster rendered
     * as a sibling of the region resolves its `cq` units against something
     * else entirely and drifts silently.
     *
     * As an overlay at the square's top-left the cluster rendered on top of a
     * `top-left` legend, which is the default legend position. That collision
     * cannot be fixed by moving the legend: the cluster is measured in screen
     * pixels and the legend is placed in 1080-unit canvas space, so its
     * canvas-space footprint changes with the square's width and no fixed
     * rectangle in the export's coordinate system can reserve room for it. The
     * cluster is anchored in the letterbox gutter instead.
     */
    expect(slotIndex).toBeLessThan(findClosingDivIndex(markup, squareIndex));
  });

  it('renders no navigation overlay while the scene is unavailable', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        periodHud={createPeriodHud()}
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
  'helpSlot?: ReactNode;',
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
      periodHud={createPeriodHud()}
      helpSlot={<div data-testid="help-slot" />}
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
     * crops to, so it is not a slot and it never becomes one.
     *
     * `03-06` added `helpSlot` - the onboarding card and `Show Help`, which
     * D-18 pushes out of the tool panel because a first run opens with that
     * panel closed. It is asserted here as a closed, enumerated set rather than
     * as "at most two", so the next slot is a visible contract change.
     */
    expect(
      [...source.matchAll(/^\s{2}(\w+Slot)\??:/gmu)].map(
        (match): string => match[1],
      ),
    ).toStrictEqual(['helpSlot', 'legendSlot', 'navigationSlot']);
    expect(source).not.toContain('frameSlot');
  });

  /*
   * Same reason the navigation slot is guarded: the export clones
   * `svg.map-canvas`, so a slot rendered inside it would be serialised into
   * every PNG. Asserted as a boolean that CAN be true, not only as an index
   * comparison that an absent slot satisfies.
   */
  it('keeps the help slot outside the canonical SVG entirely', (): void => {
    const markup = renderReadyWorkspace();
    const svgStart = markup.indexOf('class="map-canvas"');
    const svgEnd = markup.indexOf('</svg>', svgStart);
    const helpIndex = markup.indexOf('data-testid="help-slot"');

    expect(svgStart).toBeGreaterThan(-1);
    expect(helpIndex).toBeGreaterThan(-1);
    expect(helpIndex > svgStart && helpIndex < svgEnd).toBe(false);
    expect(helpIndex).toBeGreaterThan(svgEnd);
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

    // The navigation cluster renders outside the export source but INSIDE the
    // canvas region: after `</svg></div>` it can never reach the PNG, and
    // inside the region it shares the frame's container query (`03-08`).
    const navigationIndex = markup.indexOf('data-navigation-slot="true"');
    expect(navigationIndex).toBeGreaterThan(markup.indexOf('</svg></div>'));
    expect(navigationIndex).toBeLessThan(
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

describe('composed workspace period HUD', (): void => {
  it('owns the only Reset View control and the exact preview and period copy', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={READY_GEO_DATA}
        periodHud={createPeriodHud()}
        navigationSlot={createNavigationSlot()}
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

    /*
     * D-21 moved `Reset View` out of the period HUD and into the floating
     * cluster in `03-08`. The claim the workspace still has to make is the
     * SINGLETON one, so it is counted by accessible name across the whole
     * composed region rather than by which child renders it - a second copy in
     * either child fails here.
     */
    expect(markup.match(/aria-label="Reset View"/gu)).toHaveLength(1);
    expect(markup.match(/Reset View/gu)).toHaveLength(2);
    expect(markup).not.toContain('period-hud__reset-view');

    /*
     * Placement, not an attribute, is what keeps the cluster out of the PNG:
     * it renders INSIDE the canvas region (so its inset math shares the
     * frame's container query) and AFTER `div.map-export-source`, never
     * within it. Asserting the index relationship is what a
     * `data-editor-only` check cannot do.
     */
    const exportSourceIndex = markup.indexOf('class="map-export-source"');
    const canvasRegionIndex = markup.indexOf('class="map-workspace__canvas"');
    const clusterIndex = markup.indexOf('class="map-navigation"');
    expect(canvasRegionIndex).toBeGreaterThanOrEqual(0);
    expect(exportSourceIndex).toBeGreaterThan(canvasRegionIndex);
    expect(clusterIndex).toBeGreaterThan(exportSourceIndex);
    expect(markup.slice(exportSourceIndex, clusterIndex)).toContain('</svg>');

    expect(markup).toContain('1080 × 1080 composition preview');
    expect(markup).not.toContain('1080 × 1080 PNG preview');
    expect(markup).toContain('Map period');
    expect(markup).toContain('id="map-preview-label"');
    expect(markup).toContain(
      'aria-label="Interactive world map, Modern — current borders"',
    );
  });

  /*
   * D-14: one resolved option renders as a visibly inert read-only pill, not
   * as a disabled select - no dropdown affordance, no chevron, no deferred
   * label, no count of hidden periods.
   */
  it('renders one approved option as an inert pill and never a deferred teaser', (): void => {
    const markup = renderToStaticMarkup(createPeriodHud());

    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('<option');
    expect(markup).toContain('period-hud__pill');
    expect(markup).toContain('Modern — current borders');
    [
      '1492 — Early modern Europe',
      '1700 — Post-Westphalia Europe',
      '1815 — Congress of Vienna',
      '1914 — Before World War I',
    ].forEach((deferredLabel): void => {
      expect(markup).not.toContain(deferredLabel);
    });
    expect(markup).not.toContain('Coming soon');
    expect(markup).not.toContain('chevron');
    // The pill keeps the control's accessible description wired (D-15).
    expect(markup).toContain(
      'aria-describedby="composition-bar-period-status"',
    );
    expect(markup).toContain('id="composition-bar-period-status"');
  });

  it('surfaces every approved catalog entry through the select path with no component change', (): void => {
    const options = resolvePeriodOptions([
      MODERN_MANIFEST_ENTRY,
      createApprovedHistoricalEntry('1914'),
      createApprovedHistoricalEntry('1492'),
      createApprovedHistoricalEntry('1700'),
      createApprovedHistoricalEntry('1815'),
    ]);
    const markup = renderToStaticMarkup(createPeriodHud(options));

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
    // The select id is byte-identical to the Phase 2 value: the e2e fixture
    // and NFR3 diagnostics query `#composition-bar-period`.
    expect(markup).toContain('id="composition-bar-period"');
  });

  it('offers Try Period Again only while a period load has failed', (): void => {
    const failedMarkup = renderToStaticMarkup(
      <PeriodHud
        periods={MODERN_ONLY_PERIODS}
        selectedPeriodId="modern"
        statusMessage="We couldn't load 1700 — Post-Westphalia Europe. The previous map period is still shown. Try again."
        isPeriodDisabled={false}
        onPeriodChange={vi.fn()}
        onRetryPeriod={vi.fn()}
      />,
    );

    expect(failedMarkup).toContain('Try Period Again');
    expect(failedMarkup).toContain('The previous map period is still shown.');
    expect(renderToStaticMarkup(createPeriodHud())).not.toContain(
      'Try Period Again',
    );
  });

  it('withholds every camera control while the world is loading, behind an inert pill', (): void => {
    /*
     * `Reset View` used to be the one control the loading state disabled,
     * because it lived in the always-rendered period HUD. `03-08` moved it into
     * the camera cluster, which the workspace renders only for a READY scene -
     * so the loading state now withholds all four camera controls outright.
     * Absent is a stronger claim than disabled: a disabled control can be
     * re-enabled by a stray prop, an absent one cannot be clicked at all.
     */
    const loadingMarkup = renderToStaticMarkup(
      <MapWorkspace
        geoData={{ status: 'loading' }}
        periodHud={createPeriodHud()}
        navigationSlot={createNavigationSlot()}
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

    ['Reset View', 'Zoom In', 'Zoom Out', 'Move Map'].forEach((name): void => {
      expect(loadingMarkup, `${name} rendered without a camera`).not.toContain(
        `aria-label="${name}"`,
      );
    });
    // The one-option surface is an inert pill, so there is nothing left in the
    // loading state to disable at all.
    expect(loadingMarkup).toContain('period-hud__pill');
    expect(loadingMarkup).not.toContain('<select');
    expect(loadingMarkup.match(/disabled=""/gu)).toBeNull();

    // The select path still honours the disabled flag when it is reachable.
    const selectMarkup = renderToStaticMarkup(
      <PeriodHud
        periods={[
          MODERN_PERIOD_OPTION,
          { id: '1700', label: '1700 — Post-Westphalia Europe' },
        ]}
        selectedPeriodId="modern"
        statusMessage="Modern borders worldwide."
        isPeriodDisabled
        onPeriodChange={vi.fn()}
      />,
    );
    expect(selectMarkup.match(/disabled=""/gu)).toHaveLength(1);
  });
});
