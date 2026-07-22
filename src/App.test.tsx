import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { MapStateProvider } from './providers/MapStateProvider';

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

describe('App startup storage feedback', () => {
  it('renders an accessible error when the initial storage read is blocked', () => {
    vi.stubGlobal('window', {
      localStorage: createBlockedStorage(),
      matchMedia: vi.fn(() => createMediaQueryList()),
      location: { reload: vi.fn() },
    });

    const markup = renderToStaticMarkup(
      <MapStateProvider>
        <App />
      </MapStateProvider>,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-severity="error"');
    expect(markup).toContain(
      'This browser blocked local saves. You can keep editing and export a PNG, but maps cannot be saved here.',
    );
  });
});
