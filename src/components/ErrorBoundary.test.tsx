import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

/**
 * Stands in for the real boundary so a static render can prove the wiring:
 * it renders the fallback *and* the children, so the assertions can show both
 * that a boundary is present at the right place and that its fallback is
 * `FatalErrorState` rather than a blank page.
 */
function MarkerBoundary({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div data-error-boundary="true">
      {fallback}
      {children}
    </div>
  );
}

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

// `html2canvas` touches `window.document.createElement` at module-evaluation
// time, and these tests import `App` dynamically (after the stubs are in
// place) so the boundary module can be mocked first.
function createStubDocument(): Document {
  return {
    getElementById: (): Record<string, never> => ({}),
    createElement: (): Record<string, unknown> => ({
      setAttribute: (): void => undefined,
      style: {},
    }),
  } as unknown as Document;
}

function stubBrowserGlobals(): void {
  vi.stubGlobal('window', {
    // framer-motion's projection node attaches a resize listener to `window`.
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    document: createStubDocument(),
    localStorage: createBlockedStorage(),
    matchMedia: vi.fn(() => ({
      matches: false,
      media: '(min-width: 1200px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
    location: { reload: vi.fn() },
  });
}

afterEach((): void => {
  vi.doUnmock('./ErrorBoundary');
  vi.doUnmock('react-dom/client');
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('ErrorBoundary', (): void => {
  it('reports the failure instead of silently blanking the page', (): void => {
    const consoleError = vi
      .spyOn(globalThis.console, 'error')
      .mockImplementation((): void => undefined);
    const boundary = new ErrorBoundary({
      fallback: null,
      children: null,
    });

    boundary.componentDidCatch(new Error('duplicate-scene-feature-id'), {
      componentStack: '\n    in MapCanvas',
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]?.[0]).toBe(
      'CountriesIRL could not render the map workspace.',
    );
    consoleError.mockRestore();
  });

  it('renders children untouched so it can sit inside the workspace grid', (): void => {
    expect(
      renderToStaticMarkup(
        <ErrorBoundary fallback={<p>fallback</p>}>
          <p>workspace</p>
        </ErrorBoundary>,
      ),
    ).toBe('<p>workspace</p>');
  });
});

/**
 * Two boundaries are required and neither is redundant: `composeEffectiveScene`
 * throws inside *App's own* `useMemo`, and a boundary rendered by App cannot
 * catch App's own render throw, so only the `main.tsx` boundary can degrade
 * that to `FatalErrorState`. `MapCanvas`'s `createWrappedSceneModel` /
 * `getSelectableSceneFeatures` throws are in a descendant of App's boundary.
 *
 * These tests assert the wiring - deleting either `<ErrorBoundary>` used to
 * leave the whole suite green while restoring the blank-page failure. React's
 * actual catch path is exercised in a real browser by the
 * `phase2-composition` E2E, which serves a duplicate-identity world asset;
 * error boundaries are not invoked by `react-dom/server`, so it cannot be
 * exercised in this (DOM-less) unit environment.
 */
describe('fatal error boundary wiring', (): void => {
  it('App wraps the workspace sections in a boundary that renders FatalErrorState', async (): Promise<void> => {
    vi.resetModules();
    vi.doMock('./ErrorBoundary', () => ({ ErrorBoundary: MarkerBoundary }));
    stubBrowserGlobals();

    const { default: App } = await import('../App');
    const { MapStateProvider } = await import('../providers/MapStateProvider');
    const { CompositionStateProvider } = await import(
      '../providers/CompositionStateProvider'
    );

    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <CompositionStateProvider>
          <App />
        </CompositionStateProvider>
      </MapStateProvider>,
    );
    const boundaryIndex = markup.indexOf('data-error-boundary="true"');

    expect(boundaryIndex).toBeGreaterThan(-1);
    expect(markup).toContain('We couldn&#x27;t load the world map');
    expect(markup).toContain('>Reload Map<');
    /*
     * `03-06` moved the boundary OUTSIDE the workspace landmark, because the
     * landmark is now the panel track itself and the tool content inside it is
     * unmounted whenever the panel is closed (D-18 opens a first run closed).
     * A boundary that only exists while a tool is open would have left the
     * assertion below trivially satisfiable by rendering nothing at all - the
     * vacuous-pass shape this repo keeps catching - so the boundary wraps the
     * whole panel and both indices below are real positions.
     */
    const panelIndex = markup.indexOf('class="tool-panel workspace--compact"');
    expect(panelIndex).toBeGreaterThan(boundaryIndex);
    expect(markup.indexOf('aria-label="Map creator workspace"')).toBeGreaterThan(
      panelIndex,
    );

    /*
     * D-11 moved the canvas region out of the workspace landmark and into the
     * shell's third grid track, so the boundary that used to cover it by
     * covering the section list no longer reaches it. A second boundary wraps
     * it there. Without this assertion the map could lose its boundary while
     * the one above stayed green - the exact silent regression these two tests
     * exist to catch.
     */
    const canvasBoundaryIndex = markup.lastIndexOf('data-error-boundary="true"');
    expect(canvasBoundaryIndex).toBeGreaterThan(boundaryIndex);
    expect(markup.indexOf('class="map-workspace"')).toBeGreaterThan(
      canvasBoundaryIndex,
    );
  });

  it('main.tsx wraps the whole provider tree in a boundary that renders FatalErrorState', async (): Promise<void> => {
    vi.resetModules();
    const renderedTrees: ReactNode[] = [];
    vi.doMock('./ErrorBoundary', () => ({ ErrorBoundary: MarkerBoundary }));
    vi.doMock('react-dom/client', () => ({
      createRoot: (): { render: (element: ReactNode) => void } => ({
        render: (element: ReactNode): void => {
          renderedTrees.push(element);
        },
      }),
    }));
    stubBrowserGlobals();
    vi.stubGlobal('document', createStubDocument());

    await import('../main');

    expect(renderedTrees).toHaveLength(1);
    const markup = renderToStaticMarkup(<>{renderedTrees[0]}</>);
    const boundaryIndex = markup.indexOf('data-error-boundary="true"');

    // The outermost boundary is the only one that can catch a throw from App's
    // own render (`composeEffectiveScene`), so it must be the root element.
    expect(markup.startsWith('<div data-error-boundary="true">')).toBe(true);
    expect(boundaryIndex).toBeGreaterThan(-1);
    expect(markup).toContain('We couldn&#x27;t load the world map');
    expect(markup).toContain('>Reload Map<');
    expect(markup.indexOf('data-selection-live-region="true"')).toBeGreaterThan(
      boundaryIndex,
    );
  });
});
