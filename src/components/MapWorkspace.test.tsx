import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MapWorkspace } from './MapWorkspace';

describe('MapWorkspace loading state', (): void => {
  it('renders a recognizable static map skeleton instead of generic bars', (): void => {
    const markup = renderToStaticMarkup(
      <MapWorkspace
        geoData={{ status: 'loading' }}
        features={null}
        colors={{}}
        selectedIds={new Set()}
        exportSourceRef={{ current: null }}
        onSelectCountry={vi.fn()}
        onClearSelection={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(markup).toContain('Loading Europe map…');
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
        geoData={{
          status: 'ready',
          features: [],
          coreFeatures: [],
          lookup: new Map(),
          coreLookup: new Map(),
          entityLookup: new Map(),
          countryMetadata: [],
          warnings: [],
        }}
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
});
