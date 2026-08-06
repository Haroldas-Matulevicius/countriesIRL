import { readFileSync } from 'node:fs';

import type { Polygon } from 'geojson';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App, { createSelectionAnnouncement } from './App';
import { LAST_OPEN_TOOL_KEY } from './constants/config';
import { CompositionStateProvider } from './providers/CompositionStateProvider';
import { MapStateProvider } from './providers/MapStateProvider';
import type { WorldGeoDataState } from './hooks/useGeoData';
import type {
  CompositionExportTransactionOutcome,
  UseCompositionExportTransactionOptions,
  UseCompositionExportTransactionValue,
} from './hooks/useCompositionExportTransaction';
import type {
  CompositionLoadTransactionDependencies,
  CompositionLoadTransactionOutcome,
  UseCompositionLoadTransactionValue,
} from './hooks/useCompositionLoadTransaction';
import type {
  CompositionSaveTransactionDependencies,
  CompositionSaveTransactionOutcome,
  UseCompositionSaveTransactionValue,
} from './hooks/useCompositionSaveTransaction';
import type { GeoFeature, SceneFeature } from './types/map';

const APP_SOURCE_URL = new URL('./App.tsx', import.meta.url);

const mocks = vi.hoisted(() => ({
  world: { current: { status: 'loading' } as WorldGeoDataState },
  saveDependencies: [] as CompositionSaveTransactionDependencies[],
  loadDependencies: [] as CompositionLoadTransactionDependencies[],
  exportOptions: [] as UseCompositionExportTransactionOptions[],
}));

vi.mock('./hooks/useGeoData', () => ({
  useGeoData: (): WorldGeoDataState => mocks.world.current,
}));

// The three transactions are mocked so the assertions below are about App's
// wiring only: which dependencies it hands down, and that a single handle
// accessor - not three private ones - is what every transaction reads.
vi.mock('./hooks/useCompositionSaveTransaction', () => ({
  useCompositionSaveTransaction: (
    dependencies: CompositionSaveTransactionDependencies,
  ): UseCompositionSaveTransactionValue => {
    mocks.saveDependencies.push(dependencies);
    return {
      state: { status: 'idle' },
      save: (): CompositionSaveTransactionOutcome => ({
        ok: false,
        reason: 'map-canvas-unavailable',
      }),
    };
  },
}));

vi.mock('./hooks/useCompositionLoadTransaction', () => ({
  useCompositionLoadTransaction: (
    dependencies: CompositionLoadTransactionDependencies,
  ): UseCompositionLoadTransactionValue => {
    mocks.loadDependencies.push(dependencies);
    return {
      state: { status: 'idle' },
      load: (): Promise<CompositionLoadTransactionOutcome> =>
        Promise.resolve({
          ok: false,
          reason: 'map-canvas-unavailable',
          storageWarnings: [],
        }),
      cancel: (): void => undefined,
    };
  },
}));

vi.mock('./hooks/useCompositionExportTransaction', () => ({
  useCompositionExportTransaction: (
    options: UseCompositionExportTransactionOptions,
  ): UseCompositionExportTransactionValue => {
    mocks.exportOptions.push(options);
    return {
      isExporting: false,
      exportPng: (): Promise<CompositionExportTransactionOutcome> =>
        Promise.resolve({ ok: false, reason: 'already-active' }),
    };
  },
}));

function createBlockedStorage(): Storage {
  return {
    length: 0,
    clear: vi.fn(),
    getItem: (): never => {
      throw new DOMException('blocked', 'SecurityError');
    },
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: (): never => {
      throw new DOMException('blocked', 'SecurityError');
    },
  };
}

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length(): number {
      return entries.size;
    },
    clear: (): void => entries.clear(),
    getItem: (key: string): string | null => entries.get(key) ?? null,
    key: (index: number): string | null => [...entries.keys()][index] ?? null,
    removeItem: (key: string): void => {
      entries.delete(key);
    },
    setItem: (key: string, value: string): void => {
      entries.set(key, value);
    },
  };
}

function createCountry(id: string, name: string): GeoFeature {
  return {
    type: 'Feature',
    id,
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
  };
}

