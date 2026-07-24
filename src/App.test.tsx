import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App, { createSelectionAnnouncement } from './App';
import { CompositionStateProvider } from './providers/CompositionStateProvider';
import { MapStateProvider } from './providers/MapStateProvider';
import type { GeoFeature } from './types/map';

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

function createMediaQueryList(): MediaQueryList {
  return {
    matches: false,
    media: '(min-width: 1200px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
}

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
    vi.stubGlobal('window', {
      localStorage: createBlockedStorage(),
      matchMedia: vi.fn(() => createMediaQueryList()),
      location: { reload: vi.fn() },
    });

    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <CompositionStateProvider>
          <App />
        </CompositionStateProvider>
      </MapStateProvider>,
    );

    expect(markup).toContain('data-selection-live-region="true"');
    expect(markup).toContain(
      'data-selection-live-region="true" role="status" aria-live="polite" aria-atomic="true"',
    );
  });

  it('renders an accessible error when the initial storage read is blocked', () => {
    vi.stubGlobal('window', {
      localStorage: createBlockedStorage(),
      matchMedia: vi.fn(() => createMediaQueryList()),
      location: { reload: vi.fn() },
    });

    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <CompositionStateProvider>
          <App />
        </CompositionStateProvider>
      </MapStateProvider>,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-severity="error"');
    expect(markup).toContain(
      'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
    );
  });
});
