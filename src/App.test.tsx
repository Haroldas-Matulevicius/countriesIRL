import { readFileSync } from 'node:fs';

import type { Polygon } from 'geojson';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App, { createSelectionAnnouncement } from './App';
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

  it('overlays map navigation on the square and never inside the export source', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    expect(countOccurrences(markup, 'class="map-navigation"')).toBe(1);

    const squareIndex = markup.indexOf('class="map-workspace__square"');
    const exportSourceEnd = markup.indexOf('</svg></div>');
    const navigationIndex = markup.indexOf('class="map-navigation"');
    const squareEnd = markup.indexOf('class="workspace__selection-color"');

    // Inside the square (UI-SPEC 10) but after the export source closes: the
    // clone starts at `svg.map-canvas`, so an overlay placed after it cannot
    // reach the PNG. Moving it under MapCanvas would put chrome in the export.
    expect(navigationIndex).toBeGreaterThan(exportSourceEnd);
    expect(exportSourceEnd).toBeGreaterThan(squareIndex);
    expect(navigationIndex).toBeLessThan(squareEnd);
    // UI-SPEC 20: the compact focus order is map, then map navigation.
    expect(navigationIndex).toBeGreaterThan(
      markup.indexOf('class="map-canvas"'),
    );
  });

  it('composes the desktop global actions on the app bar, reset with the colors', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    // UI-SPEC 8: the four global actions belong to the app bar, which is why
    // the sticky bar carries more than title, subtitle, and Show Help.
    expect(countOccurrences(markup, 'controls controls--app-bar')).toBe(1);
    expect(countOccurrences(markup, 'controls--strip')).toBe(0);
    expect(countOccurrences(markup, 'workspace__actions')).toBe(0);

    const headerEnd = markup.indexOf('</header>');
    ['data-action="undo"', 'data-action="redo"', 'data-action="save-load"', 'data-action="export"'].forEach(
      (action): void => {
        expect(countOccurrences(markup, action)).toBe(1);
        expect(markup.indexOf(action)).toBeLessThan(headerEnd);
      },
    );

    // UI-SPEC 11: exactly one Reset All Colors, in the selection/color section
    // and never on the bar beside the export action.
    expect(countOccurrences(markup, 'data-action="reset-colors"')).toBe(1);
    expect(markup.indexOf('data-action="reset-colors"')).toBeGreaterThan(
      markup.indexOf('class="workspace__selection-color"'),
    );
    expect(markup.indexOf('data-action="reset-colors"')).toBeLessThan(
      markup.indexOf('class="workspace__legend"'),
    );
  });

  it('composes the compact global actions as the first workspace section', () => {
    stubWindow(false, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    // UI-SPEC 7.4/8: compact and mobile keep the strip in the workspace, and it
    // is the strip - not the app bar - that carries Reset All Colors.
    expect(countOccurrences(markup, 'controls controls--strip')).toBe(1);
    expect(countOccurrences(markup, 'controls--app-bar')).toBe(0);
    expect(countOccurrences(markup, 'data-action="reset-colors"')).toBe(1);

    const headerEnd = markup.indexOf('</header>');
    expect(markup.indexOf('data-action="export"')).toBeGreaterThan(headerEnd);
    expect(markup.indexOf('class="workspace__actions"')).toBeGreaterThan(
      headerEnd,
    );
  });

  it('renders one workspace with the desktop inspector landmark', () => {
    stubWindow(true, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    expect(countOccurrences(markup, 'workspace--desktop')).toBe(1);
    expect(countOccurrences(markup, 'workspace--compact')).toBe(0);
    expect(countOccurrences(markup, 'class="map-canvas"')).toBe(1);
    expect(countOccurrences(markup, 'aria-label="Map creator workspace"')).toBe(
      1,
    );
    expect(countOccurrences(markup, 'aria-label="Map inspector"')).toBe(1);
  });

  it('renders one workspace in the compact section order without a second map', () => {
    stubWindow(false, createMemoryStorage());
    mocks.world.current = READY_WORLD;

    const markup = renderApp();

    expect(countOccurrences(markup, 'workspace--compact')).toBe(1);
    expect(countOccurrences(markup, 'workspace--desktop')).toBe(0);
    expect(countOccurrences(markup, 'class="map-canvas"')).toBe(1);
    expect(countOccurrences(markup, 'aria-label="Map creator workspace"')).toBe(
      1,
    );
    // Compact drops the inspector shell, so the sections are direct children in
    // the documented order.
    expect(countOccurrences(markup, 'aria-label="Map inspector"')).toBe(0);

    const order = [
      'workspace__actions',
      'workspace__map',
      'workspace__selection-color',
      'workspace__country-list',
      'workspace__legend',
    ].map((className): number => markup.indexOf(className));
    expect(order.every((index): boolean => index !== -1)).toBe(true);
    expect([...order].sort((left, right): number => left - right)).toEqual(
      order,
    );
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