function createSceneFeature(
  id: string,
  name: string,
  longitude: number,
): SceneFeature {
  return {
    type: 'Feature',
    id,
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [longitude, 40],
          [longitude + 6, 40],
          [longitude + 6, 50],
          [longitude, 50],
          [longitude, 40],
        ],
      ] as Polygon['coordinates'],
    },
    sourceFeatureId: `${id}-unit`,
    entityId: id,
    boundaryMode: 'modern',
    provenanceId: `test:${id}`,
    interactionMode: 'modern-core',
    colorOwnerId: id,
    isSelectable: true,
  };
}

const FRANCE_SCENE = createSceneFeature('FRA', 'France', -5);
const GERMANY_SCENE = createSceneFeature('DEU', 'Germany', 6);
const SCENE_FEATURES: ReadonlyArray<SceneFeature> = [
  FRANCE_SCENE,
  GERMANY_SCENE,
];
const SCENE_LOOKUP = new Map<string, SceneFeature>([
  ['FRA', FRANCE_SCENE],
  ['DEU', GERMANY_SCENE],
]);
const READY_WORLD: WorldGeoDataState = {
  status: 'ready',
  features: SCENE_FEATURES,
  coreFeatures: SCENE_FEATURES,
  lookup: SCENE_LOOKUP,
  coreLookup: SCENE_LOOKUP,
  entityLookup: SCENE_LOOKUP,
  countryMetadata: [
    { id: 'FRA', name: 'France' },
    { id: 'DEU', name: 'Germany' },
  ],
  warnings: [],
};

function createMediaQueryList(isDesktop: boolean): MediaQueryList {
  return {
    matches: isDesktop,
    media: '(min-width: 1200px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
}

function stubWindow(isDesktop: boolean, storage: Storage): void {
  vi.stubGlobal('window', {
    localStorage: storage,
    matchMedia: vi.fn(() => createMediaQueryList(isDesktop)),
    location: { reload: vi.fn() },
    /*
      The rail's vendored icons are `motion/react` components, and framer's
      projection node attaches a resize listener to `window` as it mounts. A
      partial stub without these two throws inside the renderer, which would
      look like a defect in App rather than a gap in the stub.
    */
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function renderApp(): string {
  return renderToStaticMarkup(
    <MapStateProvider>
      <CompositionStateProvider>
        <App />
      </CompositionStateProvider>
    </MapStateProvider>,
  );
}

function countOccurrences(markup: string, needle: string): number {
  let count = 0;
  let index = markup.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = markup.indexOf(needle, index + needle.length);
  }
  return count;
}

beforeEach(() => {
  mocks.world.current = { status: 'loading' };
  mocks.saveDependencies.length = 0;
  mocks.loadDependencies.length = 0;
  mocks.exportOptions.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('selection announcements', () => {
  const countryLookup = new Map([
    ['FR', createCountry('FR', 'France')],
    ['DE', createCountry('DE', 'Germany')],
  ]);

  it('announces clear, single-country, and bulk selection changes', () => {
    expect(createSelectionAnnouncement(new Set(), countryLookup)).toBe(
      'No countries selected.',
    );
    expect(createSelectionAnnouncement(new Set(['FR']), countryLookup)).toBe(
      'France. 1 country selected.',
    );
    expect(
      createSelectionAnnouncement(new Set(['FR', 'DE']), countryLookup),
    ).toBe('2 countries selected.');
  });
});

describe('App startup storage feedback', () => {
  it('keeps the selection live region mounted before any selection exists', () => {
    stubWindow(false, createBlockedStorage());

    const markup = renderApp();

    expect(markup).toContain('data-selection-live-region="true"');
    expect(markup).toContain(
      'data-selection-live-region="true" role="status" aria-live="polite" aria-atomic="true"',
    );
  });

  it('renders an accessible error when the initial storage read is blocked', () => {
    stubWindow(false, createBlockedStorage());

    const markup = renderApp();

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-severity="error"');
    expect(markup).toContain(
      'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
    );
  });
});

describe('App composition root', () => {
  it('gives save, load, and export the one handle accessor it owns', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    renderApp();

    const saveDependencies = mocks.saveDependencies.at(-1);
    const loadDependencies = mocks.loadDependencies.at(-1);
    const exportOptions = mocks.exportOptions.at(-1);
    expect(saveDependencies).toBeDefined();
    expect(loadDependencies).toBeDefined();
    expect(exportOptions).toBeDefined();

    // Identity, not shape: three separate accessors would mean three private
    // handles, and a responsive remount could leave one of them stale while the
    // other two moved on.
    expect(loadDependencies?.getMapCanvasHandle).toBe(
      saveDependencies?.getMapCanvasHandle,
    );
    expect(exportOptions?.getMapCanvasHandle).toBe(
      saveDependencies?.getMapCanvasHandle,
    );
    // No canvas has bound yet in a static render, so the accessor reports the
    // absence instead of inventing a controller.
    expect(saveDependencies?.getMapCanvasHandle()).toBeNull();
  });

  it('delegates transaction ordering instead of implementing it', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    renderApp();

    const saveDependencies = mocks.saveDependencies.at(-1);
    const loadDependencies = mocks.loadDependencies.at(-1);
    const exportOptions = mocks.exportOptions.at(-1);

    expect(typeof saveDependencies?.getColors).toBe('function');
    expect(typeof saveDependencies?.getComposition).toBe('function');
    expect(typeof saveDependencies?.saveComposition).toBe('function');
    expect(typeof saveDependencies?.markSaved).toBe('function');

    expect(typeof loadDependencies?.captureRollbackState).toBe('function');
    expect(typeof loadDependencies?.rollback).toBe('function');
    expect(typeof loadDependencies?.resolveScene).toBe('function');
    expect(typeof loadDependencies?.requestFocus).toBe('function');

    expect(typeof exportOptions?.getLegendBlocker).toBe('function');
    expect(typeof exportOptions?.getCompositionName).toBe('function');
    expect(typeof exportOptions?.commitCamera).toBe('function');
    // The name is composition identity: it is unset until a save or load
    // commits one, and the exporter is never its source of truth.
    expect(exportOptions?.getCompositionName?.()).toBeUndefined();
    expect(exportOptions?.getLegendBlocker()).toBeNull();
  });

  it('renders the legend inside the one canonical map SVG, after the camera layer', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    expect(countOccurrences(markup, 'class="map-canvas"')).toBe(1);
    expect(countOccurrences(markup, 'data-layer="legend"')).toBe(1);

    const svgStart = markup.indexOf('class="map-canvas"');
    const svgEnd = markup.indexOf('</svg>', svgStart);
    const cameraIndex = markup.indexOf('data-layer="camera"');
    const legendIndex = markup.indexOf('data-layer="legend"');

    expect(svgEnd).toBeGreaterThan(svgStart);
    // A legend rendered as a sibling of the canonical SVG is silently dropped
    // by the export clone, and the structural gate still passes because neither
    // side then contains a legend. Containment is the assertion that catches it.
    expect(legendIndex).toBeGreaterThan(cameraIndex);
    expect(legendIndex).toBeLessThan(svgEnd);
    expect(cameraIndex).toBeGreaterThan(svgStart);
  });

  it('places map navigation after the square and never inside the export source', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    expect(countOccurrences(markup, 'class="map-navigation"')).toBe(1);

    const squareIndex = markup.indexOf('class="map-workspace__canvas"');
    const exportSourceEnd = markup.indexOf('</svg></div>');
    const navigationIndex = markup.indexOf('class="map-navigation"');
    // The canvas region closes the map workspace section, so the cluster has
    // to land before that - inside the region, outside the export source.
    const squareEnd = markup.indexOf('</section>', squareIndex);

    /*
     * After the export source closes: the clone starts at `svg.map-canvas`, so
     * chrome placed after it cannot reach the PNG. Moving it under MapCanvas
     * would put chrome in every export.
     *
     * It is no longer *inside* the square either. As a top-left overlay it sat
     * on top of a `top-left` legend - the default legend position - and that
     * collision has no fix on the legend side: the cluster is sized in screen
     * pixels while the legend is placed in 1080-unit canvas space, so no fixed
     * rectangle in the export's coordinate system can reserve room for it.
     */
    expect(navigationIndex).toBeGreaterThan(exportSourceEnd);
    expect(exportSourceEnd).toBeGreaterThan(squareIndex);
    expect(navigationIndex).toBeLessThan(squareEnd);
    // UI-SPEC 20: the compact focus order is map, then map navigation.
    expect(navigationIndex).toBeGreaterThan(
      markup.indexOf('class="map-canvas"'),
    );
  });

  it('mounts exactly one Controls, and it is the rail footer carrying the only fill', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * UI-SPEC 3: `Controls` is one component with a declared variant and
     * exactly one instance is mounted. That is the mechanism, not a
     * convention - `controls__action--primary` exists in one component, so
     * "exactly one filled action in the composed DOM" holds by construction.
     * `app-bar` and `strip` stay declared for `03-09`; neither is mounted.
     */
    expect(countOccurrences(markup, 'controls controls--rail')).toBe(1);
    expect(countOccurrences(markup, 'controls--app-bar')).toBe(0);
    expect(countOccurrences(markup, 'controls--strip')).toBe(0);
    expect(countOccurrences(markup, 'controls__action--primary')).toBe(1);
    expect(countOccurrences(markup, 'data-action="export"')).toBe(1);

    const footerIndex = markup.indexOf('class="tool-rail__footer"');
    expect(footerIndex).toBeGreaterThan(-1);
    expect(markup.indexOf('data-action="export"')).toBeGreaterThan(footerIndex);

    // Undo and Redo are rail rows now, not Controls actions: the labels are
    // unchanged because the e2e locators and the toast allowlist key on them.
    expect(countOccurrences(markup, 'data-action="undo"')).toBe(0);
    expect(countOccurrences(markup, 'data-action="redo"')).toBe(0);
    expect(countOccurrences(markup, 'aria-label="Undo Color Change"')).toBe(1);
    expect(countOccurrences(markup, 'aria-label="Redo Color Change"')).toBe(1);
  });

  it('gives every tool a rail row with a stable id, and the pair no aria-expanded', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * Assertion 16's subject: the rows differ only by order until they carry a
     * `data-tool`, so the inventory is asserted as an ordered, enumerated list
     * rather than as a count.
     */
    expect(
      [...markup.matchAll(/data-tool="([a-z]+)"/gu)].map(
        (match): string => match[1],
      ),
    ).toEqual(['colors', 'countries', 'legend', 'saved', 'undo', 'redo']);

    // Four tools point at the one panel; the two pinned rows expand nothing,
    // so they carry no `aria-expanded` at all rather than a permanent `false`.
    const rowTag = (tool: string): string =>
      new RegExp(`<button[^>]*data-tool="${tool}"[^>]*>`, 'u').exec(
        markup,
      )?.[0] ?? '';

    ['colors', 'countries', 'legend', 'saved'].forEach((tool): void => {
      expect(rowTag(tool)).toContain('aria-controls="map-editor-tool-panel"');
      expect(rowTag(tool)).toContain('aria-expanded="false"');
    });
    ['undo', 'redo'].forEach((tool): void => {
      expect(rowTag(tool)).not.toContain('aria-expanded');
      expect(rowTag(tool)).not.toContain('aria-controls');
    });
    expect(
      countOccurrences(markup, 'aria-controls="map-editor-tool-panel"'),
    ).toBe(4);
  });

  it('opens the first run closed and still mounts the workspace landmark', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * D-18: closed on a first run - a full-bleed world map plus a quiet icon
     * strip. The landmark is asserted alongside it because the panel BODY is
     * what unmounts; a landmark that disappeared with the open tool would be
     * one a screen-reader user could not rely on.
     */
    expect(countOccurrences(markup, 'data-panel-open="false"')).toBe(1);
    expect(countOccurrences(markup, 'data-panel-open="true"')).toBe(0);
    expect(countOccurrences(markup, 'class="tool-panel__body"')).toBe(0);
    expect(countOccurrences(markup, 'aria-label="Map creator workspace"')).toBe(
      1,
    );
    expect(countOccurrences(markup, 'aria-label="Map inspector"')).toBe(0);

    // No tool is open, so none of the tool contents is in the document.
    expect(countOccurrences(markup, 'workspace__selection-color')).toBe(0);
    expect(countOccurrences(markup, 'data-action="reset-colors"')).toBe(0);
  });

  it('keeps the layout hook on the landmark and the shell order rail, panel, canvas', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const desktop = renderApp();

    expect(countOccurrences(desktop, 'workspace--desktop')).toBe(1);
    expect(countOccurrences(desktop, 'workspace--compact')).toBe(0);
    expect(countOccurrences(desktop, 'class="map-canvas"')).toBe(1);

    expect(desktop.indexOf('class="tool-rail"')).toBeLessThan(
      desktop.indexOf('class="tool-panel workspace--desktop"'),
    );
    expect(desktop.indexOf('class="map-workspace"')).toBeGreaterThan(
      desktop.indexOf('class="tool-panel workspace--desktop"'),
    );

    stubWindow(false, createMemoryStorage());
    const compact = renderApp();

    expect(countOccurrences(compact, 'workspace--compact')).toBe(1);
    expect(countOccurrences(compact, 'workspace--desktop')).toBe(0);
    expect(countOccurrences(compact, 'class="map-canvas"')).toBe(1);
  });

  it('renders the onboarding card and Show Help in the canvas region', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * UI-SPEC 10, and the reason it cannot stay in the panel: D-18 opens the
     * first run CLOSED, so onboarding parked in the panel body would be hidden
     * behind a panel the creator has not opened yet.
     */
    const canvasIndex = markup.indexOf('class="map-workspace"');
    const helpIndex = markup.indexOf('class="editor-help"');
    const exportSourceEnd =
      markup.indexOf('</svg>', markup.indexOf('class="map-export-source"')) +
      '</svg>'.length;

    expect(canvasIndex).toBeGreaterThan(-1);
    expect(helpIndex).toBeGreaterThan(canvasIndex);
    expect(helpIndex).toBeGreaterThan(exportSourceEnd);
    expect(countOccurrences(markup, 'id="onboarding-help"')).toBe(1);
    expect(countOccurrences(markup, 'class="panel-header"')).toBe(0);
    // The document keeps exactly one h1; it moved into the HUD header.
    expect(countOccurrences(markup, '<h1')).toBe(1);
    expect(markup.indexOf('<h1')).toBeGreaterThan(
      markup.indexOf('class="tool-rail__header"'),
    );
  });

  it('puts a neutral theme toggle in the footer that names its destination', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * D-30. The accessible name states the DESTINATION - "dark theme" on the
     * control that switches TO dark reads, to a screen-reader user, as a label
     * for where they already are - and `aria-pressed` carries the current mode.
     */
    const toggle =
      /<button[^>]*data-theme-toggle="true"[^>]*>/u.exec(markup)?.[0] ?? '';

    expect(toggle).toContain('aria-label="Switch to dark theme"');
    expect(toggle).toContain('aria-pressed="false"');
    expect(markup).not.toContain('Switch to light theme');

    // D-05: the rail's ONE Apple Blue surface is Export. The toggle is neutral,
    // so it must not carry the primary role class.
    const toggleIndex = markup.indexOf('data-theme-toggle="true"');
    const footerIndex = markup.indexOf('class="tool-rail__footer"');
    expect(toggleIndex).toBeGreaterThan(footerIndex);
    expect(markup.match(/controls__action--primary/gu)).toHaveLength(1);
    expect(
      /<button[^>]*data-theme-toggle="true"[^>]*controls__action--primary/u.test(
        markup,
      ),
    ).toBe(false);
  });

  it('seeds the mount root class from the boundary prop, never from the OS', () => {
    /*
     * The theme is state now, and its INITIAL value comes from the props
     * boundary. Asserted as a source scan as well as a render, because the
     * defect this forbids - `matchMedia('(prefers-color-scheme: dark)')` - is
     * one line and would read as a helpful default.
     */
    const source = readFileSync(APP_SOURCE_URL, 'utf8');

    expect(source).toContain('useState<EditorThemeMode>(initialThemeMode)');
    expect(source).not.toContain('prefers-color-scheme');
    expect(source).not.toContain('documentElement');

    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;
    const markup = renderApp();

    expect(markup).toContain('class="map-editor"');
    expect(markup).not.toContain('map-editor dark');
  });

  it('keeps Reset View, Reset All Colors, and the filled action singletons across every panel (assertion 15)', () => {
    /*
     * The completion of assertion 15, after the last panel migrated: exactly
     * one `Reset View` (camera reset, canvas region), exactly one
     * `Reset All Colors` (content reset, Colors panel - and NOWHERE else),
     * and exactly one filled primary action, keyed on its role class rather
     * than its container - in EVERY panel state, not only the default one.
     */
    (['colors', 'countries', 'legend', 'saved'] as const).forEach((tool) => {
      const storage = createMemoryStorage();
      storage.setItem(LAST_OPEN_TOOL_KEY, tool);
      stubWindow(true, storage);
      mocks.world.current = READY_WORLD;

      const markup = renderApp();

      expect(
        countOccurrences(markup, `data-tool-panel="${tool}"`),
        `${tool}: its panel body did not open from the stored preference`,
      ).toBe(1);
      expect(markup.match(/Reset View/gu), `${tool}: Reset View`).toHaveLength(
        1,
      );
      expect(
        countOccurrences(markup, 'data-action="reset-colors"'),
        `${tool}: Reset All Colors exists exactly once, in the Colors panel`,
      ).toBe(tool === 'colors' ? 1 : 0);
      expect(
        countOccurrences(markup, 'controls__action--primary'),
        `${tool}: the one filled action`,
      ).toBe(1);

      // The two resets never sit together: content reset lives in the panel
      // track, camera reset in the canvas region after it.
      if (tool === 'colors') {
        expect(markup.indexOf('data-action="reset-colors"')).toBeLessThan(
          markup.indexOf('class="map-workspace"'),
        );
      }
    });
  });

  it('renders the period surface from resolved options only, scoped to the period HUD (assertion 13)', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    /*
     * Scoped to `.period-hud`: `SNAPSHOT_CATALOG` legitimately holds five
     * labels elsewhere in the module graph, so an unscoped absence assertion
     * would be asserting something false. The HUD is the surface that must
     * never name a deferred snapshot (Immutable Safety Constraint 3).
     */
    const hudStart = markup.indexOf('class="period-hud"');
    const hudEnd = markup.indexOf('map-workspace__canvas');
    expect(hudStart).toBeGreaterThan(-1);
    expect(hudEnd).toBeGreaterThan(hudStart);
    const hud = markup.slice(hudStart, hudEnd);

    // A static render runs no effects, so the catalog fetch never fires and
    // the resolved options are the Modern-only fallback - exactly one entry.
    expect(hud).toContain('Modern — current borders');
    [
      '1492 — Early modern Europe',
      '1700 — Post-Westphalia Europe',
      '1815 — Congress of Vienna',
      '1914 — Before World War I',
    ].forEach((deferredLabel): void => {
      expect(hud).not.toContain(deferredLabel);
    });

    // D-14: one resolved option is an inert read-only pill, not a disabled
    // select - no dropdown affordance, no chevron, no deferred-feature copy.
    expect(hud).not.toContain('<select');
    expect(hud).not.toContain('Coming soon');
    expect(hud).toContain('period-hud__pill');
  });

  it('keeps the rehomed period live region resolvable from the control (assertion 14)', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    // The exact live-region markup string, mirroring the selection-region
    // idiom above: byte-identical id, role, and politeness (D-15).
    expect(markup).toContain(
      'id="composition-bar-period-status" role="status" aria-live="polite"',
    );

    /*
     * The load-bearing half: the id named by `aria-describedby` must resolve
     * to an element that EXISTS. The markup-string half alone would stay green
     * against a described-by attribute that points at nothing - which is
     * exactly what dropping the region during a rail migration produces, with
     * no visual signal at all.
     */
    const describedByIds = [
      ...markup.matchAll(/aria-describedby="([^"]+)"/gu),
    ].flatMap((match): string[] => (match[1] ?? '').split(' '));
    expect(describedByIds).toContain('composition-bar-period-status');
    describedByIds.forEach((id): void => {
      expect(
        markup.includes(`id="${id}"`),
        `aria-describedby names "${id}", which resolves to no element.`,
      ).toBe(true);
    });
  });

  it('never constructs a camera controller of its own', () => {
    // Structural, because the defect is an import: a second controller would
    // paint a second camera and the visible SVG would stop following the
    // handle every callback in App is derived from.
    const source = readFileSync(APP_SOURCE_URL, 'utf8');

    expect(source).not.toContain('useCameraController');
    expect(source).not.toContain('createCameraController');
  });
});
